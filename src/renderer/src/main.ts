import { LitElement, type TemplateResult, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";

type TreeNode = {
  name: string;
  path?: string;
  children?: Map<string, unknown>;
};

type SuggestedSet = {
  id: string;
  label: string;
  count: number;
  confidence: "high" | "medium" | "low";
  score: number;
  files: string[];
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
      height: 100%;
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
      grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
      gap: 20px;
      align-items: stretch;
      height: 100%;
      min-height: 0;
    }

    .sidebar {
      min-height: 0;
      overflow: auto;
    }

    .panel {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 12px;
      padding: 14px;
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

    .suggestion-tolerance {
      display: grid;
      gap: 6px;
      margin-top: 2px;
    }

    .suggestion-tolerance-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
      opacity: 0.9;
    }

    .suggestion-tolerance input[type="range"] {
      width: 100%;
      cursor: pointer;
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
    }

    .tree-file-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .suggested-tag {
      font-size: 11px;
      opacity: 0.8;
      letter-spacing: 0.02em;
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

    .suggestion-panel {
      border-top: 1px solid #374151;
      margin-top: 8px;
      padding-top: 8px;
      display: grid;
      gap: 8px;
    }

    .suggestion-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .suggestion-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 6px;
      max-height: 180px;
      overflow: auto;
    }

    .suggestion-item {
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 8px;
      display: grid;
      gap: 6px;
      background: #0f172a;
    }

    .suggestion-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      opacity: 0.9;
    }

    .confidence {
      border: 1px solid #4b5563;
      border-radius: 999px;
      padding: 1px 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 10px;
    }

    .settings-card {
      border: 1px solid #374151;
      border-radius: 10px;
      padding: 10px;
      background: #111827;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .settings-title {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      opacity: 0.95;
    }

    .settings-row {
      display: grid;
      gap: 6px;
    }

    .settings-merge {
      margin-top: auto;
      width: 100%;
    }

    button {
      border: 1px solid #4b5563;
      color: #e5e7eb;
      background: #111827;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    select {
      border: 1px solid #4b5563;
      color: #e5e7eb;
      background: #111827;
      padding: 8px 12px;
      border-radius: 8px;
      font: inherit;
    }

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .viewer {
      display: grid;
      gap: 14px;
      grid-template-columns: 1fr;
      grid-template-rows: minmax(0, 1fr) auto;
      min-height: 0;
      height: 100%;
      overflow: auto;
    }

    .preview-panel {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      min-height: 0;
    }

    .split-controls {
      display: grid;
      gap: 6px;
      margin-top: 10px;
    }

    .split-controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
      opacity: 0.9;
    }

    .split-controls input[type="range"] {
      width: 100%;
      cursor: pointer;
    }

    canvas {
      display: block;
      width: 100%;
      max-width: 100%;
      height: 100%;
      min-height: 220px;
      max-height: none;
      object-fit: contain;
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
        height: auto;
      }

      .sidebar {
        overflow: visible;
      }

      .viewer {
        height: auto;
        min-height: 0;
        overflow: visible;
        grid-template-rows: auto auto;
      }

      .preview-panel {
        grid-template-rows: auto auto auto;
      }

      canvas {
        height: auto;
        max-height: min(62vh, 760px);
      }
    }

    @media (max-width: 980px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-height: 900px) {
      canvas {
        min-height: 180px;
      }
    }

    @media (max-height: 760px) {
      canvas {
        min-height: 140px;
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
  private singleViewTarget: "a" | "b" = "b";

  @state()
  private thumbnailUrls: Record<string, string> = {};

  @state()
  private thumbnailLoading = new Set<string>();

  @state()
  private suggestedSets: SuggestedSet[] = [];

  @state()
  private suggestionBusy = false;

  @state()
  private suggestionError = "";

  @state()
  private suggestionMaxGapSeconds = 30;

  private currentPreviewPath = "";
  private previousPreviewPath = "";

  private currentCanvas?: HTMLCanvasElement;
  private currentBitmap?: ImageBitmap;
  private previousBitmap?: ImageBitmap;
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
            <div class="suggestion-tolerance">
              <div class="suggestion-tolerance-row">
                <span>Bracket matching</span>
                <span>${this.suggestionMaxGapSeconds}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="120"
                step="1"
                .value=${String(this.suggestionMaxGapSeconds)}
                @input=${this.onSuggestionToleranceInput}
                ?disabled=${this.files.length < 2}
                aria-label="Bracket matching tolerance in seconds"
              />
            </div>
            ${this.renderFolderTree()}
          </section>

          ${this.mergedOutputPath
            ? html`<p class="subtitle">Saved EXR: ${this.mergedOutputPath}</p>`
            : ""}
          ${this.previousPreviewSettingsLabel
            ? html`<p class="subtitle">
                A settings: ${this.previousPreviewSettingsLabel}
              </p>`
            : ""}
          ${this.previewSettingsLabel
            ? html`<p class="subtitle">
                B settings: ${this.previewSettingsLabel}
              </p>`
            : ""}
          ${this.error ? html`<p class="error">${this.error}</p>` : ""}
        </section>

        <section class="viewer">
          <div class="panel preview-panel">
            <h2 class="title">
              ${this.hasCompareSources() ? "A/B Split Preview" : "Merged preview"}
            </h2>
            <p class="subtitle">
              ${this.hasCompareSources()
                ? `A: ${this.previousPreviewSettingsLabel} · B: ${this.previewSettingsLabel}`
                : this.singleViewTarget === "a"
                  ? `A: ${this.previousPreviewSettingsLabel}`
                  : `B: ${this.previewSettingsLabel}`}
            </p>
            ${this.renderPreviewCanvas()}
            ${this.hasCompareSources()
              ? html`<div class="split-controls">
                  <div class="split-controls-row">
                    <span>A</span>
                    <span>${Math.round(this.splitPercent)}%</span>
                    <span>B</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="97"
                    step="1"
                    .value=${String(this.splitPercent)}
                    @input=${this.onSplitPercentInput}
                    aria-label="Split position"
                  />
                </div>`
              : ""}
          </div>

          <div class="settings-grid">
            <section class="settings-card">
              <h3 class="settings-title">A Settings</h3>
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

  private async refreshSuggestedSets(): Promise<void> {
    this.suggestionError = "";
    if (this.files.length < 2) {
      this.suggestedSets = [];
      return;
    }

    this.suggestionBusy = true;
    try {
      this.suggestedSets = await (
        await this.getApi()
      ).suggestSets(this.files, {
        maxGapSeconds: this.suggestionMaxGapSeconds,
      });
    } catch (error) {
      this.suggestedSets = [];
      this.suggestionError =
        error instanceof Error ? error.message : "Failed to suggest HDR sets.";
    } finally {
      this.suggestionBusy = false;
    }
  }

  private renderFolderTree() {
    if (this.files.length === 0) {
      return html`<p class="subtitle">No RAW files found.</p>`;
    }

    const tree = this.buildTreeNodes();
    const suggestedTags = this.buildSuggestedTags();

    return html`${this.suggestionBusy
        ? html`<p class="subtitle">Updating suggestions…</p>`
        : ""}
      ${this.suggestionError
        ? html`<p class="error">${this.suggestionError}</p>`
        : ""}
      <ul class="file-tree">
        ${this.renderTreeNodes(tree, suggestedTags)}
      </ul>`;
  }

  private onSuggestionToleranceInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    const value = Number(target.value);
    if (!Number.isFinite(value) || value < 1) {
      return;
    }

    this.suggestionMaxGapSeconds = Math.round(value);
    void this.refreshSuggestedSets();
  }

  private renderTreeNodes(
    nodes: TreeNode[],
    suggestedTags: Map<string, string[]>,
  ): TemplateResult[] {
    return nodes.map((node) => {
      if (node.path) {
        return this.renderFileNode(
          node.path,
          node.name,
          suggestedTags.get(node.path) ?? [],
        );
      }

      const children = this.mapToSortedNodes(
        node.children as Map<string, unknown>,
      );
      return html`<li class="tree-folder">
        <details open>
          <summary>${node.name}</summary>
          <ul class="tree-children">
            ${this.renderTreeNodes(children, suggestedTags)}
          </ul>
        </details>
      </li>`;
    });
  }

  private renderFileNode(
    filePath: string,
    name: string,
    tags: string[] = [],
  ): TemplateResult {
    const thumbnailUrl = this.thumbnailUrls[filePath];
    const thumbnailIsLoading = this.thumbnailLoading.has(filePath);
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
        <span>${name}</span>
        ${tags.map((tag) => html`<span class="suggested-tag">[${tag}]</span>`)}
      </label>
    </li>`;
  }

  private buildSuggestedTags(): Map<string, string[]> {
    const tagsByFile = new Map<string, string[]>();
    const availableFiles = new Set(this.files);

    this.suggestedSets.forEach((set, index) => {
      const tag = `S${index + 1}`;
      for (const filePath of set.files) {
        if (!availableFiles.has(filePath)) {
          continue;
        }
        const tags = tagsByFile.get(filePath) ?? [];
        tags.push(tag);
        tagsByFile.set(filePath, tags);
      }
    });

    return tagsByFile;
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
    return html`<canvas
      id="currentCanvas"
      @wheel=${this.onCanvasWheel}
      @touchstart=${this.onCanvasTouchStart}
      @touchmove=${this.onCanvasTouchMove}
      @touchend=${this.onCanvasTouchEnd}
      @touchcancel=${this.onCanvasTouchEnd}
    ></canvas>`;
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
    this.thumbnailLoading = new Set(result.files);
    this.suggestedSets = [];
    this.suggestionBusy = false;
    this.suggestionError = "";
    this.mergedOutputPath = "";
    this.previewSettingsLabel = "";
    this.previousPreviewSettingsLabel = "";
    this.currentPreviewPath = "";
    this.previousPreviewPath = "";
    this.splitPercent = 50;
    this.disposeBitmaps();
    this.clearPreviewCanvases();

    void this.loadThumbnails(result.files, this.thumbnailLoadGeneration);
    void this.refreshSuggestedSets();
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
        this.thumbnailUrls = { ...this.thumbnailUrls, [filePath]: nextUrl };
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
    this.thumbnailLoading = new Set();
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
        this.previousBitmap = await this.loadPreviewBitmap(
          this.previousPreviewPath,
        );
      } else {
        this.currentPreviewPath = previewPath;
        this.previewSettingsLabel = settingsLabel;
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
        this.currentBitmap = await this.loadPreviewBitmap(this.currentPreviewPath);
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
      ? this.currentBitmap ?? this.previousBitmap
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
    this.clampPan(width, height);
    context.clearRect(0, 0, width, height);
    context.save();
    context.setTransform(
      this.zoomScale,
      0,
      0,
      this.zoomScale,
      this.panX,
      this.panY,
    );

    if (splitMode && this.previousBitmap && this.currentBitmap) {
      const splitX = Math.round((width * this.splitPercent) / 100);
      context.drawImage(
        this.previousBitmap,
        0,
        0,
        splitX,
        height,
        0,
        0,
        splitX,
        height,
      );
      context.drawImage(
        this.currentBitmap,
        splitX,
        0,
        width - splitX,
        height,
        splitX,
        0,
        width - splitX,
        height,
      );
      context.restore();
      this.drawSplitGuide(context, splitX, width, height);
      return;
    }

    context.drawImage(displayBitmap, 0, 0);
    context.restore();
  }

  private onSplitPercentInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    const value = Number(target.value);
    if (!Number.isFinite(value)) {
      return;
    }

    this.splitPercent = Math.min(97, Math.max(3, value));
    void this.renderPreviewIfPossible();
  }

  private drawSplitGuide(
    context: CanvasRenderingContext2D,
    splitX: number,
    width: number,
    height: number,
  ): void {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.strokeStyle = "rgba(255, 255, 255, 0.9)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(splitX + 0.5, 0);
    context.lineTo(splitX + 0.5, height);
    context.stroke();

    context.fillStyle = "rgba(255, 255, 255, 0.95)";
    context.font = "bold 14px Inter, system-ui, sans-serif";
    context.textBaseline = "top";
    context.textAlign = "left";
    context.fillText("A", 10, 10);
    context.textAlign = "right";
    context.fillText("B", width - 10, 10);
    context.restore();
  }

  private onCanvasWheel(event: WheelEvent): void {
    if (!event.ctrlKey) {
      return;
    }

    event.preventDefault();
    if (!this.currentCanvas) {
      return;
    }

    const rect = this.currentCanvas.getBoundingClientRect();
    const focalX =
      ((event.clientX - rect.left) * this.currentCanvas.width) / rect.width;
    const focalY =
      ((event.clientY - rect.top) * this.currentCanvas.height) / rect.height;
    const zoomFactor = Math.exp(-event.deltaY * 0.0025);
    this.applyZoomAtPoint(focalX, focalY, this.zoomScale * zoomFactor);
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

      const nextScale =
        this.pinchState.startScale * (distance / this.pinchState.startDistance);
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
    if (!this.currentCanvas) {
      return { x: 0, y: 0 };
    }

    const rect = this.currentCanvas.getBoundingClientRect();
    return {
      x: ((touch.clientX - rect.left) * this.currentCanvas.width) / rect.width,
      y: ((touch.clientY - rect.top) * this.currentCanvas.height) / rect.height,
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
