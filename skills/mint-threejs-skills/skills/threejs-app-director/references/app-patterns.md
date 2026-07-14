# Three.js App Patterns

Choose the smallest architecture that supports the actual user journey.

## Asset Viewer Delivery

- Center and frame content from bounds; do not assume provider scale.
- Provide deliberate orbit/pan/zoom limits, reset view, loading progress, and
  unsupported/error states.
- Use the canonical Asset Viewer scaffold for one generated model, an animated
  model, a model asset pack, one material, a material pack, or one explicitly
  requested Mint RAD world.
- Derive UI from available data: omit the carousel for one item and animation
  controls when no clips exist. Show material-map details only for materials
  and model mesh modes only for models.
- Preserve generated model materials by default. Material, solid, normal, and
  wireframe inspection modes are presentation state, not asset edits.
- Preview Mint materials as delivered map sets on the canonical tiled sphere;
  do not replace their PBR maps with authored colors or shaders.
- Keep presentation transforms separate from canonical asset transforms.

## Model Showcase Or Product Viewer

- Use this app route when the user asks for authored presentation, annotations,
  configuration, storytelling, custom navigation, fullscreen, capture, AR, or
  other experience behavior beyond asset inspection and download.
- Keep the requested product journey primary; do not fall back to the canonical
  Asset Viewer when a broader application was explicitly requested.

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
