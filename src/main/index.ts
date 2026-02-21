import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const RAW_EXTENSIONS = new Set([
  ".cr2",
  ".cr3",
  ".nef",
  ".arw",
  ".dng",
  ".rw2",
  ".orf",
  ".raf",
  ".sr2",
  ".pef",
]);

function getCurrentFolder(): string {
  return process.cwd();
}

async function listHdrFilesInFolder(folder: string) {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .filter((entry) =>
      RAW_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => path.join(folder, entry.name))
    .sort((a, b) => a.localeCompare(b));

  return {
    folder,
    files,
  };
}

async function listHdrFiles() {
  return listHdrFilesInFolder(getCurrentFolder());
}

async function pickFolderAndListHdrFiles(window: BrowserWindow) {
  const result = await dialog.showOpenDialog(window, {
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const folder = result.filePaths[0];
  return listHdrFilesInFolder(folder);
}

async function pickHdrFiles(window: BrowserWindow) {
  const result = await dialog.showOpenDialog(window, {
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "RAW images",
        extensions: [...RAW_EXTENSIONS].map((value) => value.slice(1)),
      },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const files = [...result.filePaths].sort((a, b) => a.localeCompare(b));
  const folder = path.dirname(files[0]);
  return {
    folder,
    files,
  };
}

async function readHdrFile(fileName: string): Promise<Uint8Array> {
  const absolutePath = path.isAbsolute(fileName)
    ? fileName
    : path.join(getCurrentFolder(), path.basename(fileName));
  const fileBuffer = await fs.readFile(absolutePath);
  return new Uint8Array(fileBuffer);
}

type PythonMergeResult = {
  outputPath: string;
  previewPath?: string;
  width: number;
  height: number;
};

type MergeOptions = {
  colorSpace?: "srgb" | "adobe" | "wide" | "prophoto" | "xyz" | "raw";
  baseFrame?: "middle" | "darkest" | "brightest";
};

type SuggestedSet = {
  id: string;
  label: string;
  count: number;
  confidence: "high" | "medium" | "low";
  score: number;
  files: string[];
};

type SuggestOptions = {
  maxGapSeconds?: number;
};

function getPythonExecutable(): string {
  if (process.env.HDR_MERGE_PYTHON) {
    return process.env.HDR_MERGE_PYTHON;
  }

  const workspaceVenvPython = path.join(
    app.getAppPath(),
    ".venv",
    "bin",
    "python",
  );
  if (existsSync(workspaceVenvPython)) {
    return workspaceVenvPython;
  }

  return "python3";
}

function getMergeScriptPath(): string {
  return path.join(app.getAppPath(), "python", "merge_raw_to_hdr.py");
}

function getThumbnailScriptPath(): string {
  return path.join(app.getAppPath(), "python", "raw_thumbnail.py");
}

function getSuggestScriptPath(): string {
  return path.join(app.getAppPath(), "python", "suggest_hdr_sets.py");
}

async function generateRawThumbnail(filePath: string): Promise<Uint8Array> {
  const pythonExecutable = getPythonExecutable();
  const scriptPath = getThumbnailScriptPath();

  return new Promise<Uint8Array>((resolve, reject) => {
    const child = spawn(
      pythonExecutable,
      [scriptPath, filePath, "--max-size", "80"],
      {
        cwd: app.getAppPath(),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const chunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start thumbnail process: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const details = stderr.trim() || `exit code ${code}`;
        reject(new Error(`Thumbnail generation failed: ${details}`));
        return;
      }

      const output = Buffer.concat(chunks);
      resolve(new Uint8Array(output));
    });
  });
}

async function suggestHdrSets(
  filePaths: string[],
  options?: SuggestOptions,
): Promise<SuggestedSet[]> {
  const pythonExecutable = getPythonExecutable();
  const scriptPath = getSuggestScriptPath();
  const maxGapSeconds = Math.max(1, options?.maxGapSeconds ?? 30);

  return new Promise<SuggestedSet[]>((resolve, reject) => {
    const child = spawn(
      pythonExecutable,
      [scriptPath, "--max-gap", String(maxGapSeconds), ...filePaths],
      {
        cwd: app.getAppPath(),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start suggest process: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const details = stderr.trim() || `exit code ${code}`;
        reject(new Error(`Set suggestion failed: ${details}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as { sets?: SuggestedSet[] };
        resolve(parsed.sets ?? []);
      } catch {
        reject(
          new Error("Set suggestion completed but returned invalid output."),
        );
      }
    });
  });
}

async function mergeRawImagesToHdr(
  filePaths: string[],
  options?: MergeOptions,
): Promise<PythonMergeResult> {
  if (filePaths.length === 0) {
    throw new Error("Select at least one RAW image.");
  }

  const outputFolder = path.dirname(filePaths[0]);
  const timestamp = Date.now();
  const outputPath = path.join(outputFolder, `merged-${timestamp}.exr`);
  const previewPath = path.join(
    outputFolder,
    `merged-${timestamp}-preview.png`,
  );
  const pythonExecutable = getPythonExecutable();
  const scriptPath = getMergeScriptPath();

  return new Promise<PythonMergeResult>((resolve, reject) => {
    const args = [
      scriptPath,
      "--output",
      outputPath,
      "--preview",
      previewPath,
      "--color-space",
      options?.colorSpace ?? "srgb",
      "--base-frame",
      options?.baseFrame ?? "middle",
      ...filePaths,
    ];
    const child = spawn(pythonExecutable, args, {
      cwd: app.getAppPath(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const details = stderr.trim() || stdout.trim() || `exit code ${code}`;
        reject(new Error(`RAW merge failed: ${details}`));
        return;
      }

      try {
        const lines = stdout
          .trim()
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        const lastLine = lines[lines.length - 1];
        const parsed = JSON.parse(lastLine) as PythonMergeResult;
        resolve(parsed);
      } catch {
        reject(new Error("RAW merge completed but returned invalid output."));
      }
    });
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("hdr:pickFolder", async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return null;
    }
    return pickFolderAndListHdrFiles(window);
  });

  ipcMain.handle("hdr:pickFiles", async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return null;
    }
    return pickHdrFiles(window);
  });

  ipcMain.handle("hdr:listFiles", async () => listHdrFiles());
  ipcMain.handle("hdr:listFilesInFolder", async (_event, folder: string) =>
    listHdrFilesInFolder(folder),
  );
  ipcMain.handle("hdr:readFile", async (_event, fileName: string) =>
    readHdrFile(fileName),
  );
  ipcMain.handle("hdr:getRawThumbnail", async (_event, filePath: string) =>
    generateRawThumbnail(filePath),
  );
  ipcMain.handle(
    "hdr:suggestSets",
    async (_event, filePaths: string[], options?: SuggestOptions) =>
      suggestHdrSets(filePaths, options),
  );
  ipcMain.handle(
    "hdr:mergeRawToHdr",
    async (_event, filePaths: string[], options?: MergeOptions) =>
      mergeRawImagesToHdr(filePaths, options),
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
