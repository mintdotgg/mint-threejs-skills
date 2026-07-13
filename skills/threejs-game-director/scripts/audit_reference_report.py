#!/usr/bin/env python3
"""Audit a Three.js game director evidence report."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


BASE_REQUIRED = [
    "files changed",
    "controls",
    "verification",
    "remaining risks",
]

DESIGN_REQUIRED = [
    "game design brief",
    "core loop",
    "level/encounter plan",
]

PHYSICS_REQUIRED = [
    "physics engine",
    "timestep",
    "collider",
]

PREMIUM_SCORECARD = [
    "art direction",
    "hero/player",
    "obstacles/enemies",
    "rewards/interactables",
    "world/environment",
    "materials/textures",
    "lighting/render",
    "vfx/motion",
    "ui/hud",
    "performance evidence",
    "measured evidence",
    "fresh-eyes review",
    "average",
    "automatic failures",
]

PREMIUM_TECHNICAL_ART = [
    "technical art",
    "render budget",
    "vfx readability",
]

PREMIUM_PROCESS = [
    "mint mcp",
    "visual test harness",
]

VERIFICATION_REQUIRED = [
    "build",
    "console",
    "page error",
    "desktop",
    "screenshot",
    "canvas",
    "pixel",
]

ASSET_OUTPUT_PATTERNS = [
    re.compile(
        r"\b[\w./-]*assets/(models|concepts|textures|ui|images|audio)/"
        r"[\w./-]+\.(glb|gltf|fbx|png|jpg|jpeg|webp|mp3|wav|ogg|m4a)\b"
    ),
    re.compile(r"\b[\w./-]+\.(glb|gltf|fbx)\b"),
]

AUDIO_OUTPUT_PATTERNS = [
    re.compile(r"\b[\w./-]*assets/audio/[\w./-]+\.(mp3|wav|ogg|m4a)\b"),
]

MINT_BLOCKERS = [
    "mint mcp unavailable",
    "mint mcp blocker",
    "capability unavailable",
    "artifact retrieval unavailable",
    "generation failed",
    "offline-only",
    "offline only",
    "user requested procedural",
    "user provided asset",
]

AUDIO_BLOCKERS = MINT_BLOCKERS + [
    "audio blocker",
    "silent game",
    "user requested no audio",
]


def normalize(text: str) -> str:
    replacements = {
        "design brief": "game design brief",
        "gameplay brief": "game design brief",
        "playable loop": "core loop",
        "level plan": "level/encounter plan",
        "encounter plan": "level/encounter plan",
        "level and encounter plan": "level/encounter plan",
        "technical-art": "technical art",
        "render-budget": "render budget",
        "visual harness": "visual test harness",
        "screenshot baseline": "visual test harness",
        "page errors": "page error",
        "fresh eyes review": "fresh-eyes review",
        "fresh-eyes scorecard review": "fresh-eyes review",
        "independent reviewer scores": "fresh-eyes review",
        "adversarial self-review": "fresh-eyes review",
        "measured visual evidence": "measured evidence",
        "inspector metrics": "measured evidence",
    }
    normalized = text.lower()
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return re.sub(r"\s+", " ", normalized)


def missing_markers(text: str, markers: list[str]) -> list[str]:
    missing: list[str] = []
    for marker in markers:
        prefix = r"\b" if marker[0].isalnum() else ""
        suffix = r"\b" if marker[-1].isalnum() else ""
        if not re.search(prefix + re.escape(marker) + suffix, text):
            missing.append(marker)
    return missing


def matches_any(text: str, patterns: list[re.Pattern[str]]) -> bool:
    return any(pattern.search(text) for pattern in patterns)


def contains_any(text: str, markers: list[str]) -> bool:
    return any(marker in text for marker in markers)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check a Three.js game report for required outcome evidence."
    )
    parser.add_argument("report", help="Markdown or text report to audit.")
    parser.add_argument(
        "--premium",
        action="store_true",
        help="Require premium scorecard, technical-art, Mint, and visual evidence.",
    )
    parser.add_argument(
        "--physics",
        action="store_true",
        help="Require physics engine, timestep, and collider evidence.",
    )
    parser.add_argument(
        "--audio",
        action="store_true",
        help="Require integrated audio evidence or an explicit blocker.",
    )
    parser.add_argument(
        "--no-design",
        action="store_true",
        help="Skip design evidence for debug, performance, or QA-only work.",
    )
    args = parser.parse_args()

    report_path = Path(args.report)
    if not report_path.is_file():
        print(f"Missing report file: {report_path}", file=sys.stderr)
        return 1

    text = normalize(report_path.read_text(encoding="utf-8"))
    missing = missing_markers(text, BASE_REQUIRED)

    if not args.no_design:
        missing.extend(missing_markers(text, DESIGN_REQUIRED))

    if args.premium:
        missing.extend(missing_markers(text, PREMIUM_SCORECARD))
        missing.extend(missing_markers(text, PREMIUM_TECHNICAL_ART))
        missing.extend(missing_markers(text, PREMIUM_PROCESS))
        missing.extend(missing_markers(text, VERIFICATION_REQUIRED))
        has_asset = matches_any(text, ASSET_OUTPUT_PATTERNS)
        has_blocker = contains_any(text, MINT_BLOCKERS)
        if not has_asset and not has_blocker:
            missing.append("integrated Mint artifact path or explicit Mint MCP blocker")

    if args.physics:
        missing.extend(missing_markers(text, PHYSICS_REQUIRED))

    if args.audio:
        has_audio = matches_any(text, AUDIO_OUTPUT_PATTERNS)
        has_blocker = contains_any(text, AUDIO_BLOCKERS)
        if not has_audio and not has_blocker:
            missing.append("integrated audio asset path or explicit audio blocker")

    if missing:
        print("Director report audit failed. Missing evidence:")
        for marker in dict.fromkeys(missing):
            print(f"- {marker}")
        return 1

    print("Director report audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
