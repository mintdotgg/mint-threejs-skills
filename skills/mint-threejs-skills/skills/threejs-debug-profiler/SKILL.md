---
name: threejs-debug-profiler
description: "Diagnose Three.js rendering, loading, animation, resize, audio, physics, input, mobile, and performance problems using reproduction and measured evidence."
---

# Three.js Debug Profiler

Find the owning cause or measured bottleneck before changing code.

Read `references/debug-profile-checklists.md` for the applicable render,
runtime, loading, mobile, audio, physics, or performance path.

## Debug Workflow

1. Reproduce in the correct build mode.
2. Read the first console, page, and relevant network errors.
3. Check canvas display/drawing-buffer size, renderer/context, and loop ownership.
4. Check camera, clipping, lights, fog, materials, visibility, transforms, and
   scene contents.
5. Check asset paths, loaders, CORS, base path, async ordering, and Mint artifact
   integration.
6. Check delta units, update order, fixed timestep, bodies/colliders, listeners,
   pointer/touch behavior, resize, and audio unlock/decode.
7. Fix the cause in the owning module.
8. Retest the broken path plus screenshot, canvas pixels, and errors.

## Performance Workflow

1. Record target device, viewport, DPR, build mode, and worst-case scenario.
2. Measure frame time/FPS, draw calls, triangles, resources, memory, bundle, and
   expensive shadows/shaders/post-processing.
3. Identify CPU, GPU, memory, or network ownership.
4. Change one bottleneck at a time using reuse, instancing, culling, LOD,
   pooling, disposal, DPR limits, or cheaper rendering.
5. Re-measure the same scenario and verify playability and visuals.

## Final Response

Lead with root cause or bottleneck. Report files changed, baseline/post metrics,
commands, screenshots/artifacts, retested paths, and residual risks.
