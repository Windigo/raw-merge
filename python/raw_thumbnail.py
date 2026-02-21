#!/usr/bin/env python3
import argparse
import os
import sys

os.environ.setdefault("OPENCV_IO_ENABLE_OPENEXR", "1")

import cv2
import rawpy


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate PNG thumbnail from RAW")
    parser.add_argument("input", help="Input RAW file path")
    parser.add_argument("--max-size", type=int, default=80, help="Max thumbnail edge")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = os.path.abspath(args.input)
    max_size = max(16, int(args.max_size))

    with rawpy.imread(input_path) as raw:
        rgb = raw.postprocess(
            output_bps=8,
            no_auto_bright=True,
            use_camera_wb=True,
            gamma=(1, 1),
            demosaic_algorithm=rawpy.DemosaicAlgorithm.AHD,
        )

    height, width = rgb.shape[:2]
    scale = min(max_size / max(width, 1), max_size / max(height, 1), 1.0)
    resized = cv2.resize(
        rgb,
        (max(1, int(round(width * scale))), max(1, int(round(height * scale)))),
        interpolation=cv2.INTER_AREA,
    )

    bgr = cv2.cvtColor(resized, cv2.COLOR_RGB2BGR)
    ok, encoded = cv2.imencode(".png", bgr)
    if not ok:
        raise RuntimeError("Failed to encode thumbnail PNG")

    sys.stdout.buffer.write(encoded.tobytes())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
