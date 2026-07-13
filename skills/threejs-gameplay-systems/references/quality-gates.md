# Gameplay Quality Gates

Use the sections that match the requested scope.

## First Playable

- The first screen is the game, and interaction begins quickly.
- Real input drives the primary verb.
- Objective, pressure, reward/progression, and fail/retry are implemented when
  appropriate—not merely described.
- The first playable minute contains a meaningful decision and visible feedback.
- Camera framing, controls, HUD, and feedback support the next decision.
- Build, browser rendering, console errors, screenshot, and canvas pixels pass.

## Design And Levels

- The design brief names player promise, target feeling, verb, objective,
  pressure, reward, fail/retry, skill expression, and non-goals.
- The level or encounter plan covers start, first decision, first threat, first
  reward, landmarks, escalation, recovery, and failure readability.
- Space, waves, routes, enemies, and rewards create decisions rather than random
  clutter.
- Difficulty is tied to explicit tuning parameters and tested through play.
- Greybox scale and route readability are proven before expensive art.

## Feel

- Input response, movement, camera, impact, feedback, and restart speed are
  tuned together.
- Scoring, pickup, damage, and failure events have clear visual/audio feedback.
- Shake, hitstop, flash, FOV punch, squash/stretch, and rumble are proportional
  and preserve readability.
- Gameplay delta may pause for hitstop; rendering, UI, and recovery effects do
  not freeze.
- Randomness is seeded for deterministic tests.
- Repeated sounds vary subtly without masking gameplay state.

## Physics

- Engine choice, fixed timestep, body/collider ownership, collision groups,
  sensors, CCD, and restart cleanup are explicit.
- Collision proxies match gameplay while remaining simpler than visual meshes.
- Fast bodies, moving platforms, triggers, and edge collisions are tested.
- Visual and physics transforms have one synchronization owner.

## Endless Runners

- Hero, at least three hazard families, and at least two reward variants read at
  speed.
- Track/world modules create near, middle, and far depth without blocking lane
  decisions.
- Camera FOV, follow, shake, roll, and effects communicate speed without nausea.
- Ramp-up, collection, avoidance, near miss, failure, and restart are played.
- Worst-case segment performance and mobile controls are verified.
