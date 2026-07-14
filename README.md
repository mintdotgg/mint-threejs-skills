# Mint Three.js Skills


Mint Three.js Skills helps coding agents build 3D apps and games faster. It is
designed as a companion to [Mint MCP](https://mcp.mint.gg/)

<p>
  <a href="https://play.mint.gg/vanguard-protocol"><img src="https://play.mint.gg/experience-assets/vanguard-protocol/social-card.webp" alt="Vanguard Protocol animated character roster" width="24%"></a>
  <a href="https://play.mint.gg/helios-form"><img src="https://play.mint.gg/experience-assets/helios-form/social-card.webp" alt="Helios Form orbital vehicle showroom" width="24%"></a>
  <a href="https://play.mint.gg/neon-relic"><img src="https://play.mint.gg/experience-assets/neon-relic/social-card.webp" alt="Neon Relic interactive science-fiction poster gallery" width="24%"></a>
  <a href="https://play.mint.gg/impossible-places"><img src="https://play.mint.gg/experience-assets/impossible-places/social-card.webp" alt="Impossible Places interactive Gaussian-splat travel magazine" width="24%"></a>
</p>

## Get Started

### 1. Install Mint Three.js Skills

Choose your coding agent.

#### Codex

```bash
npx skills add mintdotgg/mint-threejs-skills -a codex -g -y
```

#### Claude Code

```bash
npx skills add mintdotgg/mint-threejs-skills -a claude-code -g -y
```

#### Cursor

```bash
npx skills add mintdotgg/mint-threejs-skills -a cursor -g -y
```

#### Other coding agents

```bash
npx skills add mintdotgg/mint-threejs-skills
```

### 2. Connect Mint MCP for 3D asset generation

Go to [mcp.mint.gg](https://mcp.mint.gg/) and follow the instructions to
install Mint MCP in your coding agent.

### 3. Use Mint Three.js Skills And Mint MCP

For a general 3D app:

```text
Use Mint Three.js Skills (mint-threejs-skills) and Mint MCP to build a
responsive Three.js product configurator with model variants, material
selection, annotations, and camera presets.
```

For a game:

```text
Use Mint Three.js Skills (mint-threejs-skills) and Mint MCP to build a polished
Three.js hover-racing game with a complete playable loop, responsive controls,
game UI, production assets, and release verification.
```

For an existing project:

```text
Use Mint Three.js Skills (mint-threejs-skills) and Mint MCP to inspect this
project, preserve its current stack, fix the interaction and rendering issues,
and verify the changed user journey.
```

## Verification Scope

The skill runs a minimum viable non-browser check by default: the nearest
build/typecheck gate, focused existing tests for changed logic, and local asset
path validation. It then presents extended desktop/browser QA as an optional
next step. Playwright, canvas inspection, screenshots, diagnostics, profiling,
visual regression, and bot playtests are not automatic. Mobile QA is a separate
secondary approval after desktop QA unless the request explicitly names both.

When extended QA was not approved, the agent must say so rather than imply the
result was browser-, mobile-, or release-tested.

## Acknowledgments

Mint Three.js Skills combines and adapts these open source skills. It is
generalized beyond games and designed specifically for use with Mint MCP as its
3D asset production pipeline.

- [threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills)
- [GameBlocks](https://github.com/xt4d/GameBlocks/tree/main)
- [Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills)
