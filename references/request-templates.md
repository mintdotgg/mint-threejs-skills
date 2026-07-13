# Request Templates

Use these only when the user asks for a reusable prompt. Fill the context and
acceptance criteria from the project; omit irrelevant sections.

## General Three.js App

```text
Use mint-threejs-skills to build or upgrade this Three.js app.

App type and user goal:
Primary 3D subject:
Essential interactions:
Camera/control model:
State or data sources:
Target devices:
Visual direction:
Performance/deployment constraints:

Required outcome:
- Complete primary user journey with loading and error behavior.
- Mint MCP for production assets; integrate files locally and stream world RAD
  manifests through SparkJS.
- Clear interaction feedback and responsive UI.
- Build, browser, interaction, screenshot, and canvas verification.
- Report controls, state ownership, changed files, evidence, and risks.
```

## Three.js Game

```text
Use mint-threejs-skills to build or upgrade this Three.js game.

Game idea:
Core verb and objective:
Pressure, reward, and fail/retry:
Target devices:
Visual direction:
Performance constraints:

Required outcome:
- Playable loop with meaningful decisions and feedback.
- Mint MCP for production assets; integrate files locally and stream world RAD
  manifests through SparkJS.
- Authored graphics and game UI appropriate to the quality bar.
- Build, browser, interaction, desktop/mobile, and canvas verification.
- Report controls, changed files, evidence, and remaining risks.
```

## Focused Interaction Or Gameplay Change

```text
Use the relevant Mint Three.js specialist.

User- or player-facing behavior:
Affected objects/entities/state:
Camera, picking, physics, or collision needs:
Feedback and UI/audio events:
Edge cases:
Acceptance criteria:

Preserve unrelated behavior. Verify through real input, visible state change,
build, browser rendering, and the affected edge cases.
```

## Visual Review

```text
Use the visual-systems specialist.

Current screenshots:
App or game profile:
Primary subject and weak surfaces:
Target direction:
Render budget:
Acceptance criteria:

Address composition, geometry, materials, lighting, motion/VFX, interaction
clarity, UI cohesion, and performance as applicable. Use Mint MCP for generated
production assets. Games claiming premium quality also use the game scorecard.
```

## Debug Or Performance Pass

```text
Use the debug/profile specialist.

Symptom or target:
Reproduction:
Expected behavior:
Target device/build/viewport:
Known recent changes:

Find the owning cause or measured bottleneck before editing. Report baseline and
post-change evidence, retest the broken path, and verify the primary journey.
```

## QA Or Release Pass

```text
Use the QA/release specialist.

App/game type:
Release target:
Primary journey or game loop:
Changed or risky paths:
Target viewports:
Deployment constraints:

Run production-oriented build and browser QA, active desktop/mobile checks,
canvas evidence, core interaction, and loading/error paths. Games additionally
check objective and fail/retry; run bot playtesting only when warranted.
```
