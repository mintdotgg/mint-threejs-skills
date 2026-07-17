# Canonical Asset Viewer

Use this route when the generated asset is the requested product and the
Three.js project exists to inspect, play, select, and download it. Do not use it
to replace an explicitly requested app, game, configurator, or authored
showcase.

## Contents

- Route the request
- Build the first useful viewer
- Map Mint artifacts
- Preserve model fidelity
- Enable model inspection
- Enable animation playback
- Enable material inspection
- Enable pack browsing
- Stream RAD worlds
- Verify the delivery

## Route The Request

Choose the narrowest route that satisfies the active user goal:

| Context and requested outcome | Route |
| --- | --- |
| Fresh request for one model, character, vehicle, prop, or object | Asset Viewer with one model item |
| Fresh request for a coherent set, kit, roster, lineup, or variations | Asset Viewer with an asset-pack carousel |
| Delivered model has embedded or separate animation artifacts | Same Asset Viewer with animation controls |
| Fresh request for one seamless material, texture, PBR map set, or surface | Asset Viewer with one material item |
| Fresh request for several related materials, textures, or PBR map sets | Asset Viewer with a material-pack carousel |
| Fresh explicit request for one Mint-generated world or environment | Same Asset Viewer shell with a RAD world session |
| Existing app or game asks for another asset | Generate and integrate into that project; do not create another viewer |
| Explicit configurator, editor, simulation, walkthrough, showcase site, or other authored experience | General app route |
| Explicit objectives, challenge, progression, failure, or game feel | Game route |

A first message is useful evidence, not the rule by itself. The decisive signal
is one asset-delivery outcome with no established app or game contract. When a
fresh request is ambiguous, default to Asset Viewer delivery instead of
inventing a broader product.

Generate a Mint world only when the user explicitly requests a world or
environment. A general need for a background, level, or scene does not imply
world generation.

Treat a standalone seamless texture, PBR map set, or surface material as a
material delivery. A request to apply or select a material inside an existing
model, configurator, app, or game stays in that project instead of creating a
separate viewer.

## Build The First Useful Viewer

For a greenfield delivery, create the packaged vanilla Three.js scaffold:

```bash
python3 <mint-threejs-skills-root>/skills/threejs-app-director/scripts/create_threejs_asset_viewer.py ./my-asset-viewer
```

The creator detects the surrounding package manager and writes or updates the
matching `.claude/launch.json` entry. Use `--package-manager
auto|npm|pnpm|yarn|bun` to control detection and `--port <number>` to choose the
preferred Vite port. If that port is already declared or live, the creator uses
the next available port and writes the same value to Vite and launch config.
Invalid launch JSON stops before scaffolding. Do not introduce a second lockfile
family into an existing workspace.

Then:

1. Complete the Mint lifecycle in `mint-mcp-assets.md`.
2. Synchronize ordinary model, animation, and material files through
   `asset-pipeline.md`.
3. Configure `src/asset-manifest.ts` from the resulting registry records.
4. Keep the packaged shared GLB runtime helper on every model, external
   animation, and world-collider load path. Read
   `gltf-runtime-compatibility.md` before changing it.
5. Keep one model as a one-item `kind: "model"` manifest. Use the same manifest
   with several ordered items for an asset pack.
6. Keep one material as a one-item `kind: "material"` manifest. Use the same
   manifest with several ordered items for a material pack.
7. Configure an explicitly generated world as `kind: "world"` with its remote
   RAD and collider runtime values.
8. Remove placeholder comments and unavailable capability fields. Do not add
   substitute scene content.

The canonical shell owns one renderer, scene, camera, animation loop, resize
handler, loading surface, status line, centered details dialog, and teardown
path. Its scene session changes by manifest kind:

- Model session: static model, animated model, or focused asset-pack item.
- Material session: one PBR map set or focused material-pack item on the
  canonical tiled sphere.
- RAD world session: one remote paged world plus its aligned invisible collider.

## Map Mint Artifacts

Use only artifact metadata that Mint actually returned:

- Convert Vite public-root filesystem paths into browser paths deliberately.
- Preserve asset-pack item order and stable logical keys.
- Map the synchronized registry record's `thumbnailUrl` to the viewer item or
  world `thumbnailUrl`. It comes from a manifest artifact with role
  `preview_image`; do not copy a raw preview CDN URL into the app.
- Attach animation artifacts only to their target model item.
- Use an animation artifact's local GLB path as `url`. For an embedded base-model
  clip, omit `url` and identify the clip by `clipName` when needed.
- Set `downloadUrl` only when there is a real downloadable artifact.
- Set `packDownloadUrl` only when Mint returned a real pack archive.
- Map `map_basecolor`, `map_normal`, `map_roughness`, `map_metalness`, and
  `map_height` artifacts by semantic map type. Map `maps_zip` to the material
  item's archive download when present.
- Keep material-pack grouping separate from model asset-pack lifecycle. Resolve
  and synchronize each ready material's own manifest unless the live host
  exposes an explicit material-pack artifact contract.
