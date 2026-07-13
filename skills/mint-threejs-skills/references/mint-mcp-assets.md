# Mint MCP Asset Production

Mint MCP is the only generated-asset production pipeline for this skill suite.
Use only the tools exposed by the current host. Never call generation providers
directly, install provider SDKs, or ask the user for provider API keys.

## Workflow

1. Write an asset plan. Prefer discrete models, coherent asset packs,
   materials, and audio that can be composed in Three.js.
2. Confirm the live Mint MCP capabilities. Do not invent tool names, schemas,
   lifecycle stages, or downloadable formats.
3. Start generation in the default automatic mode. Use review mode only when
   the user explicitly asks to inspect, compare, revise, select, or approve a
   preview.
4. Follow returned `nextSteps` until the asset reaches final status. Prefer the
   host's wait tool over an improvised polling loop.
5. For models, packs, materials, animation, and audio, use the manifest's
   `downloadUrl`, `suggestedPath`, and `loaderHint`; list artifacts first only
   when selecting one file.
6. Generate a world only when the user explicitly requests a generated world
   or environment. Then read `mint-world-splats.md` and wire both the RAD and
   invisible collider runtime URLs under one transform.
7. Put downloaded files or remote runtime configuration in the project's
   stable asset layer. Mint MCP calls belong to agent tooling, never browser
   runtime code.
8. Load the asset visibly with the project's Three.js loaders or audio runtime,
   verify scale/orientation/bounds/materials/clips/playback, and run browser QA.
9. Show the returned `chatUrl` as the Mint handoff link in the agent's final
   response or developer documentation, not inside the generated application,
   unless the user explicitly requests an in-app link. Keep raw asset handles,
   storage details, provider identifiers, and internal URLs out of user-facing
   output.

## Character Animation Sets

Users do not need to know that curated animation sets exist. When a character
needs several related behaviors for a game or interactive experience—such as
idle, walk, run, jump, and turning—treat that natural-language request as a
reason to inspect Mint's set catalog before searching individual clips.

1. Confirm the live host exposes `list_model_animation_sets`. Call it with a
   semantic query such as `third person locomotion`, `rifle combat`, `seated
   NPC`, or `social reactions`. Do not guess that a particular set ID exists.
2. Choose only from the returned results. Inspect the stable set `id`, version,
   semantic clip roles, descriptions, tags, preview GIFs, and `assembly`
   metadata before applying it.
3. Call `animate_generated_model` with the target model or asset-pack items and
   the returned `animation_set_id`. A curated-set request does not need
   `motion_prompt`, and must not also include `animation_action_ids`.
4. Follow the returned animation batch or clip IDs through the animation status
   and artifact-manifest tools. Download the rigged character and clips into
   stable project paths.
5. Map gameplay state to the returned semantic roles, not provider-facing clip
   names. For example, bind `idle`, `walk_forward`, `run_forward`, `jump`,
   `turn_left`, and `turn_right` to the character controller state machine.
6. Treat `assembly.companionAssets` as integration guidance. Generate weapons,
   furniture, props, or environment objects separately when needed, then attach
   or align them in Three.js using the returned roles and attachment metadata.

Use `list_model_animation_options` for a bespoke motion or a custom combination
that is not covered by a curated set. In that path, provide `motion_prompt` and
optionally selected `animation_action_ids`. Do not hardcode remembered set IDs
or reconstruct curated sets from numeric action IDs.

Natural requests that should trigger set discovery include:

- "Make this character ready for a third-person game with idle, walking,
  running, jumping, and turning."
- "Give this NPC a useful collection of seated café animations."
- "Add rifle combat animations; I will supply the weapon model separately."
- "Find suitable social gestures and reactions for this town NPC."

## Capability Boundaries

- Use Mint MCP for generated models, worlds, asset packs, materials, audio, and
  supported model derivatives.
- Default to discrete model or asset-pack generation when choosing how to
  populate a Three.js scene. Do not infer world generation from a general app,
  game, level, background, or environment need.
- Treat world generation as an explicit environment-level operation with a
  longer generation and post-processing lifecycle. Invoke it only when the
  user directly asks for a Mint-generated world or approves that choice.
- Use user-provided assets or procedural Three.js/CSS/SVG/Canvas content when
  the live Mint MCP host does not expose the required media capability.
- Do not substitute another generation API when Mint MCP is unavailable or
  lacks a capability. Report the blocker and continue with clearly labeled
  local placeholders when that still produces useful progress.
- Final Mint worlds should expose a remote RAD runtime manifest. Trust the live
  tool definition and result if a host has not adopted that contract yet.

## Asset Production Ledger

For meaningful asset-backed work, report:

- Surface and desired output.
- Mint generation status and `chatUrl`.
- Artifact or manifest retrieved, with stable project path or remote world
  runtime configuration.
- Runtime integration status.
- Verification evidence or exact Mint MCP blocker.
