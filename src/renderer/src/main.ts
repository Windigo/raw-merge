import { LitElement, type TemplateResult, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";

type TreeNode = {
  name: string;
  path?: string;
  children?: Map<string, unknown>;
};

const LAST_FOLDER_STORAGE_KEY = "hdr-merge:last-folder";

@customElement("hdr-merge-app")
class HdrMergeApp extends LitElement {
  private static readonly colorOptions = [
    ["srgb", "sRGB"],
    ["adobe", "Adobe RGB"],
    ["wide", "Wide"],
    ["prophoto", "ProPhoto"],
    ["xyz", "XYZ"],
    ["raw", "RAW"],
  ] as const;

  private static readonly baseOptions = [
    ["middle", "Middle"],
    ["darkest", "Darkest"],
    ["brightest", "Brightest"],
  ] as const;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: 100%;
      height: auto;
      background: #111827;
      color: #e5e7eb;
      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        sans-serif;
      box-sizing: border-box;
      padding: 20px;
    }

    * {
      box-sizing: border-box;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(340px, 440px) minmax(0, 1fr);
      gap: 20px;
      align-items: stretch;
      min-height: calc(100dvh - 40px);
      height: auto;
    }

    .layout > * {
      min-width: 0;
    }

    .sidebar {
      min-height: 0;
      min-width: 0;
      overflow: auto;
    }

    .panel {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 12px;
      padding: 14px;
      min-width: 0;
    }

    .title {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
    }

    .subtitle {
      margin: 0;
      opacity: 0.8;
      font-size: 13px;
      word-break: break-all;
    }

    .folder-browser {
      border: 1px solid #374151;
      border-radius: 10px;
      padding: 10px;
      background: #111827;
      margin-top: 10px;
      display: grid;
      gap: 8px;
    }

    .folder-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      width: 100%;
      overflow: hidden;
    }

    .folder-picker-button {
      border-radius: 8px;
      border: 1px solid #4b5563;
      background: #111827;
      padding: 7px 10px;
      font-size: 13px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      gap: 10px;
    }

    .folder-picker-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }

    .folder-picker-button:disabled {
      opacity: 0.5;
    }

    .folder-picker-arrow {
      opacity: 0.8;
      font-size: 12px;
      line-height: 1;
    }

    .file-tree {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 360px;
      overflow: auto;
      border-top: 1px solid #374151;
      padding-top: 8px;
    }

    .tree-folder {
      margin: 4px 0;
    }

    .tree-folder > summary {
      cursor: pointer;
      user-select: none;
      padding: 2px 0;
      color: #d1d5db;
    }

    .tree-file {
      padding: 4px 0;
      min-width: 0;
      overflow: hidden;
    }

    .tree-file-label {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .tree-file-name {
      margin-left: 10px;
      font-size: 11px;
      line-height: 1.2;
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-thumb {
      width: 36px;
      height: 36px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #374151;
      background: #030712;
      flex: 0 0 36px;
    }

    .tree-thumb-placeholder {
      width: 36px;
      height: 36px;
      border-radius: 4px;
      border: 1px solid #374151;
      background: #111827;
      flex: 0 0 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .tree-thumb-spinner {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 2px solid #4b5563;
      border-top-color: #e5e7eb;
      animation: thumb-spin 0.8s linear infinite;
    }

    @keyframes thumb-spin {
      to {
        transform: rotate(360deg);
      }
    }

    .tree-children {
      list-style: none;
      margin: 0 0 0 14px;
      padding: 0;
    }

    .tree-thumb-lightness {
      display: grid;
      gap: 3px;
      min-width: 92px;
      flex: 0 0 92px;
    }

    .tree-thumb-lightness-label {
      font-size: 10px;
      opacity: 0.75;
      line-height: 1;
    }

    .tree-thumb-lightness-bar {
      height: 6px;
      border-radius: 999px;
      background: #1f2937;
      border: 1px solid #374151;
      overflow: hidden;
    }

    .tree-thumb-lightness-fill {
      height: 100%;
      background: linear-gradient(90deg, #4b5563 0%, #9ca3af 50%, #f3f4f6 100%);
    }

    .tree-thumb-exposure {
      font-size: 10px;
      opacity: 0.72;
      line-height: 1;
      white-space: nowrap;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 10px;
      min-width: 0;
      flex: 0 0 auto;
      margin-top: auto;
    }

    .settings-card {
      border: 1px solid #374151;
      border-radius: 10px;
      padding: 8px;
      padding-bottom: 16px;
      background: #111827;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      height: 164px;
    }

    .settings-title {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      opacity: 0.95;
    }

    .settings-controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      min-width: 0;
    }

    .settings-row {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .settings-metrics {
      margin-top: 6px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      font-size: 11px;
      line-height: 1.2;
      opacity: 0.9;
    }

    .settings-metric-line {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .settings-merge {
      margin-top: auto;
      margin-bottom: 6px;
      width: 100%;
      background: #e9800a;
      border-color: transparent;
      color: #3b1d00;
      font-weight: 600;
    }

    .settings-merge:hover:not(:disabled) {
      background: #ffc889;
    }

    button {
      border: 1px solid #4b5563;
      color: #e5e7eb;
      background: #111827;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      max-width: 100%;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    select {
      border: 1px solid #4b5563;
      color: #e5e7eb;
      background: #111827;
      padding: 6px 10px;
      border-radius: 8px;
      font: inherit;
      max-width: 100%;
    }

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .viewer {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 14px;
      min-height: 0;
      min-width: 0;
      height: 100%;
      overflow: hidden;
    }

    .preview-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    }

    .preview-canvas-wrap {
      position: relative;
      width: 100%;
      max-width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    .split-line-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 18px;
      transform: translateX(-50%);
      cursor: col-resize;
      z-index: 2;
      touch-action: none;
    }

    .split-side-label {
      position: absolute;
      bottom: 18px;
      padding: 8px 12px;
      border-radius: 7px;
      background: rgba(55, 65, 81, 0.42);
      border: 1.5px solid rgba(229, 231, 235, 0.95);
      color: rgba(243, 244, 246, 1);
      font: 700 16px Inter, system-ui, sans-serif;
      line-height: 1;
      pointer-events: none;
      z-index: 3;
      white-space: nowrap;
    }

    .split-side-label-left {
      transform: translate(calc(-100% - 10px), 0);
    }

    .split-side-label-right {
      transform: translate(10px, 0);
    }

    canvas {
      display: block;
      width: auto;
      max-width: 100%;
      height: auto;
      max-height: 100%;
      margin: 0 auto;
      border: 1px solid #374151;
      border-radius: 12px;
      background: #030712;
      touch-action: none;
    }

    .error {
      margin-top: 10px;
      color: #fca5a5;
      font-size: 13px;
    }

    @media (max-width: 1220px) {
      :host {
        padding: 14px;
      }

      .layout {
        grid-template-columns: 1fr;
        gap: 14px;
        align-items: start;
        min-height: 0;
        height: auto;
      }

      .sidebar {
        overflow: visible;
      }

      .viewer {
        height: 100%;
        min-height: 0;
        overflow: visible;
      }

      .preview-canvas-wrap {
        max-height: min(52vh, 620px);
        min-height: 220px;
      }

      .settings-grid {
        position: static;
      }
    }

    @media (max-width: 980px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }

      .settings-controls {
        grid-template-columns: 1fr;
      }

      .settings-card {
        height: auto;
      }
    }
  `;

  @state()
  private folderPath = "";

  @state()
  private files: string[] = [];

  @state()
  private selected = new Set<string>();

  @state()
  private error = "";

  @state()
  private isBusy = false;

  @state()
  private mergedOutputPath = "";

  @state()
  private colorSpaceA: "srgb" | "adobe" | "wide" | "prophoto" | "xyz" | "raw" =
    "srgb";

  @state()
  private baseFrameA: "middle" | "darkest" | "brightest" = "middle";

  @state()
  private colorSpaceB: "srgb" | "adobe" | "wide" | "prophoto" | "xyz" | "raw" =
    "srgb";

  @state()
  private baseFrameB: "middle" | "darkest" | "brightest" = "middle";

  @state()
  private previewSettingsLabel = "";

  @state()
  private previousPreviewSettingsLabel = "";

  @state()
  private splitPercent = 50;

  @state()
  private dynamicRangeStopsA?: number;

  @state()
  private dynamicRangeStopsB?: number;

  @state()
  private inputSpanStopsA?: number;

  @state()
  private inputSpanStopsB?: number;

  @state()
  private singleViewTarget: "a" | "b" = "b";

  @state()
  private thumbnailUrls: Record<string, string> = {};

  @state()
  private thumbnailLightness: Record<string, number> = {};

  @state()
  private thumbnailExposureSeconds: Record<string, number> = {};

  @state()
  private thumbnailLoading = new Set<string>();

  private currentPreviewPath = "";
  private previousPreviewPath = "";

  private currentCanvas?: HTMLCanvasElement;
  private currentBitmap?: ImageBitmap;
  private previousBitmap?: ImageBitmap;
  private splitLineDragging = false;
  private splitDragPointerId: number | null = null;
  private thumbnailLoadGeneration = 0;

  private zoomScale = 1;
  private panX = 0;
  private panY = 0;
  private pinchState?: {
    startDistance: number;
    startScale: number;
    anchorX: number;
    anchorY: number;
    imageX: number;
    imageY: number;
  };
  private panState?: {
    lastX: number;
    lastY: number;
  };
  private pointerPanState?: {
    pointerId: number;
    lastX: number;
    lastY: number;
  };

  private async getApi() {
    const maxWaitMs = 1500;
    const stepMs = 50;
    const start = Date.now();

    while (Date.now() - start <= maxWaitMs) {
      if (window.hdrApi) {
        return window.hdrApi;
      }
      await new Promise((resolve) => window.setTimeout(resolve, stepMs));
    }

    throw new Error(
      "Renderer bridge not available. Restart the app and ensure preload is loaded.",
    );
  }

  private hasCompareSources(): boolean {
    return Boolean(this.previousPreviewPath && this.currentPreviewPath);
  }

  private folderPickerLabel(): string {
    if (!this.folderPath) {
      return "Choose Folder…";
    }

    const normalized = this.folderPath.replaceAll("\\", "/");
    const trimmed = normalized.endsWith("/")
      ? normalized.slice(0, -1)
      : normalized;
    const parts = trimmed.split("/").filter(Boolean);
    const folderName = parts[parts.length - 1] || trimmed;
    return `~/${folderName}`;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void this.loadInitialFolder();
  }

  disconnectedCallback(): void {
    this.endSplitLineDrag();
    this.revokeThumbnailUrls();
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div class="layout">
        <section class="panel sidebar">
          <h1 class="title">RAW files for HDR merge</h1>

          <section class="folder-browser">
            <h3 class="settings-title">Folder Browser</h3>
            <div class="folder-actions">
              <button
                class="folder-picker-button"
                @click=${this.selectFolder}
                ?disabled=${this.isBusy}
              >
                <span class="folder-picker-label"
                  >${this.folderPickerLabel()}</span
                >
                <span class="folder-picker-arrow">▾</span>
              </button>
              <button
                @click=${this.toggleSelectAllFiles}
                ?disabled=${this.isBusy || this.files.length === 0}
              >
                ${this.selected.size === this.files.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>
            ${this.renderFolderTree()}
          </section>

          ${this.mergedOutputPath
            ? html`<p class="subtitle">
                Saved EXR: ${this.fileName(this.mergedOutputPath)}
              </p>`
            : ""}
          ${this.error ? html`<p class="error">${this.error}</p>` : ""}
        </section>

        <section class="viewer">
          <div class="panel preview-panel">${this.renderPreviewCanvas()}</div>

          <div class="settings-grid">
            <section class="settings-card">
              <h3 class="settings-title">A Settings</h3>
              <div class="settings-controls">
                <label class="settings-row">
                  <span>Color</span>
                  <select
                    .value=${this.colorSpaceA}
                    @change=${(event: Event) =>
                      this.onColorSpaceChange("a", event)}
                    ?disabled=${this.isBusy}
                    aria-label="A output color space"
                  >
                    ${HdrMergeApp.colorOptions.map(
                      ([value, label]) =>
                        html`<option value=${value}>${label}</option>`,
                    )}
                  </select>
                </label>
                <label class="settings-row">
                  <span>Base</span>
                  <select
                    .value=${this.baseFrameA}
                    @change=${(event: Event) =>
                      this.onBaseFrameChange("a", event)}
                    ?disabled=${this.isBusy}
                    aria-label="A base frame"
                  >
                    ${HdrMergeApp.baseOptions.map(
                      ([value, label]) =>
                        html`<option value=${value}>${label}</option>`,
                    )}
                  </select>
                </label>
              </div>
              <div class="settings-metrics">
                <span class="settings-metric-line"
                  >Input span: ${this.formatEv(this.inputSpanStopsA)}</span
                >
                <span class="settings-metric-line"
                  >Effective DR: ${this.formatEv(this.dynamicRangeStopsA)}</span
                >
              </div>
              <button
                class="settings-merge"
                @click=${() => this.mergeSelected("a")}
                ?disabled=${this.isBusy || this.selected.size < 2}
              >
                Merge RAW → A
              </button>
            </section>

            <section class="settings-card">
              <h3 class="settings-title">B Settings</h3>
              <div class="settings-controls">
                <label class="settings-row">
                  <span>Color</span>
                  <select
                    .value=${this.colorSpaceB}
                    @change=${(event: Event) =>
                      this.onColorSpaceChange("b", event)}
                    ?disabled=${this.isBusy}
                    aria-label="B output color space"
                  >
                    ${HdrMergeApp.colorOptions.map(
                      ([value, label]) =>
                        html`<option value=${value}>${label}</option>`,
                    )}
                  </select>
                </label>
                <label class="settings-row">
                  <span>Base</span>
                  <select
                    .value=${this.baseFrameB}
                    @change=${(event: Event) =>
                      this.onBaseFrameChange("b", event)}
                    ?disabled=${this.isBusy}
                    aria-label="B base frame"
                  >
                    ${HdrMergeApp.baseOptions.map(
                      ([value, label]) =>
                        html`<option value=${value}>${label}</option>`,
                    )}
                  </select>
                </label>
              </div>
              <div class="settings-metrics">
                <span class="settings-metric-line"
                  >Input span: ${this.formatEv(this.inputSpanStopsB)}</span
                >
                <span class="settings-metric-line"
                  >Effective DR: ${this.formatEv(this.dynamicRangeStopsB)}</span
                >
              </div>
              <button
                class="settings-merge"
                @click=${() => this.mergeSelected("b")}
                ?disabled=${this.isBusy || this.selected.size < 2}
              >
                Merge RAW → B
              </button>
            </section>
          </div>
        </section>
      </div>
    `;
  }

  private async loadInitialFolder(): Promise<void> {
    const savedFolder = localStorage.getItem(LAST_FOLDER_STORAGE_KEY);
    if (savedFolder) {
      this.error = "";
      this.isBusy = true;
      try {
        const result = await (
          await this.getApi()
        ).listHdrFilesInFolder(savedFolder);
        this.applyFileListResult(result);
        return;
      } catch {
        localStorage.removeItem(LAST_FOLDER_STORAGE_KEY);
      } finally {
        this.isBusy = false;
      }
    }

    await this.refreshFiles();
  }

  private renderFolderTree() {
    if (this.files.length === 0) {
      return html`<p class="subtitle">No RAW files found.</p>`;
    }

    const tree = this.buildTreeNodes();

    return html`<ul class="file-tree">${this.renderTreeNodes(tree)}</ul>`;
  }

  private renderTreeNodes(nodes: TreeNode[]): TemplateResult[] {
    return nodes.map((node) => {
      if (node.path) {
        return this.renderFileNode(node.path, node.name);
      }

      const children = this.mapToSortedNodes(
        node.children as Map<string, unknown>,
      );
      return html`<li class="tree-folder">
        <details open>
          <summary>${node.name}</summary>
          <ul class="tree-children">${this.renderTreeNodes(children)}</ul>
        </details>
      </li>`;
    });
  }

  private renderFileNode(filePath: string, name: string): TemplateResult {
    const thumbnailUrl = this.thumbnailUrls[filePath];
    const thumbnailIsLoading = this.thumbnailLoading.has(filePath);
    const lightness = this.thumbnailLightness[filePath];
    const exposureSeconds = this.thumbnailExposureSeconds[filePath];
    const lightnessPercent = Number.isFinite(lightness)
      ? Math.round(lightness)
      : undefined;
    return html`<li class="tree-file">
      <label class="tree-file-label">
        <input
          type="checkbox"
          .checked=${this.selected.has(filePath)}
          @change=${(event: Event) => this.toggleFile(filePath, event)}
        />
        ${thumbnailUrl
          ? html`<img class="tree-thumb" src=${thumbnailUrl} alt="" />`
          : html`<span class="tree-thumb-placeholder"
              >${thumbnailIsLoading
                ? html`<span class="tree-thumb-spinner"></span>`
                : ""}</span
            >`}
        <span class="tree-thumb-lightness">
          <span class="tree-thumb-lightness-label"
            >${lightnessPercent !== undefined
              ? `L ${lightnessPercent}%`
              : "L —"}</span
          >
          <span class="tree-thumb-lightness-bar">
            <span
              class="tree-thumb-lightness-fill"
              style=${`width:${lightnessPercent ?? 0}%;`}
            ></span>
          </span>
          <span class="tree-thumb-exposure"
            >${this.formatExposureDisplay(exposureSeconds)}</span
          >
        </span>
        <span class="tree-file-name">${name}</span>
      </label>
    </li>`;
  }

  private buildTreeNodes(filesToUse: string[] = this.files): TreeNode[] {
    const root = new Map<string, unknown>();
    for (const filePath of filesToUse) {
      const relative = this.relativeToFolder(filePath);
      const parts = relative.split("/").filter(Boolean);
      if (parts.length === 0) {
        continue;
      }

      let cursor = root;
      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        const isLast = index === parts.length - 1;
        if (isLast) {
          cursor.set(part, { path: filePath });
          continue;
        }
        const existing = cursor.get(part);
        if (!(existing instanceof Map)) {
          const created = new Map<string, unknown>();
          cursor.set(part, created);
          cursor = created;
        } else {
          cursor = existing;
        }
      }
    }

    return this.mapToSortedNodes(root);
  }

  private mapToSortedNodes(map: Map<string, unknown>): TreeNode[] {
    return [...map.entries()]
      .map(([name, value]) => {
        if (value instanceof Map) {
          return { name, children: value };
        }
        const leaf = value as { path: string };
        return { name, path: leaf.path };
      })
      .sort((left, right) => {
        const leftFolder = "children" in left;
        const rightFolder = "children" in right;
        if (leftFolder !== rightFolder) {
          return leftFolder ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });
  }

  private relativeToFolder(filePath: string): string {
    const normalizedFile = filePath.replaceAll("\\", "/");
    const normalizedFolder = this.folderPath.replaceAll("\\", "/");
    if (
      normalizedFolder &&
      (normalizedFile === normalizedFolder ||
        normalizedFile.startsWith(`${normalizedFolder}/`))
    ) {
      return normalizedFile.slice(normalizedFolder.length).replace(/^\//, "");
    }
    return this.fileName(filePath);
  }

  private renderPreviewCanvas() {
    return html`<div class="preview-canvas-wrap">
        <canvas
          id="currentCanvas"
          @wheel=${this.onCanvasWheel}
          @pointerdown=${this.onCanvasPointerDown}
          @pointermove=${this.onCanvasPointerMove}
          @pointerup=${this.onCanvasPointerUp}
          @pointercancel=${this.onCanvasPointerUp}
          @touchstart=${this.onCanvasTouchStart}
          @touchmove=${this.onCanvasTouchMove}
          @touchend=${this.onCanvasTouchEnd}
          @touchcancel=${this.onCanvasTouchEnd}
        ></canvas>
        ${this.hasCompareSources()
          ? html`
              <div
                class="split-side-label split-side-label-left"
                style=${this.splitLabelStyle()}
              >
                A
              </div>
              <div
                class="split-side-label split-side-label-right"
                style=${this.splitLabelStyle()}
              >
                B
              </div>
              <div
                class="split-line-handle"
                style=${this.splitHandleStyle()}
                @pointerdown=${this.onSplitHandlePointerDown}
              ></div>
            `
          : ""}
      </div>`;
  }

  protected updated(): void {
    this.currentCanvas =
      this.renderRoot.querySelector("#currentCanvas") ?? undefined;

    void this.renderPreviewIfPossible();
  }

  private async refreshFiles(): Promise<void> {
    this.error = "";
    this.isBusy = true;
    try {
      const result = await (await this.getApi()).listHdrFiles();
      this.applyFileListResult(result);
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Failed to load RAW files.";
    } finally {
      this.isBusy = false;
    }
  }

  private async selectFolder(): Promise<void> {
    this.error = "";
    this.isBusy = true;
    try {
      const result = await (await this.getApi()).pickFolder();
      if (!result) {
        return;
      }
      this.applyFileListResult(result);
      localStorage.setItem(LAST_FOLDER_STORAGE_KEY, result.folder);
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Failed to select folder.";
    } finally {
      this.isBusy = false;
    }
  }

  private async selectFiles(): Promise<void> {
    this.error = "";
    this.isBusy = true;
    try {
      const result = await (await this.getApi()).pickFiles();
      if (!result) {
        return;
      }
      this.applyFileListResult(result);
      localStorage.setItem(LAST_FOLDER_STORAGE_KEY, result.folder);
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Failed to select RAW files.";
    } finally {
      this.isBusy = false;
    }
  }

  private toggleFile(filePath: string, event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const next = new Set(this.selected);
    if (input.checked) {
      next.add(filePath);
    } else {
      next.delete(filePath);
    }
    this.selected = next;
  }

  private toggleSelectAllFiles(): void {
    if (this.selected.size === this.files.length) {
      this.selected = new Set();
      return;
    }

    this.selected = new Set(this.files);
  }

  private applyFileListResult(result: {
    folder: string;
    files: string[];
  }): void {
    this.thumbnailLoadGeneration += 1;
    this.revokeThumbnailUrls();

    this.folderPath = result.folder;
    this.files = result.files;
    this.selected = new Set();
    this.thumbnailUrls = {};
    this.thumbnailLightness = {};
    this.thumbnailExposureSeconds = {};
    this.thumbnailLoading = new Set(result.files);
    this.mergedOutputPath = "";
    this.previewSettingsLabel = "";
    this.previousPreviewSettingsLabel = "";
    this.currentPreviewPath = "";
    this.previousPreviewPath = "";
    this.dynamicRangeStopsA = undefined;
    this.dynamicRangeStopsB = undefined;
    this.inputSpanStopsA = undefined;
    this.inputSpanStopsB = undefined;
    this.splitPercent = 50;
    this.endSplitLineDrag();
    this.disposeBitmaps();
    this.clearPreviewCanvases();

    void this.loadThumbnails(result.files, this.thumbnailLoadGeneration);
  }

  private async loadThumbnails(
    files: string[],
    generation: number,
  ): Promise<void> {
    for (const filePath of files) {
      if (generation !== this.thumbnailLoadGeneration) {
        break;
      }

      try {
        const thumbnail = await (await this.getApi()).getRawThumbnail(filePath);
        if (generation !== this.thumbnailLoadGeneration) {
          break;
        }

        const normalizedBytes = new Uint8Array(thumbnail);
        const arrayBuffer = normalizedBytes.buffer.slice(
          normalizedBytes.byteOffset,
          normalizedBytes.byteOffset + normalizedBytes.byteLength,
        );
        const blob = new Blob([arrayBuffer], { type: "image/png" });
        const nextUrl = URL.createObjectURL(blob);
        const api = await this.getApi();
        const [lightness, exposureSeconds] = await Promise.all([
          this.estimateThumbnailLightness(blob),
          api.getRawExposure(filePath).catch(() => null),
        ]);
        this.thumbnailUrls = { ...this.thumbnailUrls, [filePath]: nextUrl };
        if (typeof lightness === "number") {
          this.thumbnailLightness = {
            ...this.thumbnailLightness,
            [filePath]: lightness,
          };
        }
        if (typeof exposureSeconds === "number" && Number.isFinite(exposureSeconds)) {
          this.thumbnailExposureSeconds = {
            ...this.thumbnailExposureSeconds,
            [filePath]: exposureSeconds,
          };
        }
      } catch {
      } finally {
        if (generation === this.thumbnailLoadGeneration) {
          const nextLoading = new Set(this.thumbnailLoading);
          nextLoading.delete(filePath);
          this.thumbnailLoading = nextLoading;
        }
      }
    }
  }

  private revokeThumbnailUrls(): void {
    Object.values(this.thumbnailUrls).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    this.thumbnailUrls = {};
    this.thumbnailLightness = {};
    this.thumbnailExposureSeconds = {};
    this.thumbnailLoading = new Set();
  }

  private async estimateThumbnailLightness(
    blob: Blob,
  ): Promise<number | undefined> {
    try {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      const sampleWidth = 24;
      const sampleHeight = 24;
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        bitmap.close();
        return undefined;
      }

      context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);
      bitmap.close();
      const data = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
      let luminanceSum = 0;
      let pixelCount = 0;
      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        luminanceSum += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        pixelCount += 1;
      }

      if (pixelCount === 0) {
        return undefined;
      }

      return Math.max(0, Math.min(100, (luminanceSum / pixelCount / 255) * 100));
    } catch {
      return undefined;
    }
  }

  private async mergeSelected(target: "a" | "b"): Promise<void> {
    this.error = "";
    const targets = [...this.selected];
    if (targets.length < 2) {
      this.error = "Select at least two RAW files for HDR merge.";
      return;
    }

    this.isBusy = true;
    try {
      const colorSpace = target === "a" ? this.colorSpaceA : this.colorSpaceB;
      const baseFrame = target === "a" ? this.baseFrameA : this.baseFrameB;

      const merged = await (
        await this.getApi()
      ).mergeRawToHdr(targets, {
        colorSpace,
        baseFrame,
      });
      this.mergedOutputPath = merged.outputPath;
      const settingsLabel = `Color ${colorSpace}, Base ${baseFrame}`;
      const previewPath = merged.previewPath ?? merged.outputPath;

      if (target === "a") {
        this.previousPreviewPath = previewPath;
        this.previousPreviewSettingsLabel = settingsLabel;
        this.dynamicRangeStopsA = merged.dynamicRangeStops;
        this.inputSpanStopsA = merged.inputSpanStops;
        this.previousBitmap = await this.loadPreviewBitmap(
          this.previousPreviewPath,
        );
      } else {
        this.currentPreviewPath = previewPath;
        this.previewSettingsLabel = settingsLabel;
        this.dynamicRangeStopsB = merged.dynamicRangeStops;
        this.inputSpanStopsB = merged.inputSpanStops;
        this.currentBitmap = await this.loadPreviewBitmap(
          this.currentPreviewPath,
        );
      }

      this.singleViewTarget = target;
      this.resetZoomState();

      await this.updateComplete;
      await this.renderPreviewIfPossible();
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Could not merge RAW images.";
    } finally {
      this.isBusy = false;
    }
  }

  private fileName(filePath: string): string {
    const normalized = filePath.replaceAll("\\", "/");
    const parts = normalized.split("/");
    return parts[parts.length - 1] || filePath;
  }

  private onColorSpaceChange(target: "a" | "b", event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    const nextValue = select.value as
      | "srgb"
      | "adobe"
      | "wide"
      | "prophoto"
      | "xyz"
      | "raw";
    if (target === "a") {
      this.colorSpaceA = nextValue;
    } else {
      this.colorSpaceB = nextValue;
    }
  }

  private onBaseFrameChange(target: "a" | "b", event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    const nextValue = select.value as "middle" | "darkest" | "brightest";
    if (target === "a") {
      this.baseFrameA = nextValue;
    } else {
      this.baseFrameB = nextValue;
    }
  }

  private formatEv(value?: number): string {
    return Number.isFinite(value) ? `${value?.toFixed(2)} EV` : "—";
  }

  private formatExposureDisplay(seconds?: number): string {
    if (!Number.isFinite(seconds) || !seconds || seconds <= 0) {
      return "Exp —";
    }

    const base = this.medianExposureSeconds();
    const evOffset =
      typeof base === "number" && base > 0 ? Math.log2(seconds / base) : undefined;
    const formattedExposure = this.formatShutter(seconds);
    const formattedOffset =
      typeof evOffset === "number" && Number.isFinite(evOffset)
        ? ` (${evOffset >= 0 ? "+" : ""}${evOffset.toFixed(1)}EV)`
        : "";
    return `Exp ${formattedExposure}${formattedOffset}`;
  }

  private medianExposureSeconds(): number | undefined {
    const values = Object.values(this.thumbnailExposureSeconds)
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((left, right) => left - right);
    if (values.length === 0) {
      return undefined;
    }

    const middle = Math.floor(values.length / 2);
    if (values.length % 2 === 1) {
      return values[middle];
    }

    return (values[middle - 1] + values[middle]) / 2;
  }

  private formatShutter(seconds: number): string {
    if (seconds >= 1) {
      return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
    }

    const denominator = Math.max(1, Math.round(1 / seconds));
    return `1/${denominator}s`;
  }

  private async loadPreviewBitmap(previewPath: string): Promise<ImageBitmap> {
    const bytes = await (await this.getApi()).readHdrFile(previewPath);
    const normalizedBytes = new Uint8Array(bytes);
    const arrayBuffer = normalizedBytes.buffer.slice(
      normalizedBytes.byteOffset,
      normalizedBytes.byteOffset + normalizedBytes.byteLength,
    );
    const extension = previewPath.split(".").pop()?.toLowerCase();
    const mime =
      extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "image/png";
    const blob = new Blob([arrayBuffer], { type: mime });
    return createImageBitmap(blob);
  }

  private async renderPreviewIfPossible(): Promise<void> {
    if (!this.currentCanvas) {
      return;
    }

    const context = this.currentCanvas.getContext("2d");
    if (!context) {
      return;
    }

    const splitMode = this.hasCompareSources();

    if (splitMode) {
      if (!this.previousBitmap && this.previousPreviewPath) {
        this.previousBitmap = await this.loadPreviewBitmap(
          this.previousPreviewPath,
        );
      }
      if (!this.currentBitmap && this.currentPreviewPath) {
        this.currentBitmap = await this.loadPreviewBitmap(
          this.currentPreviewPath,
        );
      }
    }

    const primaryPath =
      this.singleViewTarget === "a"
        ? this.previousPreviewPath
        : this.currentPreviewPath;
    const primaryBitmap =
      this.singleViewTarget === "a" ? this.previousBitmap : this.currentBitmap;

    if (!splitMode && !primaryBitmap && primaryPath) {
      if (this.singleViewTarget === "a") {
        this.previousBitmap = await this.loadPreviewBitmap(primaryPath);
      } else {
        this.currentBitmap = await this.loadPreviewBitmap(primaryPath);
      }
    }

    const displayBitmap = splitMode
      ? (this.currentBitmap ?? this.previousBitmap)
      : this.singleViewTarget === "a"
        ? this.previousBitmap
        : this.currentBitmap;

    if (!displayBitmap) {
      return;
    }

    const width = displayBitmap.width;
    const height = displayBitmap.height;

    this.currentCanvas.width = width;
    this.currentCanvas.height = height;
    context.clearRect(0, 0, width, height);

    if (splitMode && this.previousBitmap && this.currentBitmap) {
      this.clampPan(width, height);
      const splitX = Math.round((width * this.splitPercent) / 100);

      context.save();
      context.beginPath();
      context.rect(0, 0, splitX, height);
      context.clip();
      context.setTransform(
        this.zoomScale,
        0,
        0,
        this.zoomScale,
        this.panX,
        this.panY,
      );
      context.drawImage(
        this.previousBitmap,
        0,
        0,
      );
      context.restore();

      context.save();
      context.beginPath();
      context.rect(splitX, 0, width - splitX, height);
      context.clip();
      context.setTransform(
        this.zoomScale,
        0,
        0,
        this.zoomScale,
        this.panX,
        this.panY,
      );
      context.drawImage(
        this.currentBitmap,
        0,
        0,
      );
      context.restore();
      this.drawSplitGuide(context, splitX, width, height);
      return;
    }

    this.clampPan(width, height);
    context.save();
    context.setTransform(
      this.zoomScale,
      0,
      0,
      this.zoomScale,
      this.panX,
      this.panY,
    );
    context.drawImage(displayBitmap, 0, 0);
    context.restore();
  }

  private drawSplitGuide(
    context: CanvasRenderingContext2D,
    splitCanvasX: number,
    width: number,
    height: number,
  ): void {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.strokeStyle = "rgba(255, 255, 255, 0.9)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(splitCanvasX + 0.5, 0);
    context.lineTo(splitCanvasX + 0.5, height);
    context.stroke();
    context.restore();
  }

  private splitLabelStyle(): string {
    if (!this.currentCanvas) {
      return `left:${this.splitPercent}%;`;
    }

    const canvasWidth = this.currentCanvas.clientWidth;
    if (canvasWidth <= 0) {
      return `left:${this.splitPercent}%;`;
    }

    const leftPx =
      this.currentCanvas.offsetLeft + (canvasWidth * this.splitPercent) / 100;
    return `left:${leftPx}px;`;
  }

  private onSplitHandlePointerDown(event: PointerEvent): void {
    if (!this.hasCompareSources() || !this.currentCanvas) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    this.splitLineDragging = true;
    this.splitDragPointerId = event.pointerId;
    window.addEventListener("pointermove", this.onSplitDragPointerMove);
    window.addEventListener("pointerup", this.onSplitDragPointerUp);
    window.addEventListener("pointercancel", this.onSplitDragPointerUp);
    this.updateSplitFromClientX(event.clientX);
    event.preventDefault();
  }

  private onSplitDragPointerMove = (event: PointerEvent): void => {
    if (!this.splitLineDragging || this.splitDragPointerId !== event.pointerId) {
      return;
    }

    this.updateSplitFromClientX(event.clientX);
    event.preventDefault();
  };

  private onSplitDragPointerUp = (event: PointerEvent): void => {
    if (!this.splitLineDragging || this.splitDragPointerId !== event.pointerId) {
      return;
    }

    this.updateSplitFromClientX(event.clientX);
    this.endSplitLineDrag();
    void this.renderPreviewIfPossible();
    event.preventDefault();
  };

  private endSplitLineDrag(): void {
    window.removeEventListener("pointermove", this.onSplitDragPointerMove);
    window.removeEventListener("pointerup", this.onSplitDragPointerUp);
    window.removeEventListener("pointercancel", this.onSplitDragPointerUp);
    this.splitDragPointerId = null;
    this.splitLineDragging = false;
  }

  private updateSplitFromClientX(clientX: number): void {
    if (!this.currentCanvas) {
      return;
    }

    const rect = this.currentCanvas.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const rawPercent = ((clientX - rect.left) / rect.width) * 100;
    this.splitPercent = Math.min(97, Math.max(3, rawPercent));
    void this.renderPreviewIfPossible();
  }

  private splitHandleStyle(): string {
    if (!this.currentCanvas) {
      return `left:${this.splitPercent}%;`;
    }

    const canvasWidth = this.currentCanvas.clientWidth;
    if (canvasWidth <= 0) {
      return `left:${this.splitPercent}%;`;
    }

    const leftPx =
      this.currentCanvas.offsetLeft + (canvasWidth * this.splitPercent) / 100;
    return `left:${leftPx}px;`;
  }

  private onCanvasWheel(event: WheelEvent): void {
    if (!this.currentCanvas) {
      return;
    }

    const rect = this.currentCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    if (event.ctrlKey) {
      event.preventDefault();
      const focalX =
        ((event.clientX - rect.left) * this.currentCanvas.width) / rect.width;
      const focalY =
        ((event.clientY - rect.top) * this.currentCanvas.height) / rect.height;
      const zoomFactor = Math.exp(-event.deltaY * 0.0025);
      this.applyZoomAtPoint(focalX, focalY, this.zoomScale * zoomFactor);
      return;
    }

    if (this.zoomScale <= 1) {
      return;
    }

    event.preventDefault();
    const scaleX = this.currentCanvas.width / rect.width;
    const scaleY = this.currentCanvas.height / rect.height;
    this.panX -= event.deltaX * scaleX;
    this.panY -= event.deltaY * scaleY;
    void this.renderPreviewIfPossible();
  }

  private onCanvasPointerDown(event: PointerEvent): void {
    if (!this.currentCanvas || this.zoomScale <= 1) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const point = this.clientToCanvasPoint(event.clientX, event.clientY);
    this.pointerPanState = {
      pointerId: event.pointerId,
      lastX: point.x,
      lastY: point.y,
    };
    this.currentCanvas.setPointerCapture(event.pointerId);
    this.currentCanvas.style.cursor = "grabbing";
    event.preventDefault();
  }

  private onCanvasPointerMove(event: PointerEvent): void {
    if (!this.currentCanvas || !this.pointerPanState) {
      return;
    }

    if (this.pointerPanState.pointerId !== event.pointerId) {
      return;
    }

    const point = this.clientToCanvasPoint(event.clientX, event.clientY);
    this.panX += point.x - this.pointerPanState.lastX;
    this.panY += point.y - this.pointerPanState.lastY;
    this.pointerPanState = {
      pointerId: event.pointerId,
      lastX: point.x,
      lastY: point.y,
    };
    void this.renderPreviewIfPossible();
    event.preventDefault();
  }

  private onCanvasPointerUp(event: PointerEvent): void {
    if (!this.currentCanvas || !this.pointerPanState) {
      return;
    }

    if (this.pointerPanState.pointerId !== event.pointerId) {
      return;
    }

    this.pointerPanState = undefined;
    this.currentCanvas.style.cursor = this.zoomScale > 1 ? "grab" : "default";
    event.preventDefault();
  }

  private onCanvasTouchStart(event: TouchEvent): void {
    if (!this.currentCanvas) {
      return;
    }

    if (event.touches.length >= 2) {
      event.preventDefault();
      const first = event.touches[0];
      const second = event.touches[1];
      const firstPoint = this.touchToCanvasPoint(first);
      const secondPoint = this.touchToCanvasPoint(second);
      const anchorX = (firstPoint.x + secondPoint.x) / 2;
      const anchorY = (firstPoint.y + secondPoint.y) / 2;
      const imageX = (anchorX - this.panX) / this.zoomScale;
      const imageY = (anchorY - this.panY) / this.zoomScale;

      this.pinchState = {
        startDistance: Math.hypot(
          secondPoint.x - firstPoint.x,
          secondPoint.y - firstPoint.y,
        ),
        startScale: this.zoomScale,
        anchorX,
        anchorY,
        imageX,
        imageY,
      };
      this.panState = undefined;
      return;
    }

    if (event.touches.length === 1 && this.zoomScale > 1) {
      event.preventDefault();
      const point = this.touchToCanvasPoint(event.touches[0]);
      this.panState = { lastX: point.x, lastY: point.y };
    }
  }

  private onCanvasTouchMove(event: TouchEvent): void {
    if (!this.currentCanvas) {
      return;
    }

    if (event.touches.length >= 2 && this.pinchState) {
      event.preventDefault();
      const firstPoint = this.touchToCanvasPoint(event.touches[0]);
      const secondPoint = this.touchToCanvasPoint(event.touches[1]);
      const distance = Math.hypot(
        secondPoint.x - firstPoint.x,
        secondPoint.y - firstPoint.y,
      );
      if (this.pinchState.startDistance <= 0) {
        return;
      }

      const pinchRatio = distance / this.pinchState.startDistance;
      const pinchGain = 1.22;
      const nextScale =
        this.pinchState.startScale * Math.pow(pinchRatio, pinchGain);
      const anchorX = (firstPoint.x + secondPoint.x) / 2;
      const anchorY = (firstPoint.y + secondPoint.y) / 2;
      this.zoomScale = this.clampScale(nextScale);
      this.panX = anchorX - this.pinchState.imageX * this.zoomScale;
      this.panY = anchorY - this.pinchState.imageY * this.zoomScale;
      void this.renderPreviewIfPossible();
      return;
    }

    if (event.touches.length === 1 && this.panState && this.zoomScale > 1) {
      event.preventDefault();
      const point = this.touchToCanvasPoint(event.touches[0]);
      this.panX += point.x - this.panState.lastX;
      this.panY += point.y - this.panState.lastY;
      this.panState = { lastX: point.x, lastY: point.y };
      void this.renderPreviewIfPossible();
    }
  }

  private onCanvasTouchEnd(event: TouchEvent): void {
    if (event.touches.length < 2) {
      this.pinchState = undefined;
    }

    if (event.touches.length === 1 && this.zoomScale > 1) {
      const point = this.touchToCanvasPoint(event.touches[0]);
      this.panState = { lastX: point.x, lastY: point.y };
      return;
    }

    if (event.touches.length === 0) {
      this.panState = undefined;
    }
  }

  private touchToCanvasPoint(touch: Touch): { x: number; y: number } {
    return this.clientToCanvasPoint(touch.clientX, touch.clientY);
  }

  private clientToCanvasPoint(clientX: number, clientY: number): {
    x: number;
    y: number;
  } {
    if (!this.currentCanvas) {
      return { x: 0, y: 0 };
    }

    const rect = this.currentCanvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * this.currentCanvas.width) / rect.width,
      y: ((clientY - rect.top) * this.currentCanvas.height) / rect.height,
    };
  }

  private applyZoomAtPoint(
    focalX: number,
    focalY: number,
    requestedScale: number,
  ): void {
    const nextScale = this.clampScale(requestedScale);
    const imageX = (focalX - this.panX) / this.zoomScale;
    const imageY = (focalY - this.panY) / this.zoomScale;

    this.zoomScale = nextScale;
    this.panX = focalX - imageX * this.zoomScale;
    this.panY = focalY - imageY * this.zoomScale;
    void this.renderPreviewIfPossible();
  }

  private clampScale(value: number): number {
    return Math.min(8, Math.max(1, value));
  }

  private clampPan(width: number, height: number): void {
    const scaledWidth = width * this.zoomScale;
    const scaledHeight = height * this.zoomScale;
    const minPanX = Math.min(0, width - scaledWidth);
    const minPanY = Math.min(0, height - scaledHeight);

    this.panX = Math.min(0, Math.max(minPanX, this.panX));
    this.panY = Math.min(0, Math.max(minPanY, this.panY));
  }

  private resetZoomState(): void {
    this.zoomScale = 1;
    this.panX = 0;
    this.panY = 0;
    this.pinchState = undefined;
    this.panState = undefined;
    this.pointerPanState = undefined;
    if (this.currentCanvas) {
      this.currentCanvas.style.cursor = "default";
    }
  }

  private disposeBitmaps(): void {
    if (this.currentBitmap) {
      this.currentBitmap.close();
      this.currentBitmap = undefined;
    }

    if (this.previousBitmap) {
      this.previousBitmap.close();
      this.previousBitmap = undefined;
    }
  }

  private clearPreviewCanvases(): void {
    this.resetZoomState();

    if (this.currentCanvas) {
      const currentContext = this.currentCanvas.getContext("2d");
      if (currentContext) {
        this.currentCanvas.width = 1280;
        this.currentCanvas.height = 720;
        currentContext.clearRect(
          0,
          0,
          this.currentCanvas.width,
          this.currentCanvas.height,
        );
      }
    }
  }
}
