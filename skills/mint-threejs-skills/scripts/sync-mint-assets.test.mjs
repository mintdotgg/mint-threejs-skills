import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { syncMintAssets } from "./sync-mint-assets.mjs";

const projectDir = await mkdtemp(path.join(os.tmpdir(), "mint-assets-sync-"));

try {
  const imageManifest = {
    manifestVersion: 1,
    source: { kind: "asset", assetType: "image", id: "image_1" },
    mintUrl: "https://mint.gg/example/image_1",
    artifacts: [
      {
        id: "image_file",
        artifactId: "image_file",
        role: "image",
        kind: "image_file",
        format: "png",
        filename: "moon-garden.png",
        contentType: "image/png",
        byteSize: 4,
        width: 2048,
        height: 1152,
        aspectRatio: 16 / 9,
        downloadUrl: "https://cdn.mint.gg/image.png",
        suggestedPath: "public/images/moon-garden.png",
        loaderHint: "image",
        providerJobId: "must-not-persist",
      },
    ],
    storageKey: "must-not-persist",
  };
  const imageManifestPath = path.join(projectDir, "image-manifest.json");
  await writeFile(imageManifestPath, JSON.stringify(imageManifest));
  let downloadCount = 0;
  const fetchImpl = async () => {
    downloadCount += 1;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
    };
  };

  await syncMintAssets({ projectDir, manifestPath: imageManifestPath, key: "hero-portrait", fetchImpl });
  const registryPath = path.join(projectDir, "mint-assets.json");
  const firstRegistryText = await readFile(registryPath, "utf8");
  const firstRegistry = JSON.parse(firstRegistryText);
  const image = firstRegistry.assets["hero-portrait"];
  assert.equal(firstRegistry.registryVersion, 1);
  assert.equal(firstRegistry.assetRoot, "public/assets/mint");
  assert.deepEqual(image.transform, {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  assert.equal(image.artifacts.image_file.localPath, "public/assets/mint/hero-portrait/image_file.png");
  assert.equal(image.artifacts.image_file.width, 2048);
  assert.equal(image.artifacts.image_file.aspectRatio, 16 / 9);
  assert.equal(firstRegistryText.includes("downloadUrl"), false);
  assert.equal(firstRegistryText.includes("providerJobId"), false);
  assert.equal(firstRegistryText.includes("storageKey"), false);
  assert.deepEqual(
    [...(await readFile(path.join(projectDir, image.artifacts.image_file.localPath)))],
    [1, 2, 3, 4],
  );

  await syncMintAssets({ projectDir, manifestPath: imageManifestPath, key: "hero-portrait", fetchImpl });
  assert.equal(await readFile(registryPath, "utf8"), firstRegistryText);
  assert.equal(downloadCount, 1);

  await syncMintAssets({
    projectDir,
    manifestPath: imageManifestPath,
    key: "hero-portrait",
    fetchImpl,
    force: true,
  });
  assert.equal(downloadCount, 2);

  firstRegistry.assets["hero-portrait"].transform.position = [2, 0, -3];
  await writeFile(registryPath, `${JSON.stringify(firstRegistry, null, 2)}\n`);
  await syncMintAssets({ projectDir, manifestPath: imageManifestPath, key: "hero-portrait", fetchImpl });
  assert.deepEqual(
    JSON.parse(await readFile(registryPath, "utf8")).assets["hero-portrait"].transform.position,
    [2, 0, -3],
  );

  const worldManifestPath = path.join(projectDir, "world-manifest.json");
  await writeFile(
    worldManifestPath,
    JSON.stringify({
      manifestVersion: 1,
      source: { kind: "asset", assetType: "world", id: "world_1" },
      mintUrl: "https://mint.gg/example/world_1",
      artifacts: [],
      integrationMode: "remote_stream",
      runtime: {
        artifactId: "world_runtime_rad",
        role: "environment",
        renderer: "@sparkjsdev/spark",
        format: "rad",
        runtimeUrl: "https://assets.mint.gg/world.rad",
        byteSize: 987654,
        collider: {
          artifactId: "world_collider",
          role: "physics_collider",
          format: "glb",
          runtimeUrl: "https://cdn.mint.gg/world-collider.glb",
          loaderHint: "gltf",
        },
        loaderHint: { renderer: "SparkRenderer", mesh: "SplatMesh", paged: true, lod: false },
      },
    }),
  );
  await syncMintAssets({
    projectDir,
    manifestPath: worldManifestPath,
    key: "courtyard",
    fetchImpl: async () => {
      throw new Error("remote worlds must not download");
    },
  });
  const finalRegistry = JSON.parse(await readFile(registryPath, "utf8"));
  assert.equal(finalRegistry.assets.courtyard.mode, "remote_stream");
  assert.equal(finalRegistry.assets.courtyard.runtime.artifactId, "world_runtime_rad");
  assert.equal(finalRegistry.assets.courtyard.runtime.collider.role, "physics_collider");
} finally {
  await rm(projectDir, { recursive: true, force: true });
}

console.log("sync-mint-assets smoke test passed");
