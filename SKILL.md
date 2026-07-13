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

When the user asks for a reusable prompt, use
`references/request-templates.md`.
