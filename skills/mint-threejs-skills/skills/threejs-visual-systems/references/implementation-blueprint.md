# Three.js Visual Systems Blueprint

Use this when a Three.js app or game needs a production visual architecture
that can be iterated, measured, profiled, and reused. For premium or showcase
work, also load `references/technical-art.md`.

## Recommended Ownership

```text
src/assets/MaterialLibrary.ts
src/assets/ProceduralTextures.ts
src/assets/DecalShapes.ts
src/assets/ModelDiagnostics.ts
src/assets/ImportedAssetRegistry.ts
src/assets/modelFactories/HeroFactory.ts
src/assets/modelFactories/ObstacleFactory.ts
src/assets/modelFactories/RewardFactory.ts
src/assets/modelFactories/WorldPropKit.ts
src/systems/LightingRig.ts
src/systems/RenderPipeline.ts
src/systems/VfxSystem.ts
src/systems/WorldArtDirector.ts
src/systems/QualityDiagnostics.ts
```

Keep these boundaries lightweight. In small projects, a single file can contain multiple factories, but the concepts must remain separate: materials, authored geometry, repeated props, effects, render settings, and diagnostics.

## Mint Asset Pipeline

Choose the asset path per surface:

- Procedural Three.js: repeated detail, simple props, rails, track parts, decals, collision proxies, VFX geometry, debug-friendly primitives.
- Mint MCP: primary models, characters, creatures, products, vehicles,
  buildings, props, coherent asset packs, PBR materials, audio, and supported
  model derivatives.
- User/local assets: existing models, images, textures, and audio supplied with the project.
- Hybrid: Mint artifact -> Three.js import -> procedural collision/VFX/prop kit -> visual scorecard.

For premium/AAA/showcase/high-fidelity/less-basic work, read
`../../references/mint-mcp-assets.md` before deciding
generated assets are unnecessary. Use only capabilities exposed by the live
Mint MCP host.

Use Mint MCP when generated model fidelity will materially improve the active screenshot. Do not generate every repeated small prop; use instancing and procedural kits for volume.

For premium hero surfaces, procedural-only is not a valid final choice unless the user requested it, Mint MCP lacks the capability, generation/artifact retrieval is blocked, or the project is explicitly local-only. Repeated low-value props can stay procedural.

Record each generated surface, Mint status and `chatUrl`, local artifact path
or remote world runtime manifest, stable `mint-assets.json` logical key,
integration, and verification or blocker using
`../../../references/mint-mcp-assets.md` and
`../../../references/asset-pipeline.md`.

## Production Surfaces

For general apps, cover the primary subject, supporting context, selected or
configured state, interaction affordances, loading/error presentation, UI
cohesion, materials, lighting, motion, and diagnostics.

For premium games, touch every weak visible surface:

- Hero/player: authored silhouette, state feedback, decals/trim, readable front/up/side, collision proxy.
- Hazards/enemies: at least three distinct silhouettes with telegraphs and material cues.
- Rewards/interactables: at least two forms with collection states and motion/VFX hooks.
- World kit: foreground, playable lane/arena, midground, background/parallax, set dressing, scale cues.
- Materials/textures: shared PBR/stylized material library, procedural panel lines, noise, trim, wear, emissive masks.
- Lighting/render: color space, tone mapping, exposure, shadows/contact, fog/depth, post-processing discipline.
- VFX/motion: event-driven bursts, trails, impact rings, speed lines, shield/boost states, pickup/fail feedback.
- UI/world cohesion: UI colors, icons, alerts, and meters echo gameplay materials and status colors.
- Diagnostics: renderer counts, material/geometry/texture counts, screenshots, scorecard.

For imported generated models, require downloaded GLB/PBR output, import
wrappers with scale/pivot/bounds, simple collision proxies, animation clips
when relevant, and triangle/material/texture/file-size diagnostics. For Mint
worlds, use the remote RAD/SparkJS contract in
`../../../references/mint-world-splats.md` instead.

## Technical Art Contract

Before broad implementation, write the technical art brief and render budget from `references/technical-art.md`: hero vs support surfaces, render budget target, material kit roles, shader/VFX purpose, instancing/LOD/culling plan, and imported asset cleanup. Treat that brief as part of this graphics architecture.

Do not add costly effects until this contract exists. A technical-art pass should make the scene more authored and more measurable at the same time.

