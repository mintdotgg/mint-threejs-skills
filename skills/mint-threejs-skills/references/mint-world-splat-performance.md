# Mint World Splat Performance

Use this reference when a Mint world or another Gaussian-splat experience is
slow to become visible, stalls the main thread, re-downloads assets, or becomes
expensive after it is ready. Apply it after `mint-world-splats.md`; that file's
runtime, transform, collider, and lifecycle contracts still win.

## Contents

- Choose the runtime path
- Measure the critical path
- Finite-asset preview pipeline
- Prepacked preview artifact
- Request and snapshot cache
- Progressive preview-to-full handoff
- Current and adjacent world prefetch
- Spark update scheduling
- LOD, DPR, and quality profiles
- Hosting and browser cache
- Disposal and failure behavior
- Verification gates

## Choose The Runtime Path

Do not apply one loading strategy to every splat format.

### Remote Mint RAD

- Keep the manifest RAD URL remote and use `SplatFileType.RAD` with
  `paged: true`.
- Keep byte-range behavior intact. RAD paging is the network optimization; do
  not mirror, prepack, or replace it with an eager full-file fetch merely to
  use the finite-asset recipe below.
- Create one `SparkRenderer` per Three.js renderer. Enable renderer LoD, cap
  DPR, and keep the collider on the same root transform.
- A full RAD prefetch defeats paging. At most warm the manifest/connection when
  measurement proves it helps; let Spark own page selection and range traffic.

### Project-Owned Finite SPZ Or Splat

Use the rest of this reference only when the project already owns or is
explicitly allowed to derive a finite SPZ/splat artifact. This path is useful
for offline apps, fixed local worlds, rapid transitions across a known sequence,
or a deliberately degraded preview shown before a higher-fidelity source.

The proven order of operations is:

1. Build a small deterministic preview offline.
2. Prepack that preview into Spark's `PackedSplats` memory layout.
3. Fetch and validate the packed snapshot once per URL.
4. Return a fresh disposable `PackedSplats` wrapper to each consumer while
   sharing the immutable typed-array snapshot.
5. Show the preview first, then begin the full asset.
6. Keep the preview visible until the full mesh makes a measured render
   contribution, not merely until its download or initialization promise ends.
7. Idle-prefetch only the likely next worlds, within a bounded cache.

In one measured production case, a 1.92 million-splat, roughly 30 MB SPZ
produced a 40,000-splat, roughly 640 KB prepacked preview. Treat those numbers
as a starting point, not a universal budget. Measure visual coverage, time to
first visible splat, memory, and transition latency on the target device.

## Measure The Critical Path

Record these timestamps and sizes in a production build:

- Navigation or world-selection start.
- Preview fetch start/end and transferred bytes.
- Preview `initialized` and first nonzero render contribution.
- Full fetch start/end and transferred bytes.
- Full `initialized` and first useful render contribution.
- Preview removal.
- Collider ready.
- Main-thread long tasks, peak JS heap when available, and frame time during
  decode/packing/sorting.

Also capture source splat count, preview count, `SparkRenderer.activeSplats`,
renderer LoD settings, viewport, DPR, connection, device class, and whether the
visit was cold or warm. Initialization alone is not a visible-ready metric.

Classify the delay before changing code:

- Network: large transfer, missing range/cache headers, duplicate fetches.
- Parse/pack: bytes arrive quickly but the main thread stalls before a mesh can
  initialize.
- Sort/upload: the mesh initializes but no useful splats contribute yet.
- GPU: first pixels arrive, then frame time or memory becomes unacceptable.
- App scheduling: current and future worlds compete for bandwidth or CPU.

## Finite-Asset Preview Pipeline

Build previews during asset preparation, never on the user's critical path.
The working pipeline used a deterministic stride sample so repeated builds are
stable and every source region remains represented:

```js
const stride = Math.max(1, Math.ceil(sourceCount / targetCount));
const phase = deterministicSeed % stride;

function selectedOrdinal(sourceIndex) {
  if (sourceIndex < phase) return -1;
  const shifted = sourceIndex - phase;
  return shifted % stride === 0 ? shifted / stride : -1;
}
```

Use a stable asset identifier to derive `deterministicSeed`; do not use
`Math.random()` in a reproducible build. Copy center, color, alpha, scale, and
rotation data that the source reader exposes. If the preview path cannot retain
rotation, label it as a temporary preview and verify that its appearance is
acceptable before shipping.

Sparse previews often expose holes. A density-aware scale compensation can
restore coverage without raising the count:

```js
const densityScale = Math.min(
  2,
  Math.max(1, Math.sqrt(referenceCount / Math.max(1, selectedCount))),
);
```