- Keep world RAD and collider URLs remote. Never expose raw runtime URLs in
  visible metadata or turn them into local public paths.
- Omit unknown byte size, format, prompt, thumbnail, animation, variant, or
  download fields instead of inferring them.

The viewer derives UI from its data. One item has no carousel. No clips means no
animation controls. No material maps means no material-map section. No download
means no download button. Materials and RAD worlds have no model mesh toolbar.

Keep asset metadata on demand rather than reserving a sidebar. The top-corner
info button opens one centered modal dialog containing the item title, real
metadata, optional animation controls, material maps, prompt, and available
downloads. Keep it closed by default so the canvas and asset remain the primary
surface. Support the close button, Escape, and backdrop click; rely on native
dialog focus containment and restore focus to the info trigger on close. The
dialog must not move the camera framing or bottom inspection controls when it
opens.

Use the same model manifest shape for a single model, animated model, or pack:

```ts
export const assetManifest = {
  kind: "model",
  title: "Living room set",
  prompt: "A coordinated living room furniture set",
  activeItemId: "sofa",
  items: [
    {
      id: "sofa",
      title: "Sofa",
      glbUrl: "/assets/mint/living-room/sofa.glb",
      downloadUrl: "/assets/mint/living-room/sofa.glb",
      thumbnailUrl: "/assets/mint/living-room/sofa.webp",
      animations: [
        {
          id: "sofa-demo",
          label: "Demo",
          url: "/assets/mint/living-room/sofa-demo.glb",
        },
      ],
    },
  ],
} satisfies ViewerManifest;
```

Use the same material manifest shape for one material or a material pack:

```ts
export const assetManifest = {
  kind: "material",
  title: "Ancient stone materials",
  activeItemId: "mossy-stone",
  items: [
    {
      id: "mossy-stone",
      title: "Mossy stone",
      archiveDownloadUrl: "/assets/mint/mossy-stone/maps.zip",
      maps: [
        {
          mapType: "basecolor",
          url: "/assets/mint/mossy-stone/basecolor.png",
          width: 2048,
          height: 2048,
        },
        {
          mapType: "normal",
          url: "/assets/mint/mossy-stone/normal.png",
          width: 2048,
          height: 2048,
        },
      ],
    },
  ],
} satisfies ViewerManifest;
```

Use the remote world runtime without copying it into the project:

```ts
export const assetManifest = {
  kind: "world",
  title: "Generated world",
  format: "RAD",
  thumbnailUrl: "https://cdn.example.com/world-preview.webp",
  runtime: {
    runtimeUrl: "https://cdn.example.com/world.rad",
    collider: {
      runtimeUrl: "https://cdn.example.com/world-collider.glb",
    },
  },
} satisfies ViewerManifest;
```

These URLs are illustrative. Copy only the paths and remote runtime values
returned for the active Mint generation.

## Preserve Model Fidelity

The generated model is the product:

- Render its geometry, materials, textures, UVs, and topology as delivered.
- Treat descriptive prompt words as generation requirements, not reasons to
  add replacement materials, shell layers, shaders, or procedural geometry.
- Do not ship a procedural duplicate of a successful Mint model.
- Do not build a procedural stand-in before generation reaches a terminal
  state.
- Apply normalization to a presentation parent, not the canonical model root.
- Cache authored material references before inspection changes. Restore those
  exact references for material view and never dispose them during a mode
  switch.

Neutral lighting, environment lighting, background, contact shadow, camera
framing, and reversible inspection modes are presentation treatment. Keep them
visually neutral and subordinate to the asset.

## Enable Model Inspection

Center and floor the current model from bounds through a presentation parent.
Frame the normalized result with deliberate OrbitControls limits and provide a
reset action.

Match the Mint viewer's inspection contract in vanilla Three.js:

- Material: restore the exact authored material or material array.
- Solid: assign disposable neutral `MeshStandardMaterial` instances.
- Normal: assign disposable `MeshNormalMaterial` instances.
- Wireframe: independently add disposable `WireframeGeometry` and
  `LineSegments` overlays so it can combine with any display mode.

Traverse meshes once per loaded item. Count vertices and indexed or non-indexed
triangles, accounting for instancing. Preserve the selected inspection mode
when switching asset-pack items. Remove overlays, restore authored materials,
and dispose only temporary inspection resources on switch or teardown.

## Enable Animation Playback

Use `THREE.AnimationMixer` on the active model root:

- Discover embedded clips when the manifest does not declare an explicit list.
- Load explicit external animation GLBs, clone the selected clips, and dispose
  the unused external scenes after extracting their clips.
- Default to the first available clip and play it so the delivered capability
  is visible.
- Show clip selection, previous, next, play, pause, and seek controls only when
  clips exist.
- Update the mixer inside the one viewer loop.
- When switching items, stop actions, uncache the old root and clips, reset the
  playhead, and build a mixer for the new model.

Do not assume arbitrary animation GLBs retarget across skeletons. Use only Mint
animation artifacts produced for the selected model or another explicitly
compatible source.