## Material Library

Implement the named material-role kit defined in `references/technical-art.md` (`bodyPrimary`, `bodySecondary`, `trim`, `hazard`, `reward`, `glass`, `emissiveSignal`, `groundContact`, `decalDark`/`decalLight`, plus shared UI/world signal colors) in `src/assets/MaterialLibrary.ts`. Create named roles instead of one-off colors and share materials across repeated meshes.

## Procedural Texture And Decal Kit

Use canvas textures, shape geometry, or thin offset meshes for detail that would otherwise require imported assets:

- Panel lines and access hatches.
- Trim sheets and edge bands.
- Window strips, city light grids, arena markings.
- Hazard stripes, arrows, target indicators, lane glyphs.
- Scratches, wear, noise, dirt, heat tint, scorch marks.
- UI/world icon motifs reused in HUD and diegetic markers.

Set texture filtering, mipmaps, repeat/wrap, color space, and anisotropy intentionally. Avoid unique full-size textures for tiny repeated marks.

For high-value 2D source art, use a Mint MCP image capability only when the
live host exposes one. Otherwise use user-provided assets or authored
CSS/SVG/Canvas content. Do not substitute another generation API.

## Model Factories

Factories should return a grouped object plus metadata:

```ts
type ModelFactoryResult = {
  root: THREE.Group;
  collision?: THREE.Object3D;
  lod?: THREE.LOD;
  bounds?: THREE.Box3;
  diagnostics?: {
    meshes: number;
    materials: number;
    geometries: number;
    triangles?: number;
  };
};
```

Use named child meshes for readable debugging. Separate visual detail from collision proxies. Keep repeated detail instanced where practical.

For imported Mint-generated 3D models, create an `ImportedAssetRegistry` or loader wrapper that returns similar metadata: root group, bounds, collision proxy, animation clips, and diagnostics. Never put Mint MCP calls in browser runtime code.

## World Art Director

Build the world as layers:

- Play layer: ground, lanes, rails, objective path, hazards, pickups.
- Near layer: speed props, signs, arches, barriers, debris, foreground occluders used carefully.
- Mid layer: buildings, cliffs, hangars, pillars, platforms, arena machinery.
- Far layer: skyline, terrain silhouettes, nebula/cloud/fog cards, parallax planes.
- Motion layer: speed lines, particles, trail strips, dust, sparks, screen-space UI feedback.

Every layer should support interaction readability. Games additionally protect
threats, rewards, and the next player decision.

## Render Pipeline

Own renderer setup in one place:

- `outputColorSpace = THREE.SRGBColorSpace`.
- Tone mapping and exposure selected for the art direction.
- DPR capped for mobile and high-density displays.
- Shadows enabled only for objects that benefit from grounding.
- Post-processing is limited and measured: bloom, vignette, chromatic aberration, film grain, or color grade only when they improve authored forms.
- Resize updates canvas, renderer, camera, composer, and UI CSS variables.

## VFX System

Implement the event-driven VFX language from `references/technical-art.md` in `src/systems/VfxSystem.ts`. Effects should be pooled, readable, and tied to state; they must clarify state instead of adding permanent particle clutter.

## Diagnostics

Own diagnostics in `src/systems/QualityDiagnostics.ts`. Report the renderer diagnostics defined in `references/technical-art.md` (calls, triangles, geometries, textures, material count, DPR/post/shadow settings), plus these architecture-specific counts:

- Scene mesh count, instanced mesh count, unique materials/geometries/textures.
- Approximate visible prop counts by layer.
- Screenshot paths and visual scorecard.
- Performance notes after post-processing, shadows, or many repeated props.

## Browser Real-Time Budgets

Use the render budget starting points and instancing/LOD/culling guidance in `references/technical-art.md`, then measure on the target game after every major graphics pass.

## Implementation Order

1. Score active screenshots and identify the weakest three categories.
2. Add material and diagnostic foundations.
3. Decide which weak surfaces need procedural, user/local, Mint MCP, or hybrid treatment.
4. Build/import the primary subject and one complete supporting-content family;
   games use the hero plus obstacle/reward profile.
5. Add world prop kit and layered composition.
6. Add lighting/render polish.
7. Add event-driven VFX.
8. Re-score desktop/mobile active screenshots.
9. Optimize measured bottlenecks.
