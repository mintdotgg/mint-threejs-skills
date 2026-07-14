#!/usr/bin/env python3
"""Create a vanilla Three.js asset viewer from the packaged skill scaffold."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path


EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    "artifacts",
    "test-results",
    "playwright-report",
    "coverage",
    "__pycache__",
}
EXCLUDE_FILES = {".DS_Store"}


def skill_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def scaffold_dir() -> Path:
    return skill_dir() / "assets" / "threejs-vite-asset-viewer"


def normalized_project_name(target: Path) -> str:
    name = re.sub(r"[^a-z0-9._-]+", "-", target.resolve().name.lower()).strip("-")
    return name or "threejs-vite-asset-viewer"


def ignore(_directory: str, names: list[str]) -> set[str]:
    return {
        name
        for name in names
        if name in EXCLUDE_DIRS or name in EXCLUDE_FILES
    }


def rewrite_json_name(path: Path, name: str) -> None:
    if not path.exists():
        return
    data = json.loads(path.read_text(encoding="utf-8"))
    data["name"] = name
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def create_asset_viewer(target: Path, force: bool) -> None:
    source = scaffold_dir()
    if not source.is_dir():
        raise SystemExit(f"Scaffold not found: {source}")

    if target.exists() and any(target.iterdir()) and not force:
        raise SystemExit(
            f"Target is not empty: {target}\nUse --force to copy into it anyway."
        )

    target.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target, dirs_exist_ok=True, ignore=ignore)
    rewrite_json_name(target / "package.json", normalized_project_name(target))

    print(f"Created Three.js asset viewer at {target.resolve()}")
    print(f"Next: edit {target / 'src/asset-manifest.ts'}")
    print(f"Then: cd {target} && pnpm install && pnpm dev")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Create a Vite + TypeScript + vanilla Three.js viewer for a Mint model, "
            "animated model, model pack, material, material pack, or RAD world."
        )
    )
    parser.add_argument("target", help="Target directory to create or populate.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Copy into a non-empty target directory.",
    )
    args = parser.parse_args(argv)

    create_asset_viewer(Path(args.target), args.force)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
