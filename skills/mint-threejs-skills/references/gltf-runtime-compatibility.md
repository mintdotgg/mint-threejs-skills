# glTF Runtime Compatibility

Use this contract whenever a Three.js project consumes Mint-generated GLB
models, animation files, or world colliders. A successful download or build is
not proof that the browser can decode the file.

## Default Draco Runtime

Mint's GLB optimizer emits `KHR_draco_mesh_compression`. Configure every
`GLTFLoader` that can receive a Mint GLB with one shared `DRACOLoader` using:

```text
https://cdn.mint.gg/runtime/draco/gltf/three-0.184.0/
```

The versioned path is immutable and contains `draco_decoder.js`,
`draco_decoder.wasm`, and `draco_wasm_wrapper.js`. Do not use a mutable
`latest` URL, copy the files into every generated project by default, or create
a new decoder instance for every model.

For vanilla Three.js, use the packaged `src/assets/gltf-runtime.ts` or
`src/viewer/gltf-runtime.ts` helper. It:

- attaches a shared decoder to every returned `GLTFLoader`;
- lazily downloads the decoder only when a Draco primitive is encountered;
- supports a caller-supplied decoder path for offline or self-hosted apps; and
- disposes shared decoders only during permanent application teardown.

Use the same helper for base models, external animation GLBs, and world
colliders. Do not fix only the first visible model-loading path.

## Inspect The File

Treat actual GLB metadata as the source of truth. Record `extensionsUsed` and
`extensionsRequired` during asset sync and inspect primitive extensions when
validating a hand-authored registry.

| Extension | Required runtime support |
| --- | --- |
| `KHR_draco_mesh_compression` | Shared `DRACOLoader`; supplied by the Mint helper |
| `EXT_meshopt_compression` | `GLTFLoader.setMeshoptDecoder(...)`; add only when present |
| `KHR_texture_basisu` | `GLTFLoader.setKTX2Loader(...)` plus a transcoder path |

Stop on an unknown required extension with an actionable error. Do not assume
that adding Draco also solves Meshopt, KTX2, or another required capability.
An extension listed only in `extensionsUsed` may have an uncompressed fallback,
but the registry must still preserve it.

## Loading Failure Ownership

Treat the first model, audio, or decoder rejection as terminal for that loading
attempt. Latch the fatal error before rendering it and ignore later progress
callbacks so concurrent requests cannot replace the real failure with a stale
progress label. Retrying must start a new explicit loading attempt.

## Self-Hosted Fallback

Use a local decoder path only for an offline build, a deployment that cannot
allow `https://cdn.mint.gg`, or another explicit hosting constraint. Copy the
three matching files from the installed Three.js package's
`examples/jsm/libs/draco/gltf/` directory and pass a base-aware path to the
helper. Keep the decoder source version and hashes together; do not mix files
from different releases.

For a strict content security policy, allow the Mint CDN for decoder fetches,
WebAssembly execution as required by the target browser policy, and `blob:`
workers used by `DRACOLoader`. A local decoder path does not remove the worker
policy requirement.

## Verification

The automatic minimum is:

1. Inspect synchronized GLB extension metadata.
2. Confirm every Mint GLB loader path uses the shared helper.
3. Build or typecheck the project.
4. Check the CDN or self-hosted decoder filenames, MIME types, and CORS.

When desktop browser QA is approved, load at least one real Draco GLB, reject
`No DRACOLoader instance provided` and decoder network errors, and confirm the
first fatal loading error remains visible. A successful TypeScript or Vite
build alone is insufficient runtime evidence.
