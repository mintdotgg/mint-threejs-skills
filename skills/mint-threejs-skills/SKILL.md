---
name: mint-threejs-skills
description: Build, revise, debug, and verify browser-based Three.js apps, interactive experiences, viewers, configurators, simulations, editors, games, and explicitly requested Gaussian-splat worlds with Mint MCP as the production asset pipeline.
---

# Mint Three.js Skills

Mint's agent skill suite for browser-based Three.js work. It combines and
adapts open source Three.js game, application, and graphics-agent workflows,
generalized for 3D apps while retaining deep game workflows.

## Choose A Route

- General 3D app, viewer, configurator, simulation, walkthrough, editor, or
  interactive experience: read `skills/threejs-app-director/SKILL.md`.
- Game or game-like request with objectives, challenge, scoring, failure,
  progression, or game feel: read `skills/threejs-game-director/SKILL.md`.
- Mixed experience: start with the app director, then add only the relevant game
  specialists.

Both routes share visual systems, interaction, debugging, QA, and
`references/mint-mcp-assets.md`.

## Invariants

- Existing project architecture wins. For greenfield work, default to
  TypeScript, Vite, and Three.js modules.
- Vanilla Three.js is the default; support React Three Fiber or another
  Three.js-based stack when the project or user chooses it.
- Mint MCP is the only generated-asset production pipeline. Keep MCP calls out
  of browser runtime code.
- Prefer discrete generated models and compose them in Three.js. Generate a
  Mint world only when the user explicitly chooses a generated environment;
  then read `references/mint-world-splats.md`.
- Use procedural or user-provided assets when they are the right design choice
  or Mint MCP lacks the required capability.
- Verify real interaction, rendering, responsive behavior, and changed risky
  paths before reporting completion.
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
- For simple viewers and walkthroughs, use a compact bottom-centered control
  group. Place loading, ready, or error status directly above it using the same
  compact visual language.

When the user asks for a reusable prompt, use
`references/request-templates.md`.
