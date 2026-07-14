import json
import re
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("create_threejs_asset_viewer.py")


class CreateThreejsAssetViewerTest(unittest.TestCase):
    def test_detects_npm_allocates_port_and_updates_launch_idempotently(self):
        with tempfile.TemporaryDirectory() as temporary:
            workspace = Path(temporary)
            launch_path = workspace / ".claude" / "launch.json"
            launch_path.parent.mkdir(parents=True)
            launch_path.write_text(
                json.dumps(
                    {
                        "version": "0.0.1",
                        "configurations": [
                            {
                                "name": "existing",
                                "runtimeExecutable": "npm",
                                "runtimeArgs": ["run", "dev"],
                                "port": 5190,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            target = workspace / "robot-viewer"

            first = subprocess.run(
                [str(SCRIPT), str(target), "--port", "5190"],
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn("npm install && npm run dev", first.stdout)
            vite_config = (target / "vite.config.ts").read_text()
            selected_port = int(
                re.search(r"server:\s*\{[\s\S]*?port:\s*(\d+)", vite_config).group(1)
            )
            self.assertNotEqual(selected_port, 5190)

            subprocess.run(
                [str(SCRIPT), str(target), "--force", "--port", "5190"],
                check=True,
                capture_output=True,
                text=True,
            )
            launch = json.loads(launch_path.read_text(encoding="utf-8"))
            entries = [
                entry
                for entry in launch["configurations"]
                if entry["name"] == "robot-viewer"
            ]
            self.assertEqual(len(entries), 1)
            self.assertEqual(entries[0]["runtimeExecutable"], "npm")
            self.assertEqual(entries[0]["port"], selected_port)
            self.assertEqual(
                entries[0]["runtimeArgs"],
                ["--prefix", "robot-viewer", "run", "dev"],
            )

            viewer_html = (target / "index.html").read_text(encoding="utf-8")
            viewer_main = (target / "src" / "main.ts").read_text(encoding="utf-8")
            viewer_styles = (target / "src" / "styles.css").read_text(
                encoding="utf-8"
            )
            self.assertIn('<dialog\n        id="details-dialog"', viewer_html)
            self.assertNotIn('<aside id="details-panel"', viewer_html)
            self.assertIn("this.detailsDialog.showModal()", viewer_main)
            self.assertIn(".details-dialog::backdrop", viewer_styles)
            self.assertNotIn(".details-open .viewer-bottom", viewer_styles)

    def test_invalid_launch_file_stops_before_scaffolding(self):
        with tempfile.TemporaryDirectory() as temporary:
            workspace = Path(temporary)
            launch_path = workspace / ".claude" / "launch.json"
            launch_path.parent.mkdir(parents=True)
            launch_path.write_text("{not-json", encoding="utf-8")
            target = workspace / "viewer"

            result = subprocess.run(
                [str(SCRIPT), str(target)],
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(target.exists())

    def test_rejects_explicit_manager_that_conflicts_with_lockfile(self):
        with tempfile.TemporaryDirectory() as temporary:
            workspace = Path(temporary)
            (workspace / "pnpm-lock.yaml").write_text("lockfileVersion: '9.0'\n")
            target = workspace / "viewer"

            result = subprocess.run(
                [
                    str(SCRIPT),
                    str(target),
                    "--package-manager",
                    "npm",
                ],
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("conflicts", result.stderr)
            self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
