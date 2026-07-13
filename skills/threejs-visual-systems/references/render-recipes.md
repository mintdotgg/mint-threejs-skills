# Render, Lighting, And VFX Recipes

Use this after authored forms exist. Rendering polish cannot compensate for
missing models, context, or readable interaction silhouettes.

## Renderer Setup

- Set `renderer.outputColorSpace = THREE.SRGBColorSpace`.
- Choose tone mapping deliberately. `ACESFilmicToneMapping` often works for cinematic stylized scenes; simpler tone mapping can be better for bright arcade readability.
- Tune exposure against the active user journey, not an unrelated title view.
- Cap DPR, especially on mobile. Start around `Math.min(devicePixelRatio, 1.5 or 2)` and profile.
- Update renderer, camera, composer, and CSS UI dimensions on resize.
- Use a transparent or explicit background only when composition requires it.

## Camera Composition

- Author a design frame before tuning effects: name the subject, intended
  screen occupancy, lens/FOV, horizon and up direction, near/far range, and
  design viewing distance.
- Scale camera offsets and clipping planes from subject or world bounds instead
  of relying on unexplained constants.
- Derive camera position and orientation separately around a semantic target.
  Let one system own interpolation during each handoff to avoid stacked lag.
- Keep the next decision visible. The camera should show player, immediate threat/reward, and route.
- Add depth layers: foreground speed elements, playable midground, background scale cues.
- Use FOV and camera distance to communicate speed without hiding hazards.
- Use camera shake sparingly and clamp intensity.
- Add camera impulses for hits/near misses/boosts, then ease back quickly.
- Check mobile framing separately; vertical and narrow layouts often need different offsets.

## Lighting Stack

Use a small readable stack:

- Key light: defines form and direction.
- Fill light: keeps primary and interactive objects legible.
- Rim/back light: separates player and hazards from background.
- Practical/emissive lights: authored beacons, engines, pickups, arena markers.
- Contact shadows or shadow blobs: ground important objects.

Avoid many unmeasured dynamic lights. Prefer baked-looking material/emissive cues, light cards, or small unlit decals for repeated signals.

## Shadows And Contact

- Use shadows for the primary subject, important interactables, and large anchors.
- Use smaller shadow maps and limited shadow casters when profiling shows cost.
- Add cheap contact discs or transparent planes for pickups/hovering objects.
- Tune bias to avoid acne and peter-panning.
- Do not let shadows hide collision reads.

## Materials

Define material roles with the material kit in `references/technical-art.md` (`MeshStandardMaterial` for most surfaces, `MeshPhysicalMaterial` only where the premium feature is visible). At render time:

- Prefer material contrast before post effects: matte vs glossy, metal vs plastic, transparent vs opaque, bright trim vs dark contact.
- Use emissive maps or small emissive parts for signals instead of making entire objects glow.
- Keep material roles matched across UI and world: danger, reward, shield, boost, objective.

## Fog, Background, And Depth

- Fog should reveal depth and mood, not hide empty worlds.
- Layer background silhouettes at varied scales and heights.
- Add parallax or slow-moving far layers for motion-heavy games.
- Avoid single flat sky colors when the world needs scale; use gradients only as support, not the whole art direction.
- Keep hazards/rewards readable against fog and background values.

## Post-Processing

Use post as a finishing pass:

- Keep final-image ownership explicit. Order applicable stages as HDR scene,
  lighting screen effects, atmosphere/transparency, bloom, exposure, tone
  mapping, grading/lens treatment, then output color conversion.
- Apply tone mapping and output color conversion exactly once.
- Provide pass toggles and effect-only views for effects that are difficult to
  judge from the composite image.

- Bloom: only authored emissive elements, not all bright materials.
- Vignette: subtle focus, never heavy darkness.
- Film grain/noise: low opacity; avoid compression-like artifacts.
- Chromatic aberration: only brief event-driven impacts or very subtle style.
- Motion blur/trails: prefer geometry trails or particles that preserve interaction clarity.

Always compare screenshots with post enabled/disabled, confirm the no-post
scene remains readable, and profile the cost.

## Event-Driven VFX

Tie effects to state using the event-driven VFX language in `references/technical-art.md` (pickup, hit/fail, boost/speed, near miss/combo, shield/invulnerable, spawn/despawn). Pool effects, reuse geometries/materials, and keep permanent particle fields cheap and sparse.

## Readability Checks

During active play, confirm:

- Player orientation is clear.
- Threats differ from rewards by both shape and material.
- Important pickups are visible before reaction time expires.
- UI feedback does not cover the play path.
- VFX clarifies state instead of obscuring collisions.
- Background contrast does not swallow dark objects.

## Performance Checks

After render changes, report the renderer diagnostics from `references/technical-art.md` (calls, triangles, geometries, textures, materials, DPR/post/shadow settings), plus FPS/frame time and composer/post pass count when available.

If performance drops, reduce post/shadow cost first, then cull/LOD/instance, then reduce asset density only where it is least visible.
