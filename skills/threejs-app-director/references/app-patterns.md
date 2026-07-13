# Three.js App Patterns

Choose the smallest architecture that supports the actual user journey.

## Model Viewer Or Showcase

- Center and frame content from bounds; do not assume provider scale.
- Provide deliberate orbit/pan/zoom limits, reset view, loading progress, and
  unsupported/error states.
- Support animation, material variants, annotations, fullscreen, capture, or AR
  only when requested.
- Keep presentation transforms separate from canonical asset transforms.

## Product Configurator

- Store variant state outside scene objects.
- Map configuration state to model visibility, materials, colors, accessories,
  and pricing or metadata through one adapter.
- Preserve camera framing while variants change.
- Expose deterministic URLs or saved state when sharing/configuration persistence
  is required.

## Walkthrough Or Interactive Experience

- Choose orbit, first-person, path-based, or hybrid navigation deliberately.
- Define collision, movement bounds, focus transitions, wayfinding, and escape
  from constrained camera states.
- Use progressive loading and LOD for large environments.
- Treat game mechanics as optional modules, not the default architecture.

## Simulation Or Visualization

- Separate source data, simulation state, rendering projection, and UI filters.
- Keep units, axes, time step, interpolation, and color/scale legends explicit.
- Support pause, reset, scrub, compare, or inspect interactions as required.
- Prefer deterministic state for tests and reproducible captures.

## Editor Or Authoring Tool

- Separate document state, selection, commands/history, viewport presentation,
  and persistence.
- Use picking plus transform controls with explicit local/world space.
- Make undo/redo, dirty state, save/export, and destructive operations visible.
- Do not let scene objects become the only source of document truth.

## Shared Quality Gate

- The primary subject is framed and readable at first meaningful render.
- The essential journey is discoverable without explanatory marketing content.
- Interactions provide hover/focus/selected/disabled/error feedback as relevant.
- Loading and failure states never leave a blank unexplained canvas.
- Resize, high DPR, mobile input, asset cleanup, and production paths are tested.
- Renderer diagnostics and asset budgets are reported when complexity changes.
