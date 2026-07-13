# Three.js Interaction Patterns

## Camera And Controls

- Choose controls from the user task: orbit for inspection, first-person for
  navigation, path/cinematic for presentation, transform controls for editing.
- Keep one component responsible for camera pose, target, limits, damping, and
  transitions.
- Provide reset/reframe and a way to escape constrained modes.
- Update projection and control bounds on resize or subject changes.

## Picking And Selection

- Raycast from normalized pointer coordinates against an intentional pick set.
- Resolve child hits to stable application IDs.
- Keep hover and selection in application state; scene materials only project
  that state.
- Clear stale selection when assets unload or filters hide the target.
- Avoid per-frame raycasts when pointer or scene state has not changed.

## Manipulation And Configuration

- Separate canonical model transforms from presentation and user edits.
- Make local/world axes, snapping, constraints, undo/redo, and commit/cancel
  behavior explicit.
- Apply product variants through data-driven adapters rather than scattered mesh
  name checks.
- Dispose replaced materials, textures, geometries, listeners, and controls.

## UI, Loading, And Accessibility

- Use semantic HTML for essential actions, labels, status, and keyboard access.
- Provide progress, empty, unsupported, and actionable error states.
- Keep controls reachable, stable, and outside the primary 3D subject.
- Respect reduced motion and avoid relying on color alone.
- Use Pointer Events and handle capture, cancel, blur, and touch-action rules.

## Minimal Viewer Chrome

For a simple viewer or walkthrough:

- Use one compact, bottom-centered control cluster.
- Place status immediately above the controls.
- Keep loading and errors visible; make the ready state compact or transient.
- List only active inputs; for splat worlds include `WASD move` by default.
- Do not add a top banner.
- Do not expose the asset provider or generation workflow in the interface.
- Let the rendered scene remain the dominant surface.

## Verification

- Exercise the complete journey with mouse, keyboard, and touch when supported.
- Verify resize, high DPR, slow/failed asset loading, mode changes, reset, and
  cleanup.
- Capture active screenshots and check console/page errors and canvas pixels.
