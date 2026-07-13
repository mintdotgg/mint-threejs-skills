---
name: threejs-game-director
description: "Build or upgrade complete Three.js browser games by coordinating gameplay, Mint MCP assets, graphics, UI, debugging, performance, QA, and release."
---

# Three.js Game Director

Own the end-to-end game outcome. A static scene is not a game, and a working
prototype is not automatically polished.

## Route The Work

Read the matching sibling `SKILL.md` before that phase:

| Need | Skill |
| --- | --- |
| Game design, loop, controls, camera, physics, feel, scaffold | `../threejs-gameplay-systems/SKILL.md` |
| Models, materials, world art, lighting, shaders, VFX, visual quality | `../threejs-visual-systems/SKILL.md` |
| HUD, menus, touch controls, responsive interface | `../threejs-game-ui-designer/SKILL.md` |
| Picking, manipulation, annotations, configurator-style interaction | `../threejs-interaction-systems/SKILL.md` |
| Rendering bugs, loading, input bugs, profiling, optimization | `../threejs-debug-profiler/SKILL.md` |
| Browser QA, visual tests, bot playtests, production release | `../threejs-qa-release/SKILL.md` |

For broad creation, upgrade, polished, premium, showcase, or release work, use
all implementation specialists. Route QA through
`../../references/verification-policy.md`; for a narrow fix, use only the
relevant specialist plus the automatic minimum.

## Workflow

1. Inspect the project, current screenshots, controls, runtime, and constraints.
2. For broad gameplay work, define the player promise, primary verb, objective,
   pressure, reward, fail/retry path, and first level or encounter.
3. Build or repair the playable loop before deep visual polish.
4. If generated assets are needed, follow `../../references/mint-mcp-assets.md`.
   Mint MCP is the only generated-asset pipeline. Complete finalization,
   artifact retrieval, durable `mint-assets.json` registration through
   `../../references/asset-pipeline.md`, project integration, and minimum
   verification.
5. Upgrade every weak visible surface: hero, threats, rewards, world, materials,
   lighting, VFX, and UI. Do not hide missing craft with bloom, fog, or glow.
6. Reproduce and measure bugs or performance problems before optimizing.
7. Run the automatic minimum, then offer scoped desktop QA. Run player-facing,
   release, or mobile checks only after the corresponding approval.

Use procedural geometry for blockout, collision, repeated support props, debug
geometry, deliberate procedural art, or a reported Mint MCP blocker. Never
substitute another generation provider.

## Packaged Resources

For a new Vite/TypeScript/Three.js game:

```bash
python3 <gameplay-skill-dir>/scripts/create_threejs_game.py ./my-game
```

For canvas and renderer evidence after desktop QA approval:

```bash
node <qa-skill-dir>/scripts/inspect-threejs-canvas.mjs --url http://127.0.0.1:5188
```

## Completion Gates

Broad work automatically requires:

- Build/typecheck or the nearest compile gate.
- Focused non-browser tests for changed gameplay logic when available.
- Referenced project-local assets and changed imports resolve.
- `mint-assets.json` records every integrated Mint artifact or remote world
  runtime under a stable logical key.
- An explicit statement that extended browser QA was not run unless approved.

After the user approves the relevant QA scope, broad work also requires:

- A playable loop proven through real input, objective progress, and fail/retry
  when the genre has failure.
- Build/typecheck and local browser checks with no blocking console/page errors.
- Active desktop screenshots, plus mobile screenshots only under separate
  mobile approval.
- Nonblank canvas evidence and verification of the changed risky paths.
- Readable HUD/menu states, controls, camera, and feedback.
- Mint artifact paths and visible runtime integration, or exact Mint MCP
  blockers, whenever generated assets were needed.

Premium, AAA, showcase, polished, complete, release-ready, and "less basic"
claims additionally require approved QA evidence below. Without that approval,
implement toward the bar but label it unverified instead of making the claim:

- The canonical `../threejs-visual-systems/references/game-visual-scorecard.md`
  with measured evidence, no
  category below 2, average at least 2.3, and a fresh-eyes review.
- Technical-art budget and renderer diagnostics after graphics changes.
- Audio evidence or an explicit blocker for active gameplay.
- A visual-test-harness decision; release-ready gameplay also needs a bot
  playtest or a specific reason it could not run.
- Physics-heavy games report engine, timestep, collider strategy, sensors, CCD,
  and body/collider diagnostics.

If a gate fails, continue or report the blocker. Do not soften the quality bar.

## Report Audit

For broad or premium work, draft the evidence report and run:

```bash
python3 <director-skill-dir>/scripts/audit_reference_report.py --premium /path/to/report.md
```

Add `--physics`, `--audio`, or `--no-design` when applicable. Fix missing
evidence before claiming completion.

## Final Response

Lead with the outcome. Include changed files, controls, run URL, verification,
screenshots/artifacts, Mint links and integrated paths, performance evidence,
quality-gate results, and remaining risks. Include the design brief and
level/encounter plan only when gameplay scope warrants them. Explicitly name
the extended desktop and mobile QA that was not run.
