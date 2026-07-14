#!/usr/bin/env python3
"""Create a vanilla Three.js asset viewer from the packaged skill scaffold."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import socket
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
PACKAGE_MANAGERS = ("npm", "pnpm", "yarn", "bun")
LOCKFILES = {
    "package-lock.json": "npm",
    "npm-shrinkwrap.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
    "bun.lock": "bun",
    "bun.lockb": "bun",
}


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


def ancestors(start: Path) -> list[Path]:
    resolved = start.resolve()
    return [resolved, *resolved.parents]


def read_json(path: Path, label: str) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f"{label} is not valid JSON: {path}\n{error}") from error
    if not isinstance(value, dict):
        raise SystemExit(f"{label} must contain a JSON object: {path}")
    return value


def package_manager_from_package_json(path: Path) -> str | None:
    package_json = path / "package.json"
    if not package_json.exists():
        return None
    value = read_json(package_json, "package.json").get("packageManager")
    if not isinstance(value, str):
        return None
    manager = value.split("@", 1)[0]
    return manager if manager in PACKAGE_MANAGERS else None


def package_manager_from_lockfiles(path: Path) -> str | None:
    managers = {
        manager for filename, manager in LOCKFILES.items() if (path / filename).exists()
    }
    if len(managers) > 1:
        names = ", ".join(sorted(managers))
        raise SystemExit(f"Conflicting lockfile families in {path}: {names}")
    return next(iter(managers), None)


def find_launch_path(target: Path) -> Path:
    for directory in ancestors(target.parent):
        candidate = directory / ".claude" / "launch.json"
        if candidate.exists():
            return candidate
    return target.parent.resolve() / ".claude" / "launch.json"


def read_launch_config(path: Path) -> dict:
    if not path.exists():
        return {"version": "0.0.1", "configurations": []}
    launch = read_json(path, ".claude/launch.json")
    configurations = launch.get("configurations", [])
    if not isinstance(configurations, list) or not all(
        isinstance(item, dict) for item in configurations
    ):
        raise SystemExit(
            f".claude/launch.json configurations must be an array of objects: {path}"
        )
    launch["configurations"] = configurations
    return launch


def package_manager_from_launch(launch: dict) -> str | None:
    managers = {
        item.get("runtimeExecutable")
        for item in launch.get("configurations", [])
        if item.get("runtimeExecutable") in PACKAGE_MANAGERS
    }
    return next(iter(managers)) if len(managers) == 1 else None


def detect_package_manager(target: Path, requested: str, launch: dict) -> str:
    detected: str | None = None
    detection_source: str | None = None
    for directory in ancestors(target.parent):
        package_manager = package_manager_from_package_json(directory)
        if package_manager:
            detected = package_manager
            detection_source = f"packageManager in {directory / 'package.json'}"
            break
    if not detected:
        for directory in ancestors(target.parent):
            package_manager = package_manager_from_lockfiles(directory)
            if package_manager:
                detected = package_manager
                detection_source = f"lockfile in {directory}"
                break
    if not detected:
        detected = package_manager_from_launch(launch)
        if detected:
            detection_source = ".claude/launch.json"
    detected = detected or "npm"

    if requested != "auto" and requested != detected and detection_source:
        raise SystemExit(
            f"--package-manager {requested} conflicts with {detection_source} ({detected}). "
            "Use the detected manager to avoid creating another lockfile family."
        )
    return detected if requested == "auto" else requested


def port_is_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as candidate:
        candidate.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            candidate.bind(("127.0.0.1", port))
        except OSError:
            return False
    return True


def allocate_port(launch: dict, project_name: str, preferred: int) -> int:
    declared = {
        item.get("port")
        for item in launch.get("configurations", [])
        if item.get("name") != project_name and isinstance(item.get("port"), int)
    }
    for port in range(preferred, 65536):
        if port not in declared and port_is_available(port):
            return port
    raise SystemExit(f"No available port found at or above {preferred}.")


def rewrite_vite_port(path: Path, port: int) -> None:
    contents = path.read_text(encoding="utf-8")
    updated, count = re.subn(
        r'(server:\s*\{[\s\S]*?\bport:\s*)\d+',
        rf"\g<1>{port}",
        contents,
        count=1,
    )
    if count != 1:
        raise SystemExit(f"Could not set the Vite server port in {path}")
    path.write_text(updated, encoding="utf-8")


def launch_runtime_args(manager: str, project_path: str) -> list[str]:
    if manager == "npm":
        return ["--prefix", project_path, "run", "dev"]
    if manager == "pnpm":
        return ["--dir", project_path, "dev"]
    if manager == "yarn":
        return ["--cwd", project_path, "dev"]
    return ["--cwd", project_path, "run", "dev"]


def register_launch(
    path: Path,
    launch: dict,
    target: Path,
    project_name: str,
    manager: str,
    port: int,
) -> None:
    root = path.parent.parent.resolve()
    try:
        project_path = target.resolve().relative_to(root).as_posix()
    except ValueError:
        project_path = target.resolve().as_posix()
    entry = {
        "name": project_name,
        "runtimeExecutable": manager,
        "runtimeArgs": launch_runtime_args(manager, project_path),
        "port": port,
    }
    configurations = launch["configurations"]
    for index, current in enumerate(configurations):
        if current.get("name") == project_name:
            configurations[index] = entry
            break
    else:
        configurations.append(entry)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(launch, indent=2) + "\n", encoding="utf-8")


def install_command(manager: str) -> str:
    return "npm install" if manager == "npm" else f"{manager} install"


def dev_command(manager: str) -> str:
    return "npm run dev" if manager == "npm" else f"{manager} dev"


def create_asset_viewer(
    target: Path,
    force: bool,
    package_manager: str,
    preferred_port: int,
) -> None:
    source = scaffold_dir()
    if not source.is_dir():
        raise SystemExit(f"Scaffold not found: {source}")

    if target.exists() and any(target.iterdir()) and not force:
        raise SystemExit(
            f"Target is not empty: {target}\nUse --force to copy into it anyway."
        )

    launch_path = find_launch_path(target)
    launch = read_launch_config(launch_path)
    project_name = normalized_project_name(target)
    manager = detect_package_manager(target, package_manager, launch)
    port = allocate_port(launch, project_name, preferred_port)

    target.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target, dirs_exist_ok=True, ignore=ignore)
    rewrite_json_name(target / "package.json", project_name)
    rewrite_vite_port(target / "vite.config.ts", port)
    register_launch(launch_path, launch, target, project_name, manager, port)

    print(f"Created Three.js asset viewer at {target.resolve()}")
    print(f"Registered {project_name} on port {port} in {launch_path}")
    print(f"Next: edit {target / 'src/asset-manifest.ts'}")
    print(
        f"Then: cd {target} && {install_command(manager)} && {dev_command(manager)}"
    )


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
    parser.add_argument(
        "--package-manager",
        choices=("auto", *PACKAGE_MANAGERS),
        default="auto",
        help="Package manager to use. auto detects the surrounding workspace.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=5190,
        help="Preferred Vite dev port. The next available undeclared port is used.",
    )
    args = parser.parse_args(argv)

    if args.port < 1024 or args.port > 65535:
        parser.error("--port must be between 1024 and 65535")

    create_asset_viewer(
        Path(args.target),
        args.force,
        args.package_manager,
        args.port,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
