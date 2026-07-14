# Mint World Splats

Use this only when the user explicitly chose a Mint-generated world. Mint worlds
are remote Gaussian-splat environments, not ordinary model downloads.

## Contents

- Runtime contract
- Version requirements
- Vanilla Three.js pattern
- Loading and runtime performance
- Transform and center heuristics
- Default camera and navigation
- CDN CORS and range requests
- Physics and lifecycle

## Runtime Contract

- Wait for final status; Mint reports success only after RAD post-processing.
- Fetch `get_asset_artifact_manifest` with `asset_type: "world"`.
- Require `integrationMode: "remote_stream"`, a RAD `runtimeUrl`, and
  `runtime.collider.runtimeUrl` for the matching collider GLB.
- Keep both URLs remote. The manifest stabilizes the collider onto Mint CDN.
- Load the RAD and collider under the exact same root transform. Never move,
  rotate, scale, or center one without the other.
- Keep the collider invisible. If the app uses physics, navigation, grounding,
  raycasts, or spawn placement, use the collider rather than the splat.
- If the collider is missing, stop and report the manifest blocker. Do not
  derive gameplay collision from Gaussian splats.

## Version Requirements

Install the official runtime with the project's package manager:

```sh
pnpm add @sparkjsdev/spark@^2 'three@>=0.180.0'
```

RAD requires `@sparkjsdev/spark@^2` and `three >= 0.180`. Spark 0.1.x cannot
parse RAD. If RAD loading fails with `Unknown splat file type: undefined`, first
confirm the installed Spark version and that the mesh explicitly uses
`fileType: SplatFileType.RAD`.

## Vanilla Three.js Pattern

This pattern mirrors Mint's World Labs viewer defaults and keeps one
`SparkRenderer` per Three.js renderer:

```ts
import * as THREE from "three";
import {
  SparkRenderer,
  SplatFileType,
  SplatMesh,
} from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

type MintWorldRuntime = {
  runtimeUrl: string;
  collider: { runtimeUrl: string };
};

const MINT_WORLD_SCALE = 2.5;
const MINT_WORLD_Y = 1.5;
const MINT_WORLD_ROTATION: [number, number, number] = [
  Math.PI,
  Math.PI,
  0,
];

function hasUsableBounds(box: THREE.Box3) {
  const size = box.getSize(new THREE.Vector3());
  return (
    [size.x, size.y, size.z].every(Number.isFinite) &&
    size.lengthSq() > 0.001
  );
}

export async function loadMintWorld(
  scene: THREE.Scene,
  runtime: MintWorldRuntime,
) {
  const root = new THREE.Group();
  root.position.set(0, MINT_WORLD_Y, 0);
  root.rotation.set(...MINT_WORLD_ROTATION);
  root.scale.setScalar(MINT_WORLD_SCALE);
  scene.add(root);

  const splat = new SplatMesh({
    url: runtime.runtimeUrl,
    fileType: SplatFileType.RAD,
    paged: true,
    raycastable: false,
    onFrame: () => {},
  });
  root.add(splat);

  const colliderPromise = new GLTFLoader().loadAsync(
    runtime.collider.runtimeUrl,
  );
  const [, colliderGltf] = await Promise.all([
    splat.initialized,
    colliderPromise,
  ]);

  const collider = colliderGltf.scene;
  root.add(collider);
  root.updateMatrixWorld(true);

  // Prefer the collider for a stable, physics-aligned orbit target.
  let bounds = new THREE.Box3().setFromObject(collider);
  if (!hasUsableBounds(bounds)) {
    const localSplatBounds = splat.getBoundingBox(false);
    bounds = localSplatBounds.clone().applyMatrix4(splat.matrixWorld);
  }

  const center = hasUsableBounds(bounds)
    ? bounds.getCenter(new THREE.Vector3())
    : new THREE.Vector3(0, MINT_WORLD_Y, 0);

  // Keep geometry loaded for physics, but never render the collider.
  collider.traverse((object) => {
    object.visible = false;
  });

  return { root, splat, collider, bounds, center };
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  55,
  innerWidth / innerHeight,
  0.01,
  2000,
);
const spark = new SparkRenderer({ renderer, enableLod: true });
scene.add(spark);

const loaded = await loadMintWorld(scene, manifest.runtime);

// Walkthroughs should start near the world origin. Orbit viewers may target
// loaded.center, but should not translate the world merely to center it.
camera.position.set(0, 2.2, 6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.update();

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
```

For RAD, use `paged: true`; do not add `lod: true` to `SplatMesh`. SPZ LoD
still downloads the full source, while RAD paging is intended for large worlds.

## Loading And Runtime Performance

