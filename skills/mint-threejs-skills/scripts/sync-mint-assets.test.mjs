import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inspectGlbExtensions, syncMintAssets } from "./sync-mint-assets.mjs";

function makeGlb(document) {
  const jsonBytes = Buffer.from(JSON.stringify(document));
  const padding = (4 - (jsonBytes.byteLength % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(padding, 0x20)]);
  const glb = Buffer.alloc(20 + jsonChunk.byteLength);
  glb.write("glTF", 0, "ascii");
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.byteLength, 8);
  glb.writeUInt32LE(jsonChunk.byteLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(glb, 20);
  return glb;
}

const dracoGlb = makeGlb({
  asset: { version: "2.0" },
  extensionsUsed: ["KHR_draco_mesh_compression", "EXT_texture_webp"],
  extensionsRequired: ["KHR_draco_mesh_compression", "VENDOR_unknown_required"],
  meshes: [{ primitives: [{ extensions: { KHR_draco_mesh_compression: { bufferView: 0 } } }] }],
});
assert.deepEqual(inspectGlbExtensions(dracoGlb), {
  extensionsUsed: ["EXT_texture_webp", "KHR_draco_mesh_compression"],
  extensionsRequired: ["KHR_draco_mesh_compression", "VENDOR_unknown_required"],
  usesDraco: true,
  requiresDraco: true,
  usesMeshopt: false,
  requiresMeshopt: false,
  usesKtx2: false,
  requiresKtx2: false,
  unknownRequiredExtensions: ["VENDOR_unknown_required"],
});
const supportedDracoGlb = makeGlb({
  asset: { version: "2.0" },
  extensionsUsed: ["KHR_draco_mesh_compression", "EXT_texture_webp"],
  extensionsRequired: ["KHR_draco_mesh_compression"],
  meshes: [{ primitives: [{ extensions: { KHR_draco_mesh_compression: { bufferView: 0 } } }] }],
});
assert.deepEqual(
  inspectGlbExtensions(
    makeGlb({
      asset: { version: "2.0" },
      extensionsUsed: [
        "KHR_draco_mesh_compression",
        "EXT_meshopt_compression",
        "KHR_texture_basisu",
      ],
    }),
  ),
  {
    extensionsUsed: [
      "EXT_meshopt_compression",
      "KHR_draco_mesh_compression",
      "KHR_texture_basisu",
    ],
    extensionsRequired: [],
    usesDraco: true,
    requiresDraco: false,
    usesMeshopt: true,
    requiresMeshopt: false,
    usesKtx2: true,
    requiresKtx2: false,
    unknownRequiredExtensions: [],
  },
);
assert.deepEqual(inspectGlbExtensions(makeGlb({ asset: { version: "2.0" } })), {
  extensionsUsed: [],
  extensionsRequired: [],
  usesDraco: false,
  requiresDraco: false,
  usesMeshopt: false,
  requiresMeshopt: false,
  usesKtx2: false,
  requiresKtx2: false,
  unknownRequiredExtensions: [],
});
assert.throws(() => inspectGlbExtensions(Buffer.from("not a GLB")), /glTF binary header/);

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
  assert.deepEqual(image.source, {
    manifestVersion: 1,
    kind: "asset",
    assetType: "image",
    assetId: "image_1",
  });
  assert.equal(firstRegistryText.includes("mintUrl"), false);
  assert.equal(firstRegistryText.includes("downloadUrl"), false);
  assert.equal(firstRegistryText.includes("providerJobId"), false);
  assert.equal(firstRegistryText.includes("storageKey"), false);
  assert.deepEqual(
    [...(await readFile(path.join(projectDir, image.artifacts.image_file.localPath)))],
    [1, 2, 3, 4],
  );

  delete imageManifest.mintUrl;
  await writeFile(imageManifestPath, JSON.stringify(imageManifest));
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

  const invalidManifestPath = path.join(projectDir, "invalid-manifest.json");
  await writeFile(
    invalidManifestPath,
    JSON.stringify({
      ...imageManifest,
      source: { ...imageManifest.source, id: "" },
    }),
  );
  await assert.rejects(
    () => syncMintAssets({
      projectDir,
      manifestPath: invalidManifestPath,
      key: "missing-source-id",
      fetchImpl,
    }),
    /manifest\.source\.id is required/,
  );

  const modelManifestPath = path.join(projectDir, "model-manifest.json");
  await writeFile(
    modelManifestPath,
    JSON.stringify({
      manifestVersion: 1,
      source: { kind: "asset", assetType: "model", id: "model_1" },
      mintUrl: "https://mint.gg/example/model_1",
      artifacts: [
        {
          id: "optimized_glb",
          artifactId: "optimized_glb",
          role: "canonical_model",
          format: "glb",
          filename: "hero-optimized.glb",
          contentType: "model/gltf-binary",
          byteSize: supportedDracoGlb.byteLength,
          downloadUrl: "https://cdn.mint.gg/hero-optimized.glb",
          loaderHint: "gltf",
        },
      ],
    }),
  );
  await syncMintAssets({
    projectDir,
    manifestPath: modelManifestPath,
    key: "hero-model",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      arrayBuffer: async () => Uint8Array.from(supportedDracoGlb).buffer,
    }),
  });
  const modelRegistry = JSON.parse(await readFile(registryPath, "utf8"));
  const modelArtifact = modelRegistry.assets["hero-model"].artifacts.optimized_glb;
  assert.equal(modelArtifact.usesDraco, true);
  assert.equal(modelArtifact.requiresDraco, true);
  assert.deepEqual(modelArtifact.extensionsRequired, [
    "KHR_draco_mesh_compression",
  ]);
  assert.deepEqual(modelArtifact.unknownRequiredExtensions, []);
  await assert.rejects(
    () =>
      syncMintAssets({
        projectDir,
        manifestPath: modelManifestPath,
        key: "unsupported-model",
        force: true,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          statusText: "OK",
          arrayBuffer: async () => Uint8Array.from(dracoGlb).buffer,
        }),
      }),
    /requires unsupported glTF extensions: VENDOR_unknown_required/,
  );

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
      artifacts: [
        {
          id: "preview_image",
          artifactId: "preview_image",
          role: "preview_image",
          kind: "asset_preview",
          format: "webp",
          filename: "world-preview.webp",
          contentType: "image/webp",
          downloadUrl: "https://cdn.mint.gg/world-preview.webp",
          suggestedPath: "public/images/world-preview.webp",
          loaderHint: "image",
        },
      ],
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
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      arrayBuffer: async () => Uint8Array.from([9, 8, 7]).buffer,
    }),
  });
  const finalRegistry = JSON.parse(await readFile(registryPath, "utf8"));
  assert.equal(finalRegistry.assets.courtyard.mode, "remote_stream");
  assert.equal(finalRegistry.assets.courtyard.runtime.artifactId, "world_runtime_rad");
  assert.equal(finalRegistry.assets.courtyard.runtime.collider.role, "physics_collider");
  assert.equal(
    finalRegistry.assets.courtyard.thumbnailUrl,
    "public/assets/mint/courtyard/preview_image.webp",
  );
  assert.equal(
    finalRegistry.assets.courtyard.artifacts.preview_image.role,
    "preview_image",
  );

  finalRegistry.assets.courtyard.source.mintUrl = "https://mint.gg/chat/legacy-chat";
  finalRegistry.assets["missing-source-id"] = {
    source: {
      manifestVersion: 1,
      kind: "asset",
      assetType: "model",
    },
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    mode: "local_files",
    artifacts: {},
  };
  await writeFile(registryPath, `${JSON.stringify(finalRegistry, null, 2)}\n`);
  await assert.rejects(
    () => syncMintAssets({
      projectDir,
      manifestPath: imageManifestPath,
      key: "hero-portrait",
      fetchImpl,
    }),
    /registry\.assets\.missing-source-id\.source\.assetId is required/,
  );
  delete finalRegistry.assets["missing-source-id"];
  finalRegistry.assets.legacy = {
    source: {
      manifestVersion: 1,
      kind: "asset",
      assetType: "model",
      assetId: "legacy_model_1",
      chatUrl: "https://mint.gg/chat/legacy-model",
      sourceUrl: "https://mint.gg/legacy-model",
    },
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    mode: "local_files",
    artifacts: {},
  };
  await writeFile(registryPath, `${JSON.stringify(finalRegistry, null, 2)}\n`);
  await syncMintAssets({ projectDir, manifestPath: imageManifestPath, key: "hero-portrait", fetchImpl });
  const migratedRegistry = JSON.parse(await readFile(registryPath, "utf8"));
  assert.deepEqual(migratedRegistry.assets.courtyard.source, {
    manifestVersion: 1,
    kind: "asset",
    assetType: "world",
    assetId: "world_1",
  });
  assert.deepEqual(migratedRegistry.assets.legacy.source, {
    manifestVersion: 1,
    kind: "asset",
    assetType: "model",
    assetId: "legacy_model_1",
  });
} finally {
  await rm(projectDir, { recursive: true, force: true });
}

console.log("sync-mint-assets smoke test passed");
