# Visual Quality Gates

## Evidence Set

For a meaningful visual-quality claim, capture or inspect:

- A reproducible design view with fixed camera, state, and seed where relevant.
- The final composite and the same view with post-processing disabled.
- Effect-only or mask/pass views for complex authored effects.
- Near, intended, and far viewing distances.
- A dense or otherwise worst-case visual state.
- Real camera/object motion for shimmer, popping, trails, and temporal stability.
- The reduced quality tier, confirming it preserves the defining visual
  mechanism rather than merely disabling it.

A single favorable screenshot is supporting evidence, not a complete visual
validation.

## Shared Gate

### Composition And Content

- The primary subject and essential interactions are immediately readable.
- Supporting content establishes scale, depth, hierarchy, and context without
  competing with the subject.
- Art direction is coherent across geometry, materials, lighting, motion, UI,
  and state feedback.
- Primitive stacks, stretched boxes, generic panels, or glow-only changes do not
  dominate unless explicitly intentional.

### Models And Materials

- Forms read from the intended camera before small detail or post-processing.
- Detail supports role and scale through trims, panels, curves, bevels, decals,
  sockets, ridges, or emissive accents.
- Shared material roles vary roughness, metalness, color, emissive, and texture
  intentionally.
- Repeated objects share geometry/materials or use instancing.
- Imported Mint artifacts have scale, orientation, pivot, bounds, file size,
  triangles, materials, textures, clips, and disposal checked as applicable.

### Lighting, Motion, And Readability

- Renderer color space, tone mapping, exposure, DPR, and shadows are intentional.
- Lighting and fog clarify depth and state.
- Post-processing and VFX have user-facing purpose and bounded cost.
- Important state is not conveyed by color alone.
- Effects remain readable during interaction and do not hide controls or UI.
- Desktop and mobile active screenshots pass when mobile is in scope.

### Performance

- Measure the worst-case active state, not only an idle view.
- Report draw calls, triangles, geometries, materials, textures, frame time/FPS,
  DPR, shadows, and post-processing when available.
- Use LOD, culling, instancing, reuse, pooling, atlases, or simpler far variants
  where they materially help.
- Resource ownership and disposal are explicit.
- Every deliberate budget overrun has a user-facing justification.

## General App Profile

- Primary subject framing, loading state, interaction affordances, selected or
  configured state, and error/empty behavior are visually coherent.
- Viewer/configurator/editor UI feels part of the product rather than a generic
  dashboard layered over a canvas.
- Presentation transforms stay separate from canonical asset data.
- Before/after evidence demonstrates the complete user journey.

## Game Profile

Use `references/game-visual-scorecard.md`.

- Hero, threats, rewards, world, UI, and motion have distinct silhouettes and
  feedback language.
- At least three hazard/enemy variants and two reward/interactable variants are
  expected for premium games unless the design clearly does not use them.
- World art provides foreground, midground, and background depth.
- Fill all ten scorecard categories. Every category is at least 2 and the
  average is at least 2.3.
- Showcase requires at least six categories at 3, none below 2, and average at
  least 2.7.
- Review every automatic failure and run a fresh-eyes review against the complete
  screenshot set and measured evidence.
