---
name: threejs-app-director
description: "Build and upgrade general Three.js apps including model viewers, configurators, walkthroughs, simulations, visualizations, editors, showcases, and interactive experiences."
---

# Three.js App Director

Own the complete non-game 3D application outcome. Do not invent game objectives,
scoring, failure, or progression unless the experience genuinely needs them.

Read `references/app-patterns.md` for the matching application archetype.
For imported-model orientation, manipulation, simulation, terrain, or other
spatially complex work, read `../../references/spatial-contracts.md`.

## Route The Work

| Need | Skill |
| --- | --- |
| Models, composition, materials, lighting, shaders, VFX | `../threejs-visual-systems/SKILL.md` |
| Cameras, controls, picking, selection, configuration, manipulation, UI | `../threejs-interaction-systems/SKILL.md` |
| Rendering, loading, input bugs, profiling, optimization | `../threejs-debug-profiler/SKILL.md` |
| Browser QA, visual regression, production release | `../threejs-qa-release/SKILL.md` |
| Game mechanics or game feel inside a mixed experience | `../threejs-gameplay-systems/SKILL.md` |

## Workflow

1. Inspect the existing stack, scene lifecycle, assets, interactions, UI, data
   ownership, loading states, target devices, and deployment constraints.
2. Define the app brief: user goal, primary 3D subject, essential interactions,
   camera/control model, state or data flow, loading/error behavior, outputs,
   and performance budget.
3. Establish one owner for renderer, scene, camera, animation frame, resize,
   asset lifecycle, and disposal.
4. Use Mint MCP through `../../references/mint-mcp-assets.md` when production
   assets are needed. Register ordinary artifacts and remote world runtime
   configuration in the project-root `mint-assets.json` through
   `../../references/asset-pipeline.md`; stream world RAD manifests through
   `../../references/mint-world-splats.md`.
5. Implement the smallest complete user journey before secondary polish.
6. Apply visual systems and interaction guidance appropriate to the archetype.
7. Reproduce and measure defects or performance issues before optimizing.
8. Follow `../../references/verification-policy.md`: run the automatic minimum,
   then offer a scoped desktop/browser QA pass. Treat mobile as a separate
   approval.

## Completion Gates

- Build/typecheck or the nearest compile gate passes.
- Focused non-browser tests for changed logic pass when available.
- Referenced project-local assets and changed imports resolve.
- `mint-assets.json` records every integrated Mint artifact or remote world
  runtime under a stable logical key.
- Report that extended browser QA was not run unless the user approved it.

After the user approves the relevant QA scope:

- The primary user journey works through real input.
- Camera and controls match the task and do not fight each other.
- Loading, empty, unsupported, and error states are handled when applicable.
- Selection, configuration, manipulation, playback, or navigation state has one
  owner and visible feedback.
- Assets load from stable local paths or the deliberate remote world runtime
  with correct scale, orientation, materials, animation, bounds, and disposal.
- Desktop behavior is verified; mobile behavior is verified only under its
  separate approval.
- Build/typecheck, browser errors, canvas pixels, screenshots, and changed risky
  paths pass.
- Visual quality and renderer cost meet the requested bar.

## Final Response

Lead with the implemented user journey. Report controls, state ownership, changed
files, Mint links and artifact paths, screenshots, verification, performance
evidence, deployment assumptions, and remaining risks. Explicitly name the
extended desktop and mobile QA that was not run.
