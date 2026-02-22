import { contextBridge, ipcRenderer } from "electron";

type HdrListResponse = {
  folder: string;
  files: string[];
};

type MergeRawResponse = {
  outputPath: string;
  previewPath?: string;
  width: number;
  height: number;
  dynamicRangeStops?: number;
  inputSpanStops?: number;
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

const api = {
  listHdrFiles: (): Promise<HdrListResponse> =>
    ipcRenderer.invoke("hdr:listFiles"),
  listHdrFilesInFolder: (folder: string): Promise<HdrListResponse> =>
    ipcRenderer.invoke("hdr:listFilesInFolder", folder),
  pickFolder: (): Promise<HdrListResponse | null> =>
    ipcRenderer.invoke("hdr:pickFolder"),
  pickFiles: (): Promise<HdrListResponse | null> =>
    ipcRenderer.invoke("hdr:pickFiles"),
  readHdrFile: (fileName: string): Promise<Uint8Array> =>
    ipcRenderer.invoke("hdr:readFile", fileName),
  getRawThumbnail: (filePath: string): Promise<Uint8Array> =>
    ipcRenderer.invoke("hdr:getRawThumbnail", filePath),
  suggestSets: (
    filePaths: string[],
    options?: SuggestOptions,
  ): Promise<SuggestedSet[]> =>
    ipcRenderer.invoke("hdr:suggestSets", filePaths, options),
  mergeRawToHdr: (
    filePaths: string[],
    options?: MergeOptions,
  ): Promise<MergeRawResponse> =>
    ipcRenderer.invoke("hdr:mergeRawToHdr", filePaths, options),
};

contextBridge.exposeInMainWorld("hdrApi", api);
