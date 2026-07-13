---
name: threejs-qa-release
description: "Verify and release Three.js apps and games through primary-journey QA, desktop/mobile visual checks, canvas metrics, visual regression, optional game bot playtests, production previews, and release-risk reporting."
---

# Three.js QA Release

Prove the app or game works as its user encounters it and that the production
build is shippable.

## Read By Need

- Core QA, responsive behavior, performance, evidence, and release:
  `references/qa-release-checklists.md`.
- Screenshot baselines or visual regression:
  `references/visual-test-harness.md`.
- Game-only scripted play, difficulty, fairness, or softlocks:
  `references/game-playtest-bot.md`.

## QA Workflow

1. Run build/typecheck and start the intended dev or production preview.
2. Capture console, page, and relevant network errors.
3. Verify nonblank canvas pixels and active desktop/mobile screenshots.
4. Exercise the primary user journey and changed risky paths.
5. Test loading, empty, unsupported, and error states when applicable.
6. Check UI fit, input cancellation, safe areas, resize, and mobile behavior.
7. If audio changed, verify gesture unlock, decode/load, triggers, loops,
   cleanup, mute, and volume.
8. Add deterministic screenshot baselines when regression risk warrants them;
   otherwise record the concrete skip reason.
9. For release-ready games or difficulty/fairness claims, run the bot playtest.
10. Record commands, artifacts, issues, and remaining risks.

## Canvas Inspector

Run from the target project so its `@playwright/test` and `pngjs` dependencies
are used:

```bash
node <this-skill-dir>/scripts/inspect-threejs-canvas.mjs --url http://127.0.0.1:5188
```

Add `--mobile`, `--state <name>`, and `--seed <n>` as needed. The JSON
contains canvas metrics and renderer-budget comparisons. Blank/error conditions
exit nonzero.

The game scaffold creator copies this canonical inspector into generated games,
so they remain self-contained without duplicated source.

## Release Workflow

1. Inspect scripts, Vite `base`, public assets, and deployment assumptions.
2. Gate debug UI, verbose logging, and test helpers.
3. Run production build and preview.
4. Recheck desktop/mobile interaction and asset paths in built output.
5. Review bundle size, large assets, and third-party asset notices.
6. Report deployment commands and residual risks.

## Final Response

Lead with pass/fail. Include commands, URL, primary journey or game loop,
controls, screenshots/artifacts, issues, canvas/performance evidence, visual
harness and game-bot decisions when relevant, deployment notes, and risks.
