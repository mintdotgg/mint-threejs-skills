# Spatial Contracts

Use this reference when an app has imported models with inconsistent axes,
manipulation, actor motion, physics, terrain, navigation, multiple moving
actors, or an interactive visual that must match gameplay colliders and
sensors. Skip it for simple static scenes and viewers.

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

## 5. Align Interactive Assets By Semantic Landmarks

Overall bounds are useful for rough scale and floor placement, but they rarely
identify the exact feature that gameplay cares about. A goal opening, vehicle
axle, door hinge, muzzle, socket, board face, or button surface needs a named
landmark contract.

Record each critical landmark in one place:

| Field | Meaning |
| --- | --- |
| visual feature | The player-visible feature that implies interaction |
| asset-local landmark | A named node or measured point/plane in source space |
| gameplay target | The authoritative world/logical point, line, plane, or volume |
| owner | Visual wrapper, collider, sensor, or simulation state |
| tolerance | Maximum accepted world- and, when camera-specific, screen-space delta |

Normalize scale and orientation once, then solve the presentation wrapper from
these landmarks. Keep measured source coordinates and their provenance beside
the wrapper constants. Do not move authoritative colliders or sensors merely
to hide a generated asset's pivot, yaw, or feature offset. Detailed render
topology should not become collision geometry by accident.

For fixed-camera or 2.5D games, world-space agreement alone can still look
wrong because projection and gameplay may use different planes. Project both
the visual landmarks and gameplay targets through the active camera into the
same logical or CSS-pixel coordinate system, expose their deltas in diagnostics,
and test explicit tolerances at the supported viewports.

## 6. Separate Asset Repair From Gameplay Alignment

First determine whether a visible dislocation is a transform mismatch or a
real mesh defect. Inspect the source bounds, orientation, landmark positions,
and local vertex/topology distribution before applying offsets.

- Fix scale, rotation, pivot, and feature offsets on the presentation wrapper.
- Prefer regenerating an asset whose pose, silhouette, or connectivity is
  broadly wrong.
- If an otherwise accepted asset has one small, measured gap, a localized
  project-owned adapter mesh may bridge it. Attach the adapter to the same
  visual wrapper, keep it out of collision and scoring, name its parts, and
  include its mesh/triangle cost in diagnostics.
- Never repair a visual gap by silently moving the score sensor, goal plane, or
  collision proxies away from their gameplay contract.
- Verify the repair from the actual gameplay camera, not only in a turntable or
  editor view.

## Brief Check

For spatially complex work, capture:

- basis, units, and imported model-local axes
- canonical transform owner and presentation offsets
- critical asset-local landmarks, gameplay targets, and tolerances
- world-to-screen projection method when camera-specific alignment matters
- intent, resolution, and commit owners
- multi-actor policy when applicable
- shared world-query provider when applicable
- whether any project-owned adapter geometry is visual-only