## Enable Material Inspection

Treat a generated material as a PBR map set, not as a model or a runtime shader
brief. Match Mint's material panel in vanilla Three.js:

- Preview the available maps on a high-resolution sphere at position
  `[0, 0.32, 0]`, using a `2 x 2` texture repeat and anisotropy capped at `8`.
- Use camera position `[0, 0.72, 3.15]`, target `[0, 0.32, 0]`, FOV `50`, pan
  disabled, minimum distance `1.45`, and maximum distance `5.5`.
- Set Base Color to `SRGBColorSpace`. Keep Normal, Roughness, Metalness, and
  Height maps in `NoColorSpace`.
- Use normal scale `[0.88, 0.88]`; use Height as displacement with scale `0.025`.
- When Roughness or Metalness maps are present, set the corresponding scalar to
  `1`; otherwise use neutral fallbacks `0.72` and `0.08`.
- Use neutral multi-directional and environment lighting, no contact shadow,
  and no model mesh inspection modes.
- List the real maps with label, thumbnail, known dimensions, format, and byte
  size. Offer the real map ZIP first; fall back to individual map downloads.
- Dispose the preview geometry, material, and every loaded texture on item
  switch or teardown.

Do not invent missing maps, derive synthetic maps in the browser, recolor the
Base Color map, or replace the generated set with an authored material.

## Enable Pack Browsing

Treat a model asset pack or material pack as its matching viewer focused on one
item:

- Render a bottom thumbnail carousel only when there is more than one item.
- Show selection, stable index, name, thumbnail, and available status.
- Support click selection, previous and next buttons, and left/right keyboard
  navigation outside editable elements.
- On selection, replace the active session, reset its canonical camera, refresh
  details and downloads, and reset model animation state when applicable.
- Preserve the user's model mesh display mode and wireframe preference across
  model items.
- Offer per-item downloads. Offer a pack archive only when the manifest includes
  one.
- Load one full model or one material map set at a time. Do not eagerly
  instantiate every pack item.

## Stream RAD Worlds

Read `mint-world-splats.md` and use its current runtime, transform, camera,
navigation, CDN, paging, and lifecycle contract as the source of truth.

For the Asset Viewer profile:

- Create one `SparkRenderer` for the viewer's `WebGLRenderer`.
- Use `SplatFileType.RAD`, `paged: true`, `raycastable: false`, and renderer LoD.
- Prefer antialiasing off and cap device pixel ratio at `1.5`.
- Load the RAD and collider together under the documented shared transform.
- Keep the collider invisible and use it for aligned bounds validation. Do not
  add physics, avatars, wall constraints, floor snapping, or gameplay to this
  non-game viewer.
- Use the documented authored camera and target rather than automatic
  fit-to-world-bounds.
- Provide orbit, pan, zoom, reset, and desktop spectator WASD. Apply movement to
  both camera and OrbitControls target.
- Show the preview image as a lightweight loading surface when available. Keep
  explicit loading or error UI until both RAD initialization and collider load
  complete.
- Stream directly from Mint CDN. Do not silently replace paged range loading
  with a full-file download.

Remove the shared world root on teardown. Dispose the `SplatMesh`; dispose the
`SparkRenderer` only when its owning WebGL renderer is destroyed.

## Vanilla Three.js Ownership

Translate framework behavior into explicit Three.js owners:

| Framework convenience | Vanilla owner |
| --- | --- |
| Canvas component | `WebGLRenderer`, `Scene`, and `PerspectiveCamera` |
| GLTF hook | `GLTFLoader.loadAsync()` |
| Texture hook | `TextureLoader.loadAsync()` plus explicit color space and disposal |
| Frame hook | One `requestAnimationFrame` or renderer animation loop |
| Animation hook | `AnimationMixer` and `AnimationAction` |
| Orbit component | One `OrbitControls` instance |
| Component unmount | Explicit session and application `dispose()` |
| Reactive component state | Viewer controller plus DOM event handlers |

Do not introduce React or React Three Fiber into the packaged vanilla scaffold.

## Verify The Delivery

Follow `verification-policy.md`. The automatic minimum is:

- Scaffold build and strict TypeScript pass.
- Focused tests for manifest routing, resource ownership, or pure logic when
  changed.
- Every model and animation browser path resolves from its registry mapping.
- Every material map browser path and map type resolves from its registry
  mapping.
- A world manifest includes remote RAD and collider runtime values.
- Model Material -> Solid -> Normal -> Material restores authored materials.
- Wireframe remains an independent reversible overlay.
- Single-model UI has no empty carousel or animation controls.
- Single-material UI has no empty carousel or model mesh controls.
- Pack selection updates the preview, details, map or animation state, and
  downloads.
- Existing app or game requests do not create a second viewer project.

Ask before desktop/browser QA and ask separately before mobile QA. In the final
response, report the Mint handoff, registry keys, viewer variation, controls,
downloads, build evidence, and any unrun QA scope.
