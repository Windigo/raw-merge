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
};

type MergeOptions = {
  colorSpace?: "srgb" | "adobe" | "wide" | "prophoto" | "xyz" | "raw";
  baseFrame?: "middle" | "darkest" | "brightest";
};

const api = {
  listHdrFiles: (): Promise<HdrListResponse> =>
    ipcRenderer.invoke("hdr:listFiles"),
  pickFolder: (): Promise<HdrListResponse | null> =>
    ipcRenderer.invoke("hdr:pickFolder"),
  pickFiles: (): Promise<HdrListResponse | null> =>
    ipcRenderer.invoke("hdr:pickFiles"),
  readHdrFile: (fileName: string): Promise<Uint8Array> =>
    ipcRenderer.invoke("hdr:readFile", fileName),
  mergeRawToHdr: (
    filePaths: string[],
    options?: MergeOptions,
  ): Promise<MergeRawResponse> =>
    ipcRenderer.invoke("hdr:mergeRawToHdr", filePaths, options),
};

contextBridge.exposeInMainWorld("hdrApi", api);
