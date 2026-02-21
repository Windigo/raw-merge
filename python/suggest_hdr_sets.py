#!/usr/bin/env python3
import argparse
import json
import os
from dataclasses import dataclass
from typing import List


@dataclass
class RawFileInfo:
    path: str
    name: str
    mtime: float


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Suggest RAW file groups for HDR merge")
    parser.add_argument("files", nargs="*", help="Input RAW file paths")
    parser.add_argument("--max-gap", type=float, default=30.0, help="Max seconds between files in a set")
    parser.add_argument("--min-size", type=int, default=2, help="Minimum files per suggested set")
    return parser.parse_args()


def common_alpha_prefix(names: List[str]) -> str:
    if not names:
        return ""

    def alpha_head(text: str) -> str:
        stem = os.path.splitext(text)[0]
        out = []
        for char in stem:
            if char.isdigit():
                break
            out.append(char)
        return "".join(out).strip("-_ ")

    heads = [alpha_head(name).lower() for name in names]
    first = heads[0]
    if not first:
        return ""

    prefix = first
    for head in heads[1:]:
        limit = min(len(prefix), len(head))
        index = 0
        while index < limit and prefix[index] == head[index]:
            index += 1
        prefix = prefix[:index]
        if not prefix:
            break

    return prefix.strip("-_ ")


def to_info(file_paths: List[str]) -> List[RawFileInfo]:
    result: List[RawFileInfo] = []
    for file_path in file_paths:
        absolute = os.path.abspath(file_path)
        try:
            stat = os.stat(absolute)
        except OSError:
            continue
        result.append(
            RawFileInfo(
                path=absolute,
                name=os.path.basename(absolute),
                mtime=float(stat.st_mtime),
            )
        )

    result.sort(key=lambda item: (item.mtime, item.name.lower()))
    return result


def split_by_time(infos: List[RawFileInfo], max_gap: float) -> List[List[RawFileInfo]]:
    groups: List[List[RawFileInfo]] = []
    current: List[RawFileInfo] = []

    for info in infos:
        if not current:
            current.append(info)
            continue

        gap = info.mtime - current[-1].mtime
        if gap <= max_gap:
            current.append(info)
        else:
            groups.append(current)
            current = [info]

    if current:
        groups.append(current)

    return groups


def confidence_from_score(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.55:
        return "medium"
    return "low"


def score_group(group: List[RawFileInfo], max_gap: float) -> float:
    if not group:
        return 0.0

    count = len(group)
    size_score = min(1.0, max(0.0, (count - 2) / 4.0))

    if count > 1:
        gaps = [group[index].mtime - group[index - 1].mtime for index in range(1, count)]
        avg_gap = sum(gaps) / len(gaps)
        gap_score = max(0.0, min(1.0, 1.0 - (avg_gap / max(max_gap, 0.1))))
    else:
        gap_score = 0.0

    prefix = common_alpha_prefix([item.name for item in group])
    prefix_score = 1.0 if len(prefix) >= 3 else (0.5 if prefix else 0.0)

    score = 0.35 + 0.30 * size_score + 0.20 * gap_score + 0.15 * prefix_score
    return max(0.0, min(1.0, score))


def label_for_group(group: List[RawFileInfo], confidence: str) -> str:
    if not group:
        return ""

    first = group[0].name
    last = group[-1].name
    count = len(group)
    if first == last:
        return f"{count} files around {first} ({confidence})"
    return f"{count} files: {first} → {last} ({confidence})"


def suggest_sets(file_paths: List[str], max_gap: float, min_size: int) -> list:
    infos = to_info(file_paths)
    if not infos:
        return []

    groups = split_by_time(infos, max_gap=max_gap)
    suggestions = []

    index = 1
    for group in groups:
        if len(group) < min_size:
            continue

        score = score_group(group, max_gap=max_gap)
        confidence = confidence_from_score(score)
        suggestions.append(
            {
                "id": f"set-{index}",
                "label": label_for_group(group, confidence),
                "count": len(group),
                "confidence": confidence,
                "score": round(score, 3),
                "files": [item.path for item in group],
            }
        )
        index += 1

    suggestions.sort(key=lambda item: (-item["score"], -item["count"], item["id"]))

    if suggestions:
        return suggestions

    if len(infos) < min_size:
        return []

    fallback_size = min(max(min_size, 2), min(5, len(infos)))
    best_start = 0
    best_span = float("inf")
    for start in range(0, len(infos) - fallback_size + 1):
        window = infos[start : start + fallback_size]
        span = window[-1].mtime - window[0].mtime
        if span < best_span:
            best_span = span
            best_start = start

    fallback_group = infos[best_start : best_start + fallback_size]
    score = max(0.4, score_group(fallback_group, max_gap=max_gap) * 0.85)
    confidence = confidence_from_score(score)
    return [
        {
            "id": "set-fallback",
            "label": f"Fallback set: {fallback_group[0].name} → {fallback_group[-1].name} ({confidence})",
            "count": len(fallback_group),
            "confidence": confidence,
            "score": round(score, 3),
            "files": [item.path for item in fallback_group],
        }
    ]


def main() -> int:
    args = parse_args()
    suggestions = suggest_sets(args.files, max_gap=float(args.max_gap), min_size=int(args.min_size))
    print(json.dumps({"sets": suggestions}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
