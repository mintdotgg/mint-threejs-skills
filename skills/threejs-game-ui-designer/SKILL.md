---
name: threejs-game-ui-designer
description: "Design readable, responsive Three.js game HUDs, menus, overlays, touch controls, typography, safe areas, and game-state-driven interface feedback."
---

# Three.js Game UI Designer

Build interface states that support play and feel native to the game.

## Read By Need

- UI implementation and state patterns: `references/ui-patterns.md`.
- Before claiming HUD, menu, responsive, or touch work complete:
  `references/quality-gates.md`.
- Generated 3D menu objects or diegetic props:
  `../../references/mint-mcp-assets.md`.

Use authored HTML/CSS/SVG/Canvas or user-provided assets for ordinary flat UI.
Use Mint MCP only when the live host exposes the required output. Never use
another generation provider.

## Workflow

1. Inspect desktop/mobile screenshots and inventory gameplay, pause, settings,
   loading, fail/retry, win/milestone, and touch states.
2. Prioritize survival/status, objective, feedback, then flavor.
3. Replace utility cards with game-specific meters, clusters, badges, icons,
   alerts, reticles, and modal states.
4. Keep dimensions stable; account for text fit, safe areas, touch targets,
   hover/pressed/focus/disabled states, and reduced motion.
5. Drive UI from game state without duplicating simulation rules.
6. Verify relevant states through real input at desktop and mobile sizes.

## Final Response

Report states covered, UI intent, controls, screenshots, text-fit/overlap,
safe-area/touch-target evidence, and remaining risks.
