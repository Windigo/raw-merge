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

interface Window {
  hdrApi: {
    listHdrFiles: () => Promise<HdrListResponse>;
    listHdrFilesInFolder: (folder: string) => Promise<HdrListResponse>;
    pickFolder: () => Promise<HdrListResponse | null>;
    pickFiles: () => Promise<HdrListResponse | null>;
    readHdrFile: (fileName: string) => Promise<Uint8Array>;
    getRawThumbnail: (filePath: string) => Promise<Uint8Array>;
    getRawExposure: (filePath: string) => Promise<number | null>;
    suggestSets: (
      filePaths: string[],
      options?: SuggestOptions,
    ) => Promise<SuggestedSet[]>;
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
