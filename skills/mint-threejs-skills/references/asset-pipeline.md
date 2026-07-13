# Durable Project Asset Pipeline

Use this pipeline for every Three.js project that imports files or remote world
runtime configuration from Mint MCP. The project owns the resulting
`mint-assets.json`; Mint MCP remains the production source, and browser runtime
code never calls MCP.

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
        "assetId": "...",
        "mintUrl": "https://mint.gg/..."
      },
      "transform": {
        "position": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      },
      "mode": "local_files",
      "artifacts": {
        "optimized_glb": {
          "artifactId": "optimized_glb",
          "role": "canonical_model",
          "format": "glb",
          "contentType": "model/gltf-binary",
          "filename": "hero-optimized.glb",
          "localPath": "public/assets/mint/hero/optimized_glb.glb",
          "loaderHint": "gltf"
        }
      }
    }
  }
}
```

Artifact records also preserve `byteSize`, actual Image `width`, `height`, and
`aspectRatio`, and actual audio `durationSeconds` when Mint includes them.
Unknown values stay omitted. Ordinary `downloadUrl` values and unrecognized
provider or storage fields are not written to the project registry.

Animation manifests use their target type as `source.assetType` and retain the
`rigged_character` or `animation_clip` role for each local file.

## Remote Worlds

World manifests create a `mode: "remote_stream"` record instead of downloading
RAD or collider files. The record preserves the Mint CDN-backed runtime and
collider URLs, their artifact IDs and roles, SparkJS loader hints, byte size
when known, and the same editable identity transform. Load both remote URLs
under that one transform and keep the collider invisible.

## Boundaries

- Existing project architecture wins. Configure `assetRoot` instead of moving
  an established asset layer.
- Use one durable logical key per app-level asset responsibility. Do not use a
  transient prompt, provider job ID, or filename as the key.
- Do not hand-edit generated artifact metadata. It is safe to edit the local
  `transform` and app-specific data stored outside the generated asset record.
- This first version does not add watchers, automatic format conversion,
  checksums, TypeScript code generation, or orphan pruning.
