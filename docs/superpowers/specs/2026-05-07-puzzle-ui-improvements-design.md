# Puzzle UI Improvements — Design

**Date:** 2026-05-07
**Repo:** https://github.com/ricardosilva1998/puzzle
**Status:** Approved

## Goal

Make the puzzle feel polished and responsive across phones, tablets, and desktops. Preserve gameplay, color identity, and credits. Limit changes to `src/styles.css`, `src/render.ts`, and `src/ui.ts`.

## In scope

### Animations

- **Tile slide** — tiles glide between cells (180 ms ease-out) instead of snapping.
- **Tile press** — `:active` scales tile to 0.96 with depressed shadow.
- **Tile hover** — `translateY(-1px)` + soft shadow lift on hover-capable devices.
- **Counter pulse** — moves counter scales 1.0 → 1.15 → 1.0 (200 ms) on each change.
- **Modal entrance/exit** — overlay backdrop fades 0 → 1 (200 ms); inner card scales 0.96 → 1.0.
- **Dropdown** — menu slides down with fade (140 ms) instead of `display: none ↔ flex` snap.
- **Picker thumb** — hover/focus scales to 1.08 with shadow; existing `.swing` on the selected thumb stays.
- **Win celebration** — board scale pulse 1.0 → 1.04 → 1.0 (300 ms) with soft glow, then restart overlay fades in.
- **Initial paint** — `<body>` fades 0 → 1 opacity (250 ms) on load.

All animations are wrapped in `@media (prefers-reduced-motion: no-preference)` so users with reduced-motion settings get static behavior.

### Responsive layout

Replace the single 480 px breakpoint with four:

| Breakpoint | Range | Layout |
|---|---|---|
| Phone | ≤ 480 px | Board fills width, picker below, single column |
| Phone-large / tablet | 481-768 px | Board capped at 480 px, picker below |
| Tablet-landscape / small desktop | 769-1023 px | Board capped at 480 px, picker below, more breathing room |
| Desktop | ≥ 1024 px | Board (520 px) on the left, picker as 2-column grid sidebar on the right |

`--board-max` becomes a per-breakpoint CSS variable instead of a single value with one mobile override. Tiles get `touch-action: manipulation` to prevent iOS double-tap zoom.

### Architecture change

`render.ts` switches from "tear down + rebuild" to "patch existing cells":

- Maintain a tile-to-element map between renders.
- On each `renderBoard` call: for each non-empty tile in state, find or create its element and update `top` / `left`. Don't remove still-present tiles.
- Tiles absent from the new state (just the empty cell) are removed.
- This single change is what makes the CSS slide transition actually animate. ~40 lines diff.

`ui.ts` minimal changes:
- Trigger a counter pulse class on `#counter` when plays changes, then remove it on `animationend`.
- Trigger a board pulse class on the stage `.board` when `isFinished` becomes true.

`styles.css` major rewrite (~150 lines added): keyframes, transitions, breakpoints.

## Out of scope (YAGNI)

- Drag-to-move tile interaction
- Confetti / particle effects on win
- High-score persistence
- New colors, new fonts, new images, or replacement of `background.jpg`
- New sound effects or haptics
- Game logic changes (`src/game.ts` is untouched)
- Audio module changes (`src/audio.ts` is untouched)

## File touch list

- **Modify:** `src/styles.css` (major rewrite, ~150 lines added)
- **Modify:** `src/render.ts` (~40 lines changed; add `RenderContext` for tile cache)
- **Modify:** `src/ui.ts` (small additions for counter and win triggers)
- **Modify:** none other

## Risks & mitigations

- **Tile-patch rendering changes the rendering contract.** `render.ts` currently exposes `renderBoard(state, refs, opts)` and creates fresh DOM each call. The new version needs a place to keep the tile cache. Mitigation: add a `RenderContext` parameter that the caller (`ui.ts`) instantiates once and passes back on every render.
- **CSS transitions on `top` / `left` are not the cheapest** — `transform: translate()` would be smoother. But the existing renderer already uses `top` / `left` for positioning. Mitigation: keep `top` / `left` for layout, accept the small perf cost (board has at most 35 tiles); revisit if it stutters on low-end mobile.
- **`prefers-reduced-motion` not all-or-nothing.** Some users tolerate small animations even with the preference set. Mitigation: keep the rule simple (animations gated behind `prefers-reduced-motion: no-preference`); skip nuanced opt-in.

## Success criteria

- Tiles visibly glide on click (no snap) on desktop and mobile.
- Layout has no horizontal scroll at 360, 480, 768, 1024, 1280, 1440 widths.
- At ≥ 1024 px, the image picker sits beside the board (sidebar), not below.
- Lighthouse Performance ≥ 90 on the deployed URL after changes.
- Users with `prefers-reduced-motion: reduce` see no animations (static behavior preserved).
- Game still wins/loses identically — no behavior changes confirmed by manual play.
