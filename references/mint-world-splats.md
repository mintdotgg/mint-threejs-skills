# Mint World Splats

Use this only when the user explicitly chose a Mint-generated world. Mint worlds
are remote Gaussian-splat environments, not ordinary model downloads.

## Contents

- Runtime contract
- Vanilla Three.js pattern
- Transform and center heuristics
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

## Vanilla Three.js Pattern

Install the official runtime with the project's package manager:

```sh
pnpm add @sparkjsdev/spark three
```

This pattern mirrors Mint's World Labs viewer defaults and keeps one
`SparkRenderer` per Three.js renderer:

```ts
import * as THREE from "three";
import {
  SparkRenderer,
  SplatFileType,
  SplatMesh,
} from "@sparkjsdev/spark";
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
  60,
  innerWidth / innerHeight,
  0.01,
  2000,
);
const spark = new SparkRenderer({ renderer, enableLod: true });
scene.add(spark);

const loaded = await loadMintWorld(scene, manifest.runtime);

// Walkthroughs should start near the world origin. Orbit viewers may target
// loaded.center, but should not translate the world merely to center it.
camera.position.set(0, 3, 5);
camera.lookAt(loaded.center);

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
```

For RAD, use `paged: true`; do not add `lod: true` to `SplatMesh`. SPZ LoD
still downloads the full source, while RAD paging is intended for large worlds.

## Transform And Center Heuristics

- Start World Labs output at rotation `[π, π, 0]`, uniform scale `2.5`, and Y
  position `1.5`. These are Mint's proven viewer defaults, not a license to
  transform the splat and collider independently.
- For first-person or walkthrough scenes, preserve the transformed local origin
  as the starting area. Do not automatically recenter an environment.
- For orbit framing, use the invisible collider bounds first. Fall back to
  `splat.getBoundingBox(false)` only after the splat initializes and only when
  the returned center and size are finite and non-trivial.
- If product-specific scale changes are needed, apply them to the shared root
  and recompute both camera clipping and physics data afterward.

## Physics And Lifecycle

- Register collider meshes as fixed/static triangle meshes using each mesh's
  world transform. Some physics adapters skip invisible objects, so pass the
  geometry explicitly instead of relying on render visibility discovery.
- Use simple local trigger volumes for interaction when appropriate, but retain
  the generated collider for world surfaces, grounding, and traversal.
- Keep a visible loading state until both `splat.initialized` and the collider
  GLB resolve. Surface either error and offer retry.
- Verify CDN CORS and HTTP range requests. Preserve byte-range behavior if a
  proxy is unavoidable.
- Reuse the app's render loop, resize ownership, controls, and teardown. Remove
  the shared root when replacing worlds and dispose the Spark renderer only
  when its owning Three.js renderer is destroyed.
- In React Three Fiber, apply the same root transform to `SplatMesh` and the
  invisible collider/Rapier fixed trimesh. Do not migrate a vanilla app to R3F.

Mint MCP calls stay in agent tooling. Browser code receives only the explicit
runtime manifest values selected during development.
