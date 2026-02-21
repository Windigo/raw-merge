import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";

@customElement("hdr-merge-app")
class HdrMergeApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
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
      grid-template-columns: 380px 1fr;
      gap: 20px;
      align-items: start;
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

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
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

    ul {
      list-style: none;
      margin: 12px 0 0;
      padding: 0;
      max-height: 540px;
      overflow: auto;
      border-top: 1px solid #374151;
    }

    li {
      border-bottom: 1px solid #374151;
      padding: 8px 0;
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
    }

    canvas {
      width: 100%;
      border: 1px solid #374151;
      border-radius: 12px;
      background: #030712;
    }

    .error {
      margin-top: 10px;
      color: #fca5a5;
      font-size: 13px;
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
  private colorSpace: "srgb" | "adobe" | "wide" | "prophoto" | "xyz" | "raw" =
    "srgb";

  @state()
  private baseFrame: "middle" | "darkest" | "brightest" = "middle";

  @state()
  private previewSettingsLabel = "";

  @state()
  private previousPreviewSettingsLabel = "";

  @state()
  private compareMode = false;

  @state()
  private splitPercent = 50;

  private currentPreviewPath = "";
  private previousPreviewPath = "";

  private currentCanvas?: HTMLCanvasElement;
  private currentBitmap?: ImageBitmap;
  private previousBitmap?: ImageBitmap;

  private getApi() {
    if (!window.hdrApi) {
      throw new Error(
        "Renderer bridge not available. Restart the app and ensure preload is loaded.",
      );
    }
    return window.hdrApi;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void this.refreshFiles();
  }

  render() {
    return html`
      <div class="layout">
        <section class="panel">
          <h1 class="title">RAW files for HDR merge</h1>
          <p class="subtitle">
            ${this.folderPath || "Current folder loading..."}
          </p>

          <div class="actions">
            <button @click=${this.refreshFiles} ?disabled=${this.isBusy}>
              Refresh
            </button>
            <button @click=${this.selectFolder} ?disabled=${this.isBusy}>
              Select Folder
            </button>
            <button @click=${this.selectFiles} ?disabled=${this.isBusy}>
              Select Files
            </button>
            <button
              @click=${this.mergeSelected}
              ?disabled=${this.isBusy || this.selected.size < 2}
            >
              Merge RAW → EXR
            </button>
            <button
              @click=${this.toggleCompareMode}
              ?disabled=${!this.previousPreviewPath}
            >
              ${this.compareMode ? "Single View" : "A/B View"}
            </button>
            <button
              @click=${this.swapAB}
              ?disabled=${!this.previousPreviewPath}
            >
              Swap A/B
            </button>
            <select
              .value=${this.colorSpace}
              @change=${this.onColorSpaceChange}
              ?disabled=${this.isBusy}
              aria-label="Output color space"
            >
              <option value="srgb">sRGB</option>
              <option value="adobe">Adobe RGB</option>
              <option value="wide">Wide</option>
              <option value="prophoto">ProPhoto</option>
              <option value="xyz">XYZ</option>
              <option value="raw">RAW</option>
            </select>
            <select
              .value=${this.baseFrame}
              @change=${this.onBaseFrameChange}
              ?disabled=${this.isBusy}
              aria-label="Base frame"
            >
              <option value="middle">Base: Middle</option>
              <option value="darkest">Base: Darkest</option>
              <option value="brightest">Base: Brightest</option>
            </select>
          </div>

          <ul>
            ${this.files.map(
              (filePath) => html`
                <li>
                  <label>
                    <input
                      type="checkbox"
                      .checked=${this.selected.has(filePath)}
                      @change=${(event: Event) =>
                        this.toggleFile(filePath, event)}
                    />
                    <span>${this.fileName(filePath)}</span>
                  </label>
                </li>
              `,
            )}
          </ul>

          ${this.mergedOutputPath
            ? html`<p class="subtitle">Saved EXR: ${this.mergedOutputPath}</p>`
            : ""}
          ${this.previewSettingsLabel
            ? html`<p class="subtitle">
                Preview settings: ${this.previewSettingsLabel}
              </p>`
            : ""}
          ${this.error ? html`<p class="error">${this.error}</p>` : ""}
        </section>

        <section class="viewer">
          ${this.compareMode && this.previousPreviewPath
            ? html`
                <div class="panel">
                  <h2 class="title">A/B Split Preview</h2>
                  <p class="subtitle">
                    Left: ${this.previousPreviewSettingsLabel} | Right:
                    ${this.previewSettingsLabel}
                  </p>
                  <canvas id="currentCanvas"></canvas>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    .value=${String(this.splitPercent)}
                    @input=${this.onSplitChange}
                    ?disabled=${this.isBusy}
                    aria-label="A/B split slider"
                  />
                </div>
              `
            : html`
                <div class="panel">
                  <h2 class="title">Merged preview</h2>
                  <p class="subtitle">${this.previewSettingsLabel}</p>
                  <canvas id="currentCanvas"></canvas>
                </div>
              `}
        </section>
      </div>
    `;
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
      const result = await this.getApi().listHdrFiles();
      this.folderPath = result.folder;
      this.files = result.files;
      this.selected = new Set(result.files);
      this.mergedOutputPath = "";
      this.previewSettingsLabel = "";
      this.previousPreviewSettingsLabel = "";
      this.currentPreviewPath = "";
      this.previousPreviewPath = "";
      this.disposeBitmaps();
      this.clearPreviewCanvases();
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
      const result = await this.getApi().pickFolder();
      if (!result) {
        return;
      }
      this.folderPath = result.folder;
      this.files = result.files;
      this.selected = new Set(result.files);
      this.mergedOutputPath = "";
      this.previewSettingsLabel = "";
      this.previousPreviewSettingsLabel = "";
      this.currentPreviewPath = "";
      this.previousPreviewPath = "";
      this.disposeBitmaps();
      this.clearPreviewCanvases();
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
      const result = await this.getApi().pickFiles();
      if (!result) {
        return;
      }
      this.folderPath = result.folder;
      this.files = result.files;
      this.selected = new Set(result.files);
      this.mergedOutputPath = "";
      this.previewSettingsLabel = "";
      this.previousPreviewSettingsLabel = "";
      this.currentPreviewPath = "";
      this.previousPreviewPath = "";
      this.disposeBitmaps();
      this.clearPreviewCanvases();
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

  private async mergeSelected(): Promise<void> {
    this.error = "";
    const targets = [...this.selected];
    if (targets.length < 2) {
      this.error = "Select at least two RAW files for HDR merge.";
      return;
    }

    this.isBusy = true;
    try {
      if (this.currentPreviewPath) {
        this.previousPreviewPath = this.currentPreviewPath;
        this.previousPreviewSettingsLabel = this.previewSettingsLabel;
        this.previousBitmap = this.currentBitmap;
      }

      const merged = await this.getApi().mergeRawToHdr(targets, {
        colorSpace: this.colorSpace,
        baseFrame: this.baseFrame,
      });
      this.mergedOutputPath = merged.outputPath;
      this.previewSettingsLabel = `Color ${this.colorSpace}, Base ${this.baseFrame}`;
      const previewPath = merged.previewPath ?? merged.outputPath;
      this.currentPreviewPath = previewPath;
      this.currentBitmap = await this.loadPreviewBitmap(
        this.currentPreviewPath,
      );

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

  private onColorSpaceChange(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    this.colorSpace = select.value as
      | "srgb"
      | "adobe"
      | "wide"
      | "prophoto"
      | "xyz"
      | "raw";
  }

  private onBaseFrameChange(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    this.baseFrame = select.value as "middle" | "darkest" | "brightest";
  }

  private async toggleCompareMode(): Promise<void> {
    this.compareMode = !this.compareMode;
    await this.updateComplete;
    await this.renderPreviewIfPossible();
  }

  private onSplitChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    this.splitPercent = Number(input.value);
    void this.renderPreviewIfPossible();
  }

  private async swapAB(): Promise<void> {
    if (!this.previousPreviewPath || !this.currentPreviewPath) {
      return;
    }

    [this.previousPreviewPath, this.currentPreviewPath] = [
      this.currentPreviewPath,
      this.previousPreviewPath,
    ];
    [this.previousPreviewSettingsLabel, this.previewSettingsLabel] = [
      this.previewSettingsLabel,
      this.previousPreviewSettingsLabel,
    ];
    [this.previousBitmap, this.currentBitmap] = [
      this.currentBitmap,
      this.previousBitmap,
    ];

    await this.updateComplete;
    await this.renderPreviewIfPossible();
  }

  private async loadPreviewBitmap(previewPath: string): Promise<ImageBitmap> {
    const bytes = await this.getApi().readHdrFile(previewPath);
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

    if (!this.currentBitmap && this.currentPreviewPath) {
      this.currentBitmap = await this.loadPreviewBitmap(
        this.currentPreviewPath,
      );
    }

    if (!this.currentBitmap) {
      return;
    }

    const width = this.currentBitmap.width;
    const height = this.currentBitmap.height;

    this.currentCanvas.width = width;
    this.currentCanvas.height = height;
    context.clearRect(0, 0, width, height);

    if (this.compareMode && this.previousPreviewPath) {
      if (!this.previousBitmap) {
        this.previousBitmap = await this.loadPreviewBitmap(
          this.previousPreviewPath,
        );
      }

      if (this.previousBitmap) {
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
        context.strokeStyle = "#f9fafb";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(splitX + 0.5, 0);
        context.lineTo(splitX + 0.5, height);
        context.stroke();
        return;
      }
    }

    context.drawImage(this.currentBitmap, 0, 0);
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
