#!/usr/bin/env python3
import argparse
import json
import os
from typing import List, Tuple

os.environ.setdefault("OPENCV_IO_ENABLE_OPENEXR", "1")

import cv2
import numpy as np
import rawpy


def resolve_color_space(name: str):
    normalized = name.strip().lower()
    candidates = {
        "srgb": ["sRGB", "SRGB", "srgb"],
        "adobe": ["Adobe", "ADOBE", "AdobeRGB", "adobe"],
        "wide": ["Wide", "WIDE", "wide"],
        "prophoto": ["ProPhoto", "PROPHOTO", "prophoto"],
        "xyz": ["XYZ", "xyz"],
        "raw": ["raw", "Raw", "RAW"],
    }
    names = candidates.get(normalized, candidates["srgb"])

    for candidate in names:
        value = getattr(rawpy.ColorSpace, candidate, None)
        if value is not None:
            return value

    fallback = getattr(rawpy.ColorSpace, "sRGB", None)
    if fallback is None:
        raise RuntimeError("Could not resolve rawpy ColorSpace enum.")
    return fallback


def decode_raw(path: str, color_space: str) -> np.ndarray:
    output_color = resolve_color_space(color_space)
    with rawpy.imread(path) as raw:
        rgb = raw.postprocess(
            output_bps=8,
            gamma=(1, 1),
            no_auto_bright=True,
            use_camera_wb=True,
            output_color=output_color,
            demosaic_algorithm=rawpy.DemosaicAlgorithm.AHD,
        )
    return rgb


def read_exposure_seconds(path: str) -> float:
    try:
        with rawpy.imread(path) as raw:
            metadata = getattr(raw, "metadata", None)
            exposure = getattr(metadata, "shutter", None) if metadata is not None else None
    except Exception:
        exposure = None

    if exposure is None:
        return 1.0

    try:
        exposure_value = float(exposure)
    except Exception:
        exposure_value = 1.0

    if not np.isfinite(exposure_value) or exposure_value <= 0:
        return 1.0

    return exposure_value


def infer_exposures_from_brightness(images: List[np.ndarray]) -> np.ndarray:
    brightness_values: List[float] = []
    for image in images:
        float_image = image.astype(np.float32)
        brightness_values.append(float(np.mean(float_image)))

    values = np.asarray(brightness_values, dtype=np.float32)
    values = np.clip(values, 1e-6, None)
    normalized = values / np.min(values)
    return normalized.astype(np.float32)


def normalize_hdr_luminance(hdr_rgb: np.ndarray) -> np.ndarray:
    hdr = np.clip(hdr_rgb.astype(np.float32), 0.0, None)
    luminance = (
        0.2126 * hdr[:, :, 0] + 0.7152 * hdr[:, :, 1] + 0.0722 * hdr[:, :, 2]
    )

    valid = luminance[np.isfinite(luminance) & (luminance > 0)]
    if valid.size == 0:
        return hdr

    log_avg = float(np.exp(np.mean(np.log(valid + 1e-6))))
    scale = 0.18 / max(log_avg, 1e-6)
    return hdr * scale


def tonemap_preview_ldr(hdr_rgb: np.ndarray) -> np.ndarray:
    hdr = np.clip(hdr_rgb.astype(np.float32), 0.0, None)
    mapped = hdr / (1.0 + hdr)
    srgb = np.where(
        mapped <= 0.0031308,
        mapped * 12.92,
        1.055 * np.power(mapped, 1.0 / 2.4) - 0.055,
    )
    srgb = np.clip(srgb, 0.0, 1.0)
    return (srgb * 255.0).astype(np.uint8)


def get_base_index(images: List[np.ndarray], base_frame: str) -> int:
    if base_frame == "middle":
        return len(images) // 2

    means = [float(np.mean(img.astype(np.float32))) for img in images]
    if base_frame == "darkest":
        return int(np.argmin(means))
    if base_frame == "brightest":
        return int(np.argmax(means))

    return len(images) // 2


def merge_to_hdr(
    file_paths: List[str],
    output_path: str,
    preview_path: str | None,
    color_space: str,
    base_frame: str,
) -> Tuple[int, int]:
    images: List[np.ndarray] = []
    exposures: List[float] = []

    for file_path in file_paths:
        image = decode_raw(file_path, color_space)
        images.append(image)
        exposures.append(read_exposure_seconds(file_path))

    first_h, first_w = images[0].shape[:2]
    for image in images:
        if image.shape[0] != first_h or image.shape[1] != first_w:
            raise ValueError("All selected RAW images must have the same resolution")

    aligned = images

    times = np.array(exposures, dtype=np.float32)
    if np.allclose(times, times[0]):
        times = infer_exposures_from_brightness(aligned)

    base_index = get_base_index(aligned, base_frame)
    base_time = max(float(times[base_index]), 1e-6)
    times = times / base_time

    merge_debevec = cv2.createMergeDebevec()
    hdr_rgb = merge_debevec.process(aligned, times=times)
    hdr_rgb = normalize_hdr_luminance(hdr_rgb)

    hdr_bgr_for_cv = cv2.cvtColor(hdr_rgb, cv2.COLOR_RGB2BGR)

    ok = cv2.imwrite(output_path, hdr_bgr_for_cv)
    if not ok:
        raise RuntimeError(f"Failed to write OpenEXR output: {output_path}")

    if preview_path:
        preview_rgb = tonemap_preview_ldr(hdr_rgb)
        preview_bgr = cv2.cvtColor(preview_rgb, cv2.COLOR_RGB2BGR)
        preview_ok = cv2.imwrite(preview_path, preview_bgr)
        if not preview_ok:
            raise RuntimeError(f"Failed to write preview output: {preview_path}")

    return first_w, first_h


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge RAW files into OpenEXR (.exr)")
    parser.add_argument("--output", required=True, help="Output .exr path")
    parser.add_argument("--preview", required=False, help="Optional preview image path (e.g. .png)")
    parser.add_argument(
        "--color-space",
        required=False,
        default="srgb",
        choices=["srgb", "adobe", "wide", "prophoto", "xyz", "raw"],
        help="RAW decode output color space",
    )
    parser.add_argument(
        "--base-frame",
        required=False,
        default="middle",
        choices=["middle", "darkest", "brightest"],
        help="Reference frame used to anchor exposure scale",
    )
    parser.add_argument("files", nargs="+", help="Input RAW files (.cr2, .cr3, ...)" )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    file_paths = [os.path.abspath(path) for path in args.files]
    output_path = os.path.abspath(args.output)
    preview_path = os.path.abspath(args.preview) if args.preview else None
    color_space = args.color_space
    base_frame = args.base_frame

    if not output_path.lower().endswith(".exr"):
        raise ValueError("Output path must end with .exr")

    if len(file_paths) < 2:
        raise ValueError("Need at least two RAW files")

    width, height = merge_to_hdr(
        file_paths,
        output_path,
        preview_path,
        color_space,
        base_frame,
    )
    print(
        json.dumps(
            {
                "outputPath": output_path,
                "previewPath": preview_path,
                "width": width,
                "height": height,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())