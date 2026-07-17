import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("create_threejs_game.py")


class CreateThreejsGameTest(unittest.TestCase):
    def test_scaffold_includes_shared_draco_runtime(self):
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "forest-game"
            subprocess.run(
                [str(SCRIPT), str(target), "--force"],
                check=True,
                capture_output=True,
                text=True,
            )

            runtime = (
                target / "src" / "assets" / "gltf-runtime.ts"
            ).read_text(encoding="utf-8")
            self.assertIn("runtime/draco/gltf/three-0.184.0/", runtime)
            self.assertIn("new DRACOLoader().setDecoderPath(path)", runtime)
            self.assertIn("setDRACOLoader", runtime)
            self.assertIn("disposeMintGltfRuntime", runtime)


if __name__ == "__main__":
    unittest.main()
