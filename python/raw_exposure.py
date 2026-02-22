#!/usr/bin/env python3
import json
import subprocess
import sys

import rawpy


def _read_with_mdls(path: str) -> float | None:
    try:
        result = subprocess.run(
            ["mdls", "-name", "kMDItemExposureTimeSeconds", "-raw", path],
            check=False,
            capture_output=True,
            text=True,
        )
    except Exception:
        return None

    if result.returncode != 0:
        return None

    raw_value = (result.stdout or "").strip()
    if not raw_value or raw_value == "(null)":
        return None

    try:
        value = float(raw_value)
    except Exception:
        return None

    if value <= 0:
        return None

    return value


def read_exposure_seconds(path: str) -> float | None:
    try:
        with rawpy.imread(path) as raw:
            metadata = getattr(raw, "metadata", None)
            shutter = getattr(metadata, "shutter", None) if metadata is not None else None
    except Exception:
        shutter = None

    if shutter is not None:
        try:
            value = float(shutter)
        except Exception:
            value = None
        if value is not None and value > 0:
            return value

    return _read_with_mdls(path)


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"seconds": None}))
        return 0

    file_path = sys.argv[1]
    seconds = read_exposure_seconds(file_path)
    print(json.dumps({"seconds": seconds}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
