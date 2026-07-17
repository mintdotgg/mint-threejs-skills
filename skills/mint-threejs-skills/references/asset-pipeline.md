# Durable Project Asset Pipeline

Use this pipeline for every Three.js project that imports files or remote world
runtime configuration from Mint MCP. The project owns the resulting
`mint-assets.json`; Mint MCP remains the production source, and browser runtime
code never calls MCP.

Read `gltf-runtime-compatibility.md` before wiring any synchronized GLB. The
sync records the file's runtime extension requirements; the browser loader must
provide the matching capabilities.

## First Useful Workflow

1. Choose a stable project key for the asset, such as `hero`, `courtyard`,
   `pickup-sound`, or `mossy-wall`. Reuse that key when the asset is refreshed.
2. Save the exact result from `get_asset_artifact_manifest`,
   `get_asset_artifact_manifests` (one ready entry), or
   `get_model_animation_artifact_manifest` as a temporary JSON file.
3. Resolve the installed `mint-threejs-skills` directory and run:

   ```bash
   node <mint-threejs-skills-root>/scripts/sync-mint-assets.mjs \
     --project . \
     --manifest /tmp/hero-manifest.json \
     --key hero
   ```

4. On the first sync, optionally set an architecture-appropriate asset root:

   ```bash
   node <mint-threejs-skills-root>/scripts/sync-mint-assets.mjs \
     --project . \
     --manifest /tmp/hero-manifest.json \
     --key hero \
     --asset-root public/game-assets/mint
   ```

   Later syncs reuse the registry's `assetRoot` unless explicitly overridden.
5. Wire runtime loaders to the recorded `localPath` values, respecting the
   project's public-root or import conventions. Do not assume that a filesystem
   path is already a browser URL.
6. Remove the temporary source manifest after the registry and files are in
   place. Commit `mint-assets.json`; commit downloaded files according to the
   project's asset policy.

The sync is idempotent. Reusing a logical key for the same Mint source replaces
only that asset's registry record, reuses files whose recorded and on-disk byte
sizes agree, and preserves the asset's existing `transform`. Use `--force` only
when deliberately replacing file content under the same Mint source ID. The
script does not delete orphaned files from older artifact sets in this first
version.

## Registry Contract

`mint-assets.json` starts with:

```json
{
  "registryVersion": 1,
  "assetRoot": "public/assets/mint",
  "assets": {
    "hero": {
      "source": {
        "manifestVersion": 1,
        "kind": "asset",
        "assetType": "model",
        "assetId": "..."
      },
      "transform": {
        "position": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      },
      "mode": "local_files",
      "thumbnailUrl": "public/assets/mint/hero/preview_image.webp",
      "artifacts": {
        "optimized_glb": {
          "artifactId": "optimized_glb",
          "role": "canonical_model",
          "format": "glb",
          "contentType": "model/gltf-binary",
          "filename": "hero-optimized.glb",
          "localPath": "public/assets/mint/hero/optimized_glb.glb",
          "loaderHint": "gltf",
          "extensionsUsed": ["KHR_draco_mesh_compression"],
          "extensionsRequired": ["KHR_draco_mesh_compression"],
          "usesDraco": true,
          "requiresDraco": true
        }
      }
    }
  }
}
```

Persisted source records contain only `manifestVersion`, `kind`, `assetType`,
and `assetId`. Mint MCP artifact-manifest responses may include `mintUrl` for
an agent or user to open the asset in Mint, but the sync treats that URL as an
ephemeral handoff and never writes it to `mint-assets.json`. Synchronizing an
existing version 1 registry also removes legacy source URL fields from every
record while preserving its asset IDs, transforms, and artifacts.

Artifact records also preserve `byteSize`, actual Image `width`, `height`, and
`aspectRatio`, and actual audio `durationSeconds` when Mint includes them.
Unknown values stay omitted. Ordinary `downloadUrl` values and unrecognized
provider or storage fields are not written to the project registry.

For GLB artifacts, the sync reads the binary JSON chunk and records sorted
`extensionsUsed` and `extensionsRequired` arrays. It also records the detected
Draco, Meshopt, and KTX2 capability flags. A malformed GLB fails sync rather
than producing a registry entry that cannot be verified.

When a manifest contains an artifact with role `preview_image`, the sync stores
that file like any other image and copies its project-local path to the asset
record's `thumbnailUrl`. Use that registry field for viewer loading states and
carousels; do not persist the source preview URL.

Animation manifests use their target type as `source.assetType` and retain the
`rigged_character` or `animation_clip` role for each local file.

## Remote Worlds

World manifests create a `mode: "remote_stream"` record instead of downloading
RAD or collider files. A `preview_image` artifact is still downloaded when
present and becomes `thumbnailUrl`. The record preserves the Mint CDN-backed runtime and
collider URLs, their artifact IDs and roles, SparkJS loader hints, byte size
when known, and the same editable identity transform. Load both remote URLs
under that one transform and keep the collider invisible.

## Asset Viewer Mapping

- For a single model, map one model artifact's browser URL into one
  `ModelAssetItem` in the packaged Asset Viewer scaffold.
- Map the registry asset's `thumbnailUrl` to the viewer item or world
  `thumbnailUrl`, converting the project-local path to a browser path.
- For an asset pack, create one item per generated model and preserve the pack's
  stable item order. Point each item at its own registry logical key and local
  GLB path.
- For animation artifacts, attach each semantic clip to its target model item.
  Use the local animation GLB path as `url`; omit `url` for clips embedded in the
  base model.
- For one material, map every `materialMap` artifact to a `MaterialMapRecord`
  using the artifact ID suffix as `mapType`. Use the local `maps_zip` archive as
  `archiveDownloadUrl` when present.
- For a material pack, preserve the grouped item order but synchronize each
  ready material under its own stable registry key. Material packs share the
  viewer carousel pattern; they do not become model asset packs in the registry
  or generation lifecycle.
- For a world, set the viewer manifest to `kind: "world"` and pass the registry's
  remote RAD runtime and collider URLs. Do not turn those remote values into
  public-root paths or download them into the project.
- Convert registry filesystem paths to browser URLs deliberately. For a Vite
  public root, `public/assets/mint/chair/original_glb.glb` becomes
  `/assets/mint/chair/original_glb.glb`.
- Create model, animation, and collider loaders through the shared helper in
  `gltf-runtime-compatibility.md`; do not instantiate a bare `GLTFLoader`.

## Boundaries

- Existing project architecture wins. Configure `assetRoot` instead of moving
  an established asset layer.
- Use one durable logical key per app-level asset responsibility. Do not use a
  transient prompt, provider job ID, or filename as the key.
- Do not hand-edit generated artifact metadata. It is safe to edit the local
  `transform` and app-specific data stored outside the generated asset record.
- This first version does not add watchers, automatic format conversion,
  checksums, TypeScript code generation, or orphan pruning.
