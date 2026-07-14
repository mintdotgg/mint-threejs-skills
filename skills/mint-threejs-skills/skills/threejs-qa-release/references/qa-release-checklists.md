# Three.js QA And Release

Use after the user approves the relevant extended QA scope. For the automatic
minimum and approval boundary, follow `../../../references/verification-policy.md`.

## Approved Desktop Browser Matrix

- Dependencies and target build mode are known.
- Build/typecheck passes and the intended dev or preview URL is open.
- Console, page, and relevant network errors are captured.
- Canvas display/drawing-buffer sizes are nonzero; pixel sampling is nonblank
  and visually varied.
- Active desktop screenshot exists.
- Primary input changes visible application state.
- Changed and risky paths are exercised.
- UI text fit, overlap, safe areas, touch targets, and resize are checked.
- Imported/Mint artifact paths, size, loading, scale, orientation, materials,
  animation, and disposal are checked as applicable.
- Renderer diagnostics are captured when visual complexity changes.
- Visual-harness decision is recorded when regression risk is meaningful.

Do not add mobile to this matrix without separate mobile approval.

## Primary Journey

For general apps, exercise the relevant journey:

- Load the primary subject and recover from a failed or unsupported load.
- Navigate, orbit, inspect, select, configure, annotate, manipulate, play,
  pause, reset, save, export, or share as the product requires.
- Verify state persists or resets according to the product contract.
- Confirm mode changes and selection cannot leave controls stuck.

For games, additionally exercise:

- Start/resume, movement or primary verb, objective progress, reward/feedback,
  pressure or hazard, fail/retry when relevant, pause, and restart.
- Physics body/collider cleanup, sensors, CCD, and tunneling when applicable.
- Audio unlock, main SFX, loops, pause/resume, cleanup, mute, and volume.

Screenshots do not replace interaction testing.

## Visual QA

Shared checks:

- Primary subject, controls, selected/configured state, loading/error state, and
  UI hierarchy are readable.
- Composition works on the approved desktop viewport. Check mobile only after
  separate mobile approval.
- UI and VFX do not obscure important content or interaction affordances.
- Imported assets have correct presentation and stable local paths, or an
  explicit remote RAD runtime path for Mint worlds.
- Before/after evidence exists for meaningful visual changes.

Games claiming premium quality additionally use
`../threejs-visual-systems/references/game-visual-scorecard.md` and reject
primitive-dominant scenes, flat worlds, generic stat-card HUDs, repeated
silhouettes, glow/fog hiding missing craft, and missing renderer evidence.

## Interactive Asset And Physics Event Proof

When a generated/imported visual represents a collider, sensor, target, goal,
or other physics-critical affordance, verify both what the player sees and the
simulation event it implies.

- Expose the visual semantic landmarks and authoritative gameplay targets in
  diagnostics using the same world/logical coordinate contract. For
  camera-specific games, also report projected screen-space deltas and explicit
  tolerances; see `../../../references/spatial-contracts.md`.
- Assert the production asset loaded, the relevant fallback is inactive, and
  the expected mesh/triangle/material budget is plausible before measuring
  alignment.
- Use a real pointer, keyboard, touch, or gamepad path for the primary proof.
  Test hooks may freeze or inspect evidence states, but must not be the only way
  the objective succeeds.
- For a directional sensor, retain the fixed-step sample immediately before the
  event and the accepted sample. Prove direction, interpolated crossing point,
  effective full-body aperture, and one-attempt duplicate guard; see
  `../../threejs-gameplay-systems/references/physics-engine-selection.md`.
- Capture complementary evidence: a video of the real-input journey, stills on
  both sides of the event boundary, and a machine-readable assertion report.
  A still should show the score/state before the complete body crosses, and a
  later still should show the changed score/state after it crosses.
- If a headless compositor defect requires a capture-only safe mode, suppress
  only decorative rendering. Do not change input, simulation, colliders,
  sensors, scoring, camera, or asset transforms, and disclose the exact
  suppression in the report.
- Re-run the proof against the production preview or deployed URL when the
  release path, asset hosting, or build mode could change behavior.

## Visual Regression

When warranted:

- Seed or freeze randomness, camera shake, particles, time, debug UI, and
  dynamic overlays.
- Await fonts, textures, models, animation state, and the first meaningful frame.
- Cover active desktop/mobile plus changed loading, error, selected,
  configured, menu, HUD, fail, or generated-asset states.
- Keep canvas smoke and interaction tests alongside screenshots.
- Report baseline update/compare commands, paths, thresholds, masks, and flake
  risks.

## Separately Approved Mobile And Input

- Pointer capture, release, cancel, blur, and orientation changes cannot leave
  controls stuck.
- Safe areas and touch targets are reachable and separated.
- Page scroll/zoom does not steal intended 3D interaction.
- DPR is capped when necessary.
- Desktop controls continue working unless intentionally removed.
- UI remains readable on narrow screens.

## Performance

When rendering, assets, physics, shaders, shadows, or post-processing change:

- Record viewport, DPR, build mode, worst-case state, calls, triangles,
  geometries, materials, textures, and FPS/frame time when available.
- Record physics engine, timestep, bodies, colliders, sensors, CCD, and expensive
  contacts when physics changes.
- Note LOD, culling, instancing, disposal, DPR, shadow, and post decisions.
- Compare before/after for optimization work.
- State unmeasured risk honestly.

## Release

- Production build and preview/static server pass.
- Vite `base` and asset URLs match the target host.
- Debug panels, diagnostics, verbose logs, and test shortcuts are gated.
- Bundle and large assets are reviewed.
- Mint MCP credentials, raw handles, and internal artifact URLs are absent from
  client code and built output.
- Public assets load under static-host assumptions.
- Physics-critical imported visuals retain their measured landmark alignment
  in the production build and deployed camera/viewports.
- Browser support, deployment command, artifact location, and risks are
  documented.

## Evidence

```text
QA result:
Automatic minimum:
Approved extended scope:
Commands and URL:
Primary journey or game loop:
Controls and viewports:
Screenshots/artifacts:
Console/page/network errors:
Canvas metrics:
Renderer/performance:
Mint asset evidence:
Visual harness:
Game bot/physics/audio, when relevant:
Issues fixed:
Residual risks:
Extended checks not run:
```
