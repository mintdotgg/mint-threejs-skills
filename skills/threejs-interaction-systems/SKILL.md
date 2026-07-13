---
name: threejs-interaction-systems
description: "Build Three.js app interaction systems including cameras, controls, picking, selection, manipulation, annotations, configuration UI, loading states, responsive input, and accessibility."
---

# Three.js Interaction Systems

Make 3D interaction predictable, state-driven, responsive, and accessible.

Read `references/interaction-patterns.md` before changing camera controls,
selection, manipulation, configuration, annotations, or general app UI.
For model axes, authoritative transforms, constrained manipulation, or surface
queries, also read `../../references/spatial-contracts.md`.

## Workflow

1. Define the primary user task and supported input methods.
2. Choose one camera/control owner and explicit transition rules.
3. Keep application state outside transient Three.js object state.
4. Implement raycast or GPU picking only at interaction boundaries, with clear
   hover, focus, selected, disabled, and error feedback.
5. Add manipulation, configuration, annotations, playback, or navigation as
   task-specific modules.
6. Keep semantic HTML controls available for important actions and status.
7. Verify pointer, keyboard, touch, resize, cancellation, and loading/error
   paths on relevant viewports.

Use `../../references/mint-mcp-assets.md` for generated production assets.
Ordinary interface chrome should remain HTML/CSS/SVG/Canvas unless a true 3D
surface is required.

## Final Response

Report the interaction model, controls, state ownership, supported input paths,
responsive/accessibility evidence, screenshots, and remaining risks.
