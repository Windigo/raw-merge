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

interface Window {
  hdrApi: {
    listHdrFiles: () => Promise<HdrListResponse>;
    listHdrFilesInFolder: (folder: string) => Promise<HdrListResponse>;
    pickFolder: () => Promise<HdrListResponse | null>;
    pickFiles: () => Promise<HdrListResponse | null>;
    readHdrFile: (fileName: string) => Promise<Uint8Array>;
    getRawThumbnail: (filePath: string) => Promise<Uint8Array>;
    mergeRawToHdr: (
      filePaths: string[],
      options?: MergeOptions,
    ) => Promise<MergeRawResponse>;
  };
}

declare module "parse-hdr" {
  type ParsedHdr = {
    shape: [number, number];
    exposure: number;
    gamma: number;
    data: Float32Array;
  };

  function parseHdr(buffer: ArrayBuffer): ParsedHdr;

  export default parseHdr;
}
