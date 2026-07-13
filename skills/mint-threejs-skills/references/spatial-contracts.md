# Spatial Contracts

Use this reference when an app has imported models with inconsistent axes,
manipulation, actor motion, physics, terrain, navigation, or multiple moving
actors. Skip it for simple static scenes and viewers.

These contracts prevent model orientation, rendering, interaction, physics,
and world queries from developing separate ideas of the same space.

## 1. Declare The Basis

Record the minimum spatial assumptions near scene setup or in the app brief:

- world handedness, units, and scale
- world up, right, and forward axes
- imported model-local up and forward axes
- which transform is canonical and which transforms are presentation offsets

Normalize asset orientation at one boundary, usually an asset wrapper. Do not
scatter compensating rotations through movement, cameras, animation, and UI.

## 2. Separate Intent From Committed State

For constrained motion or manipulation, use this flow:

`input -> proposed intent -> constraints/collision -> canonical state commit -> presentation`

- Intent describes the requested movement or transform.
- Resolution applies bounds, snapping, collision, physics, or permissions.
- The commit updates the one authoritative spatial state.
- Three.js objects, cameras, animation rigs, and UI project from that state.

Simple direct manipulation does not need extra abstractions, but it still needs
one authoritative transform owner.

## 3. Choose Multi-Actor Resolution Semantics

When actors can affect one another, document the update policy:

- **Frame-start:** all actors resolve against the same snapshot.
- **Sequential:** later actors observe earlier committed moves.
- **Non-blocking:** actors ignore one another for resolution purposes.

Choose deliberately based on the experience. Keep iteration order stable and
test crowded or simultaneous motion. A single-actor experience can skip this.

## 4. Share World And Surface Queries

When systems need terrain or surface knowledge, expose one query boundary that
can return only what the app needs, such as:

```ts
import type { Vector3 } from 'three'

type SurfaceSample = {
  point: Vector3
  normal: Vector3
  surface?: string
  region?: string
}

interface WorldQuery {
  sampleSurface(position: Vector3): SurfaceSample | null
}
```

Movement, placement, spawning, navigation, effects, and UI should consume the
same result instead of independently sampling render geometry. The provider may
use raycasting, height data, physics queries, or authored metadata; consumers
should not depend on that implementation.

## Brief Check

For spatially complex work, capture:

- basis, units, and imported model-local axes
- canonical transform owner and presentation offsets
- intent, resolution, and commit owners
- multi-actor policy when applicable
- shared world-query provider when applicable
