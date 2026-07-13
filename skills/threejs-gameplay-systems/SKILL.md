---
name: threejs-gameplay-systems
description: "Design and implement playable Three.js game loops, architecture, controls, cameras, physics, levels, encounters, audio hooks, feedback, and game feel."
---

# Three.js Gameplay Systems

Create a playable, maintainable loop with clear ownership and responsive
controls.

## Read By Need

- Always for implementation: `references/gameplay-workflows.md`.
- New games, major loop changes, levels, encounters, progression, or difficulty:
  `references/game-design-level-design.md`.
- Physics or collision-heavy work: `references/physics-engine-selection.md`.
- Model axes, constrained motion, multiple moving actors, or terrain queries:
  `../../references/spatial-contracts.md`.
- Feel, impact, juice, or polished gameplay: `references/game-feel.md`.
- Before claiming broad gameplay complete: `references/quality-gates.md`.
- Generated audio or 3D gameplay assets:
  `../../references/mint-mcp-assets.md`.

## Workflow

1. Inspect scripts, dependencies, loop ownership, input, camera, state, entities,
   UI, diagnostics, and current gameplay.
2. Define the player promise, primary verb, objective, pressure, reward,
   fail/retry path, skill expression, and non-goals.
3. Plan the first playable space or encounter: start, decision, threat, reward,
   escalation, recovery, and landmarks.
4. Choose small ownership boundaries such as `core`, `game`, `entities`,
   `systems`, `assets`, `ui`, and `tests`.
5. Implement in playable increments: input, state, entity, collision/physics,
   feedback, HUD/audio event, and diagnostics.
6. Tune movement, camera, timing, difficulty, feedback, and restart through
   short play loops.
7. Verify build, browser rendering, real input, objective progress, and
   fail/retry when relevant.

Gameplay code emits audio events. Mint-produced audio files belong in a stable
runtime asset matrix; Mint MCP calls never belong in browser code.

## New-Game Scaffold

```bash
python3 <this-skill-dir>/scripts/create_threejs_game.py ./my-game
```

Use `--force` only when overwriting the target is intended.

## Technical Defaults

- TypeScript, Vite, and Three.js modules.
- Custom collision for simple arcade triggers; Rapier for robust rigid-body
  gameplay; cannon-es only when its smaller JavaScript footprint is useful.
- Fixed-step simulation for physics and seeded randomness for deterministic QA.
- Shared resources, explicit update order, and allocation-light hot paths.
- Web Audio for playback; Mint MCP for generated production audio.

## Final Response

Report player-facing behavior, controls, design/level decisions when relevant,
architecture, tuned values, verification evidence, assets, and remaining edge
cases.
