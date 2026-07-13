# UI Quality Gates

## Hierarchy And States

- The playable game or an intentional modal is the primary surface.
- HUD order matches gameplay priority: survival/status, objective, feedback,
  then flavor.
- Pause, settings, loading, fail/retry, win/milestone, and error states exist
  when relevant.
- UI style matches the game's world, genre, typography, color, and motion.
- State comes from the game model; UI does not duplicate simulation rules.

## Fit And Interaction

- Dynamic values use stable dimensions and do not shift layout.
- Text remains legible over bright, dark, and moving backgrounds.
- UI does not cover the player, threats, goals, near-future path, or touch
  controls unless intentionally modal.
- Buttons expose hover, pressed, focus, disabled, and touch states as applicable.
- No clipped text, overlap, unreachable controls, nested-card clutter, or
  marketing-page layout remains.

## Mobile

- Include the viewport meta tag and use Pointer Events where practical.
- Apply `touch-action: none` only to interactive game surfaces that need it.
- Respect safe areas and practical thumb reach; prevent page gestures from
  stealing gameplay input.
- Test pointer release outside virtual controls, high-DPR scaling, and supported
  orientations.
- Desktop and mobile screenshots plus real state changes prove the result.