Apply the multiplier to preview splat scales only. The `2` cap and reference
count are tuning inputs. Validate halos, excessive overlap, thin geometry, and
silhouette growth across several worlds; do not copy one scene's scale boost
blindly.

Keep manifest metadata beside the derived artifact:

```json
{
  "previewUrl": "/worlds/canyon.preview.packed-splat",
  "previewSourceUrl": "/worlds/canyon.spz",
  "previewRecords": 40000,
  "sourceRecords": 1920000,
  "previewStride": 48,
  "previewBytes": 655376,
  "previewScaleCompensation": 2,
  "previewFormatVersion": 1
}
```

Version or content-hash the URL whenever the bytes change.

## Prepacked Preview Artifact

Parsing a compact custom `.splat` file and calling `pushSplat` for every record
in the browser still spends main-thread time on packing. The faster path builds
`PackedSplats` offline and persists its `Uint32Array`.

This is a project-owned cache artifact, not an official Spark interchange
format. Use a versioned header and validate it before constructing Spark
objects. A proven little-endian layout is:

| Bytes | Value |
| --- | --- |
| `0..3` | ASCII magic `MLPK` |
| `4..7` | format version, currently `1` |
| `8..11` | logical splat count |
| `12..15` | packed `Uint32Array` element count |
| `16..end` | raw packed array bytes |

Offline writer core:

```js
import { PackedSplats } from "@sparkjsdev/spark";

const packed = new PackedSplats({ maxSplats: selectedCount });

for (const record of selectedRecords) {
  packed.pushSplat(
    record.center,
    record.scale,
    record.quaternion,
    record.opacity,
    record.color,
  );
}

if (!packed.packedArray) throw new Error("Packed preview produced no array");

const headerBytes = 16;
const body = Buffer.from(
  packed.packedArray.buffer,
  packed.packedArray.byteOffset,
  packed.packedArray.byteLength,
);
const file = Buffer.alloc(headerBytes + body.byteLength);
file.write("MLPK", 0, "ascii");
file.writeUInt32LE(1, 4);
file.writeUInt32LE(packed.numSplats, 8);
file.writeUInt32LE(packed.packedArray.length, 12);
body.copy(file, headerBytes);
packed.dispose();
```

Browser parser core:

```ts
type PackedSnapshot = {
  numSplats: number;
  packedArray: Uint32Array;
  extra: Record<string, unknown>;
};

function parsePackedSnapshot(buffer: ArrayBuffer, url: string): PackedSnapshot {
  if (buffer.byteLength < 16) throw new Error(`Truncated packed splat: ${url}`);

  const view = new DataView(buffer);
  const magic = [77, 76, 80, 75]; // MLPK
  if (!magic.every((byte, index) => view.getUint8(index) === byte)) {
    throw new Error(`Invalid packed splat header: ${url}`);
  }

  const version = view.getUint32(4, true);
  const numSplats = view.getUint32(8, true);
  const uint32Count = view.getUint32(12, true);
  const bodyBytes = uint32Count * Uint32Array.BYTES_PER_ELEMENT;

  if (version !== 1) throw new Error(`Unsupported packed splat v${version}: ${url}`);
  if (buffer.byteLength !== 16 + bodyBytes) {
    throw new Error(`Malformed packed splat byte length: ${url}`);
  }
  if (uint32Count % 4 !== 0 || numSplats > uint32Count / 4) {
    throw new Error(`Inconsistent packed splat counts: ${url}`);
  }

  return {
    numSplats,
    packedArray: new Uint32Array(buffer, 16, uint32Count),
    extra: {},
  };
}
```

The body offset must respect typed-array alignment. Keep the header at a
multiple of four bytes. Reject truncated, unknown-version, or inconsistent
files; do not pass unvalidated bytes to the renderer.

## Request And Snapshot Cache

Cache promises, not only completed values. That coalesces a prefetch and a live
load that ask for the same URL at the same time. Keep raw bytes and validated
packed snapshots in separate bounded maps:

```ts
import { PackedSplats } from "@sparkjsdev/spark";

const byteCache = new Map<string, Promise<ArrayBuffer>>();
const snapshotCache = new Map<string, Promise<PackedSnapshot>>();
const MAX_PREVIEW_ENTRIES = 4;

function prune<T>(cache: Map<string, Promise<T>>, activeUrl: string, max: number) {
  for (const url of cache.keys()) {
    if (cache.size <= max) break;
    if (url !== activeUrl) cache.delete(url);
  }
}

export function fetchSplatBytes(url: string) {
  const cached = byteCache.get(url);
  if (cached) return cached;

  const request = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Splat fetch failed ${response.status}: ${url}`);
      return response.arrayBuffer();
    })
    .catch((error) => {
      byteCache.delete(url); // A retry must not inherit a rejected promise.
      throw error;
    });

  byteCache.set(url, request);
  prune(byteCache, url, MAX_PREVIEW_ENTRIES);
  return request;
}

