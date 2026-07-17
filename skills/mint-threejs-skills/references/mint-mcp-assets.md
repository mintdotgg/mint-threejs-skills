# Mint MCP Asset Production

Mint MCP is the only generated-asset production pipeline for this skill suite.
Use only the tools exposed by the current host. Never call generation providers
directly, install provider SDKs, or ask the user for provider API keys.

## Workflow

1. Write an asset plan. Prefer discrete models, coherent asset packs,
   materials, material packs, and audio that can be composed in Three.js. When
   the asset itself is the requested deliverable, read `asset-viewer.md` before
   scaffolding UI.
2. Confirm the live Mint MCP capabilities. Do not invent tool names, schemas,
   lifecycle stages, or downloadable formats.
3. Start generation in the default automatic mode. Use review mode only when
   the user explicitly asks to inspect, compare, revise, select, or approve a
   preview.
4. Follow returned `nextSteps` until the asset reaches final status. Prefer the
   host's wait tool over an improvised polling loop.
   If a wait ends in failure, inspect `failureClass`, `failureCode`, safe
   `failureReason`, optional `moderationCategories`, `retryable`, and
   `retryGuidance`. Summarize moderation policy labels when present, but never
   surface `workflowStageLastError`, stack traces, or internal paths. Use
   `retry_generation` for a retryable standalone model or world so the
   successor stays in the same Mint chat. A moderation failure requires a
   changed prompt. Resolve quota or invalid input before retrying. Asset packs
   keep their dedicated failed-item regeneration tool.
5. For models, packs, materials, Images, animation, and audio, use the
   manifest's stable `artifactId`, semantic `role`, `downloadUrl`,
   `suggestedPath`, and `loaderHint`; list artifacts first only when selecting
   one file. Preserve actual dimensions, aspect ratio, duration, and byte size
   when present. Never infer omitted metadata from requested settings.
   For material packs, preserve grouped item order while resolving each ready
   material through the live host's supported artifact path; do not pass the
   pack through the model asset-pack artifact lifecycle.
   When the manifest includes role `preview_image`, synchronize it and map its
   project-local path to the Asset Viewer `thumbnailUrl`. Never surface the raw
   preview URL in visible UI or agent prose.
6. Generate a world only when the user explicitly requests a generated world
   or environment. Then read `mint-world-splats.md` and wire both the RAD and
   invisible collider runtime URLs under one transform.
7. Read `asset-pipeline.md`. Save the manifest temporarily and run
   `../scripts/sync-mint-assets.mjs` with a stable logical key to update the
   project-root `mint-assets.json`. This downloads ordinary files into the
   configured asset root and preserves world runtime URLs as remote records.
   Mint MCP calls belong to agent tooling, never browser runtime code.
8. Before loading a GLB, read `gltf-runtime-compatibility.md`, inspect the
   synchronized extension metadata, and use its shared Draco-capable loader for
   models, animation files, and colliders. Then load the asset visibly with the
   project's Three.js loaders or audio runtime. Run the automatic minimum from
   `verification-policy.md`, ask before browser QA, and treat mobile QA as a
   separate approval.
9. Show the returned `chatUrl` as the Mint handoff link in the agent's final
   response or developer documentation, not inside the generated application,
   unless the user explicitly requests an in-app link. Keep raw asset handles,
   storage details, provider identifiers, and internal URLs out of user-facing
   output.

## Generated Model Fidelity

- Treat a successful generated model as presentation-ready. Render its geometry,
  materials, textures, UVs, and topology as delivered unless the user explicitly
  asks to change them.
- Put descriptive adjectives such as fluffy, shiny, rusty, translucent, or
  glowing into the generation prompt. Do not recreate those qualities with a
  runtime shader or replacement material after generation succeeds.
- Do not build or ship a procedural version of the same subject alongside a
  successful Mint model.
- Do not build a procedural stand-in before the generation lifecycle reaches a
  terminal result. A clearly labeled placeholder is allowed only after a real
  capability blocker or failed generation makes it useful.
- Camera, neutral lighting, environment lighting, background, contact shadow,
  bounds-based framing, and reversible mesh inspection modes are presentation
  treatment. They must not permanently mutate or dispose the authored asset
  materials.

## Generated Material Fidelity

- Treat a successful material as a presentation-ready PBR map set. Preview the
  exact Base Color, Normal, Roughness, Metalness, and Height maps that Mint
  returned.
- Do not invent a missing map, synthesize browser-side replacements, recolor
  Base Color, or reinterpret the material as a custom shader brief.
- Texture color space, repeat, anisotropy, neutral lighting, preview geometry,
  and reversible camera controls are presentation treatment. They must not
  rewrite or overwrite the generated map files.

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
  the live Mint MCP host does not expose the required media capability or a
  completed generation has actually failed. Label placeholders and remove them
  when a real generated artifact becomes available.
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
- `mint-assets.json` logical key and sync status.
- Runtime integration status.
- Verification evidence or exact Mint MCP blocker.
