---
name: mint-threejs-skills
description: Build, revise, debug, and verify browser-based Three.js apps, games, asset viewers, model and asset-pack deliveries, material and material-pack deliveries, animated-model viewers, and explicitly requested Gaussian-splat worlds with Mint MCP as the production asset pipeline.
---

# Mint Three.js Skills

Mint's agent skill suite for browser-based Three.js work. It combines and
adapts open source Three.js game, application, and graphics-agent workflows,
generalized for 3D apps while retaining deep game workflows.

## Choose A Route

- Fresh request whose primary deliverable is one generated model, an animated
  model, a coherent model asset pack, one material, a material pack, or one
  explicitly requested Mint world: read `references/asset-viewer.md`, then use
  the app director. The asset is the product; the viewer is its inspection and
  download shell.
- General 3D app, viewer, configurator, simulation, walkthrough, editor, or
  interactive experience: read `skills/threejs-app-director/SKILL.md`.
- Game or game-like request with objectives, challenge, scoring, failure,
  progression, or game feel: read `skills/threejs-game-director/SKILL.md`.
- Mixed experience: start with the app director, then add only the relevant game
  specialists.

Both routes share visual systems, interaction, debugging, QA, and
`references/mint-mcp-assets.md`. Projects that use Mint assets also use the
durable registry in `references/asset-pipeline.md`.

Existing app or game context wins over asset delivery. Generate and integrate a
requested asset into that project instead of scaffolding a separate viewer.

## Invariants

- Existing project architecture wins. For greenfield work, default to
  TypeScript, Vite, and Three.js modules.
- Vanilla Three.js is the default; support React Three Fiber or another
  Three.js-based stack when the project or user chooses it.
- Mint MCP is the only generated-asset production pipeline. Keep MCP calls out
  of browser runtime code.
- For every project that imports Mint files or remote world configuration,
  maintain a project-root `mint-assets.json` through
  `scripts/sync-mint-assets.mjs`. Reuse stable logical keys and preserve the
  existing project's asset-root conventions.
- Prefer discrete generated models and compose them in Three.js. Generate a
  Mint world only when the user explicitly chooses a generated environment;
  then read `references/mint-world-splats.md`.
- Use procedural or user-provided assets when they are the right design choice
  or Mint MCP lacks the required capability. Never create a competing
  procedural version of a subject that Mint generated successfully.
- Before verification, read `references/verification-policy.md`. Run its
  automatic minimum, ask before extended desktop/browser QA, and require a
  separate secondary approval for mobile QA. Its approval boundary overrides
  broader specialist completion gates.
- Do not force game concepts such as objectives, pressure, rewards, or failure
  onto general 3D apps.

## User-Owned UI

- Treat the delivered app as the user's product, not as a demo of the
  asset-generation pipeline.
- Keep provider names, branding, badges, generation links, asset IDs, and
  provenance out of runtime UI unless the user explicitly asks for them.
- Mention generation provenance and handoff links only in the final response or
  developer documentation.
- Default to the minimum UI required for the experience: loading and error
  status, essential controls, and explicitly requested actions.
- Do not add headers, title bars, navigation, marketing copy, attribution, or
  decorative application chrome unless requested.
- For the canonical asset viewer, use its compact details sidebar or mobile
  drawer plus bottom-centered inspection controls. For other simple viewers and
  walkthroughs, use a compact bottom-centered control group. Place loading,
  ready, or error status directly above it using the same compact visual
  language.

When the user asks for a reusable prompt, use
`references/request-templates.md`.
