# Verification Scope

Read this before running checks for any Mint Three.js task. This policy
overrides broader browser, screenshot, desktop/mobile, diagnostics, and release
gates in specialist guidance unless the user already approved that exact QA
scope.

## Automatic Minimum

Run the smallest useful verification before handing back implementation:

1. Run the target project's build, typecheck, or nearest compile gate.
2. Run focused existing non-browser tests for changed logic when available.
3. Confirm referenced project-local asset files exist and changed import paths
   resolve.
4. For Mint GLBs, inspect recorded extension metadata and confirm every model,
   animation, and collider loader uses the shared capability helper from
   `gltf-runtime-compatibility.md`.
5. Fix failures caused by the current work before reporting completion.

Prefer focused commands. Do not expand to a full test suite when a narrower
owned check provides the required signal, unless the repository requires its
full gate.

This minimum does not authorize starting a dev/preview server, opening or
driving a browser, running Playwright, invoking the canvas inspector, capturing
screenshots, profiling, visual regression, bot playtesting, or a desktop/mobile
matrix.

## Approval-Gated QA

After the automatic minimum passes, present extended desktop QA as the next
step and ask the user before running it. State the proposed checks, such as the
primary journey, one real input path, blocking console/page errors, nonblank
canvas, and one desktop viewport. For Draco-backed GLBs, include one real model
decode and reject decoder MIME, CORS, or `No DRACOLoader instance provided`
errors.

- A direct user request to run browser, desktop, Playwright, visual, release, or
  performance QA counts as approval for only the named scope.
- Describing the desired result as polished, premium, complete, or
  release-ready does not by itself authorize browser automation. Offer the
  relevant QA after implementation.
- Keep visual regression, canvas diagnostics, profiling, production-preview
  checks, and bot playtests out of the first desktop smoke unless the user
  approves them.
- Treat mobile QA as a separate secondary approval. Desktop QA approval does
  not include mobile. A request that explicitly names both desktop and mobile
  approves both.
- Do not silently broaden a focused bug reproduction into a full release pass.

When approved, run only the selected checks from
`skills/threejs-qa-release/SKILL.md` and its references.

## Handoff Language

Always report what actually ran. When only the automatic minimum ran, say:

```text
Minimum viable verification passed: <commands/checks>.
Extended browser QA was not run. The next optional step is <proposed desktop scope>.
Mobile QA requires separate approval.
```

Do not claim browser-tested, fully playable, responsive, release-ready, or
performance-verified behavior without the corresponding approved evidence.