For slow first pixels, duplicate downloads, main-thread packing stalls,
multi-world transitions, or expensive Spark updates, read
`mint-world-splat-performance.md`. It contains the proven finite-SPZ preview
pipeline: deterministic downsampling, offline `PackedSplats` snapshots,
promise-coalesced bounded caches, progressive preview-to-full handoff,
delayed adjacent-world prefetch, manual demand-render scheduling, hosting
headers, cleanup, and measurement gates.

Keep the runtime boundary explicit: remote Mint RAD continues to use paged
range streaming. Do not replace RAD with an eager finite-file prefetch or local
prepack. The preview/prepack path applies only when the project already owns or
is explicitly allowed to derive finite SPZ/splat artifacts.

## Transform And Center Heuristics

- Start World Labs output at rotation `[π, π, 0]`, uniform scale `2.5`, and Y
  position `1.5`. The rotation corrects the World Labs source coordinate basis;
  scale and Y are the current production display calibration. Apply all three
  to the shared splat-and-collider root, not either asset independently.
- Do not interpret raw, pre-transform collider dimensions as final world meters.
  Validate the transformed collider against plausible room dimensions, eye
  height, floor position, and traversal speed. If a nonstandard asset or future
  pipeline needs different calibration, change the shared root once and keep
  the splat and collider aligned.
- For first-person or walkthrough scenes, preserve the transformed local origin
  as the starting area. Do not automatically recenter an environment.
- For simple orbit viewers, prefer the production-derived camera at
  `[0, 2.2, 6]` with target `[0, 1.4, 0]` over automatic fit-to-bounds. Large or
  noisy world bounds can place the camera too far away. Use collider bounds to
  validate the target and clipping planes; fall back to
  `splat.getBoundingBox(false)` only after initialization.
- If product-specific scale changes are needed, apply them to the shared root
  and recompute both camera clipping and physics data afterward.

## Default Camera And Navigation

- Enable WASD navigation by default for desktop splat worlds. Keep orbit/pan/
  zoom unless the user asks for a strict first-person walkthrough.
- Start at camera `[0, 2.2, 6]`, target `[0, 1.4, 0]`, and FOV `55` for a stable
  view slightly behind the world origin.
- Move at `3.2` world units per second and use `8` while Shift is held. Project
  forward onto the XZ plane for WASD; optionally use Q/E or Space for vertical
  fly movement.
- Apply every navigation delta to both `camera.position` and the OrbitControls
  target so movement does not snap back on the next control update.
- Ignore keyboard navigation while an input, textarea, select, or editable
  element has focus. Clear pressed keys on blur.
- Show `WASD move` in the compact control hint. Keep the status immediately
  above the controls and do not add a top banner.

## CDN CORS And Range Requests

Load Mint CDN runtime URLs directly by default. Do not add a Vite or application
proxy as a precautionary fallback. Mint CDN should return
`Access-Control-Allow-Origin: *`, no credentialed CORS, and expose
`Accept-Ranges`, `Content-Length`, `Content-Range`, `Content-Type`, `ETag`,
`Last-Modified`, and `Cache-Control`. Test with an `Origin` header and a one-byte
`Range` request.

If live validation shows those headers are missing and the CDN configuration
cannot be corrected, use a same-origin Vite proxy as a temporary troubleshooting
fallback. Preserve the incoming `Range` header and upstream `206`,
`Content-Range`, `Accept-Ranges`, and `Content-Length` response headers:

```ts
import { defineConfig } from "vite";

const mintCdnProxy = {
  target: "https://cdn.mint.gg",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/mint-cdn/, ""),
};

export default defineConfig({
  server: { proxy: { "/mint-cdn": mintCdnProxy } },
  preview: { proxy: { "/mint-cdn": mintCdnProxy } },
});
```

Rewrite only `https://cdn.mint.gg/*` runtime URLs to `/mint-cdn/*` for local dev
and preview. Remove the proxy once direct CDN CORS is correct so local and
production loading follow the same path. Do not silently fall back to a
full-file download for paged RAD.

## Physics And Lifecycle

- Register collider meshes as fixed/static triangle meshes using each mesh's
  world transform. Some physics adapters skip invisible objects, so pass the
  geometry explicitly instead of relying on render visibility discovery.
- Use simple local trigger volumes for interaction when appropriate, but retain
  the generated collider for world surfaces, grounding, and traversal.
- Keep a visible loading state until both `splat.initialized` and the collider
  GLB resolve. Surface either error and offer retry.
- Reuse the app's render loop, resize ownership, controls, and teardown. Remove
  the shared root when replacing worlds and dispose the Spark renderer only
  when its owning Three.js renderer is destroyed.
- In React Three Fiber, apply the same root transform to `SplatMesh` and the
  invisible collider/Rapier fixed trimesh. Do not migrate a vanilla app to R3F.

Mint MCP calls stay in agent tooling. Browser code receives only the explicit
runtime manifest values selected during development.
