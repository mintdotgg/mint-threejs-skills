---
name: threejs-visual-systems
description: "Build and upgrade Three.js visual systems for apps and games using Mint MCP assets, authored geometry, materials, lighting, shaders, VFX, technical art, and measured performance."
---

# Three.js Visual Systems

Create coherent, readable, performance-aware 3D presentation for general apps
and games.

## Read By Need

- Broad visual architecture: `references/implementation-blueprint.md`.
- Authored models, silhouettes, variants, props, or environment kits:
  `references/model-recipes.md`.
- Renderer, camera composition, lighting, shadows, fog, materials, or VFX:
  `references/render-recipes.md`.
- Custom shaders, material injection, skies, or post-processing:
  `references/shader-cookbook.md`.
- Imported assets, LOD/instancing, budgets, or mobile tradeoffs:
  `references/technical-art.md`.
- Any high-quality completion claim: `references/quality-gates.md`.
- Premium game claims only: `references/game-visual-scorecard.md`.
- Generated assets or derivatives: `../../references/mint-mcp-assets.md`.

## Workflow

1. Capture active screenshots and identify the primary subject, supporting
   content, interaction affordances, and weakest visible surfaces.
2. Define the shot: intended mood, subject scale, lens/FOV, screen occupancy,
   horizon, design viewing distance, motion, and render budget.
3. Improve the image in order: framing and silhouette, scale and depth,
   material identity, lighting hierarchy, atmosphere, then post-processing and
   VFX. Do not use a later layer to repair an unreadable earlier layer.
4. Plan Mint MCP outputs and procedural systems. Store ordinary artifacts at
   stable project paths and record them in the project-root `mint-assets.json`
   through `../../references/asset-pipeline.md`; record and stream world RAD
   manifests through `../../references/mint-world-splats.md`.
5. Build authored forms, reusable factories, shared materials, detail systems,
   and simple interaction or collision proxies.
6. Add lighting, shadows, fog, post-processing, and VFX only after the forms and
   state changes read clearly.
7. Inspect the scene with post disabled and expose useful effect, mask, or pass
   views while tuning complex systems.
8. Measure the worst-case active state and verify desktop/mobile composition.
9. Apply the general quality gate; games additionally use the game scorecard.

## Rules

- Mint MCP is the only generated-asset pipeline.
- Primitives are valid construction tools, not a finished visual identity by
  default.
- Glow, fog, darkness, and bloom cannot substitute for form, composition,
  material craft, interaction clarity, or UI.
- When asked to make a scene beautiful, diagnose the first weak layer in the
  visual order instead of adding effects indiscriminately.
- Repeated geometry should share resources or use instancing where practical.
- Effects must preserve the primary subject and interaction affordances.
- Presentation transforms must not corrupt canonical imported asset transforms.

## Final Response

Report visual changes, Mint links and integrated paths, screenshots,
technical-art budget, renderer diagnostics, quality-gate result, interaction
readability, and remaining blockers. Games also report the game scorecard.