export function fetchPackedSnapshot(url: string) {
  const cached = snapshotCache.get(url);
  if (cached) return cached;

  const request = fetchSplatBytes(url)
    .then((bytes) => parsePackedSnapshot(bytes, url))
    .catch((error) => {
      snapshotCache.delete(url);
      throw error;
    });

  snapshotCache.set(url, request);
  prune(snapshotCache, url, MAX_PREVIEW_ENTRIES);
  return request;
}

export async function loadPackedPreview(url: string) {
  const snapshot = await fetchPackedSnapshot(url);
  return new PackedSplats({
    numSplats: snapshot.numSplats,
    packedArray: snapshot.packedArray,
    extra: { ...snapshot.extra },
  });
}
```

Important ownership rules:

- Share fetched bytes and the immutable packed typed array.
- Return a new `PackedSplats` wrapper per mounted consumer because consumers
  dispose it independently.
- Never cache and share a disposable `SplatMesh` or `PackedSplats` instance.
- Delete rejected promises so retry works.
- Bound entry counts. Adjacent-world prefetch must not retain an entire course.
- Add explicit cache reset for tests, logout/tenant changes, and memory-pressure
  recovery when applicable.

The same promise-cache pattern works for collider JSON or GLB fetches. Keep its
capacity separate because collider and visual lifetimes may differ.

## Progressive Preview-To-Full Handoff

Prioritize the preview instead of starting two expensive decode/sort paths at
once:

1. Fetch and initialize the preview.
2. Force one Spark update so it can contribute pixels.
3. Open the full-load gate. Begin the full source while the preview stays
   visible.
4. When the full mesh initializes, force its first update.
5. Hide and dispose the preview only after the full mesh contributes enough
   active splats.

A practical visible-ready predicate is:

```ts
function hasUsefulContribution(renderer: SparkRenderer, mesh: SplatMesh) {
  const expected = Number(mesh.numSplats ?? 0);
  if (!Number.isFinite(expected) || expected <= 0) return false;
  const threshold = Math.max(1, Math.min(50_000, Math.ceil(expected * 0.2)));
  return renderer.activeSplats >= threshold;
}
```

Tune this with screenshots and timing. The cap prevents a huge source from
requiring an excessive ready threshold; the percentage prevents a tiny source
from being marked ready after one incidental splat.

Failure and cancellation behavior is part of the fast path:

- If preview loading fails, open the full-load gate immediately.
- If full loading fails, keep a usable preview visible and expose retry/error
  state rather than flashing an empty canvas.
- If the selected world changes, mark both async branches cancelled. Dispose a
  `PackedSplats` or mesh that resolves after cancellation.
- Reset readiness, errors, update timestamps, and preview/full references on
  every URL change.
- Do not hide the preview on `fullMesh.initialized` alone; initialization can
  precede the first sorted/uploaded visible contribution.

For continuous RAD streaming, use a compact loading status until meaningful
pages contribute, but do not synthesize or prefetch an entire finite preview
unless the product deliberately owns one.

## Current And Adjacent World Prefetch

The current selection, its preview, and its collider may be requested by
several components. Send them through the shared promise caches so duplicate
requests coalesce. Give preview requests priority, then settle full/collider
requests without making one optional failure reject the entire batch:

```ts
export async function prefetchFiniteWorld(input: {
  previewUrl?: string | null;
  fullUrl?: string | null;
  colliderUrl?: string | null;
}) {
  const results: PromiseSettledResult<unknown>[] = [];

  if (input.previewUrl) {
    results.push(...await Promise.allSettled([fetchPackedSnapshot(input.previewUrl)]));
  }

  const deferred: Promise<unknown>[] = [];
  if (input.fullUrl) deferred.push(fetchSplatBytes(input.fullUrl));
  if (input.colliderUrl) deferred.push(fetchColliderAsset(input.colliderUrl));
  results.push(...await Promise.allSettled(deferred));
  return results;
}
```

Here `fetchColliderAsset` must use the same cached-promise, response-status,
rejected-promise eviction, and bounded-capacity rules as `fetchSplatBytes`.

Use `requestIdleCallback` with a timeout and a cancellable `setTimeout`
fallback. A proven sequence was:

- Schedule current-world cache warming at idle with a short, roughly 250 ms
  timeout. This safely coalesces with an already-started live load.
- Wait roughly 5 seconds after the current world becomes interactive.
- At idle, prefetch only the deduplicated previous/next likely worlds with a
  longer, roughly 1.5 second timeout.
- Cancel scheduled work on navigation.

Do not prefetch all worlds. Skip or reduce adjacent prefetch when data saver is
enabled, the connection is constrained, memory is low, the next destination is
not predictable, or the cache budget cannot retain the result long enough to
be useful. Never full-prefetch RAD.

## Spark Update Scheduling

Loading can appear slow when Spark repeatedly sorts or uploads while the camera
and application are still settling. In an always-rendered vanilla loop, start
with Spark's normal update ownership. In a demand-rendered React Three Fiber
app, or after profiling proves redundant updates are expensive, use one owner
with `autoUpdate: false`:

```ts
const spark = new SparkRenderer({
  renderer,
  autoUpdate: false,
  enableLod: true,
  enableDriveLod: true,
  focalAdjustment: 2,
  onDirty: invalidate,
  sortRadial: false,
});
```

Then:

- Force one update after preview initialization and one after full
  initialization.
- Guard against overlapping `spark.update(...)` calls with a `pending` flag.
- Update after meaningful camera position or rotation changes, not every React
  render.
- Throttle repeat updates. Starting intervals of 500-700 ms while navigating
  and about 1 second during gameplay-sensitive simulation worked in the
  measured app; tune against camera feel and sort artifacts.
- Refresh drawing-buffer size and scene/camera/world matrices immediately
  before a manual update.
- Call `setDirty()`, await `update({ scene, camera })`, then invalidate the R3F
  canvas.
- Treat expected disposal/shutdown rejections as teardown, not user-visible
  load failures.

Do not copy manual scheduling into an app that already has correct Spark update
ownership. Two owners create extra sorts, races, and misleading readiness.

## LOD, DPR, And Quality Profiles

- Cap DPR before deleting visual detail. A ceiling around `1.5` is a reasonable
  starting point for general splat viewers; measure mobile separately.
- Enable LoD on `SparkRenderer`. For finite SPZ, mesh LoD can reduce runtime
  rendering/sorting cost but still downloads the full SPZ.
- For RAD, use `paged: true` and do not add `lod: true` to `SplatMesh`.
- Treat the preview artifact as the network/time-to-first-pixel optimization;
  treat renderer LoD as runtime GPU/sort control. They solve different costs.
- If the product supports a playtest/low-power profile, select a lower full
  splat target and larger LoD render scale deliberately. Keep the high-fidelity
  profile as a separate measured configuration rather than mutating constants
  ad hoc.
- Avoid antialiasing when splat output and the surrounding scene remain
  acceptable without it.

## Hosting And Browser Cache

For immutable finite artifacts:

- Use content-hashed or versioned URLs.
- Return a stable `Content-Length`, correct binary `Content-Type`, `ETag` or
  `Last-Modified`, and `Cache-Control: public, max-age=31536000, immutable`.
- Serve compressed JSON colliders where appropriate. Do not apply transport
  compression blindly to already-compressed SPZ.
- Keep CORS correct for remote asset origins.
- Confirm a warm navigation is served from memory/disk cache or a validated
  response, and that application prefetch does not issue a second transfer.

For RAD, follow the stronger range and exposed-header requirements in
`mint-world-splats.md`. A generic service worker or application cache must not
collapse range requests into an eager full-file response.

## Disposal And Failure Behavior

- Dispose preview and full `SplatMesh` objects when replaced.
- Dispose each consumer's `PackedSplats` wrapper, but retain shared snapshot
  bytes only while the bounded cache owns them.
- Dispose the shared `SparkRenderer` only with its owning Three.js renderer.
- Remove roots, listeners, idle callbacks, timers, and diagnostics on teardown.
- Do not let an unmounted async branch publish readiness or overwrite the next
  world's state.
- Keep a visible compact loading state until the app's actual readiness
  contract is satisfied. If physics is required before interaction, visual
  readiness does not make a missing collider safe.
- Surface preview, full, and collider failures separately so retry can target
  the failed layer.

## Verification Gates

Verify at least one cold and one warm transition on the target class of device:

- No duplicate URL fetches when prefetch races the live loader.
- Preview becomes visibly useful before the full asset.
- Full loading begins only after preview initialization, unless measurement
  justifies controlled overlap.
- Preview stays visible until the full mesh contributes useful splats.
- Preview failure opens the full path.
- Full failure retains the preview and exposes retry/error state.
- Rapid world changes do not leak meshes, publish stale state, or dispose an
  object still used by another consumer.
- Cache entry counts remain bounded across a long sequence.
- Adjacent prefetch is delayed, deduplicated, cancellable, and skipped under
  constrained network/memory policy.
- RAD continues to use range requests rather than an eager full download.
- Frame time, JS heap, renderer resources, and visual coverage remain within
  the product budget after the handoff.

Report source and preview bytes/counts plus cold/warm preview-visible and
full-visible timings. If a browser or device cannot provide a metric, say so
instead of substituting initialization time for visible-ready time.
