# Puzzle Modernization — Design

**Date:** 2026-05-07
**Repo:** https://github.com/ricardosilva1998/puzzle
**Status:** Approved

## Goal

Take the 2020-era vanilla HTML/CSS/JS sliding-tile puzzle and bring it up to current tooling, keep the game design intact, and deploy it to Railway as a static site.

## Scope

**In scope**
- Build system: Vite + Bun, TypeScript strict mode, ES modules.
- File restructure into `src/` modules with single responsibilities.
- Translate Portuguese UI text and code identifiers to English.
- Responsive layout (mobile/tablet/desktop).
- Replace hover-only difficulty menu with click-to-toggle.
- Re-encode MP3s at 96kbps mono and lazy-load audio after first user interaction.
- Real README with run/deploy instructions and credits.
- Railway deploy: static site via Caddy, auto-deploy on push to `main`.

**Out of scope (YAGNI)**
- Drag-to-move tile interaction.
- High-score persistence (localStorage / backend).
- New images, new sound effects, or multi-language (i18n) toggle.
- Game-logic changes (mechanics stay identical).

## Architecture

### File layout

```
puzzle/
├── index.html              # Vite entry (replaces jigsaw.html)
├── src/
│   ├── main.ts             # Bootstrap, attach to DOM
│   ├── game.ts             # Game state + logic
│   ├── render.ts           # DOM rendering
│   ├── audio.ts            # Lazy-loaded sound manager
│   ├── ui.ts               # Buttons, difficulty dropdown, image picker
│   ├── types.ts            # Shared types
│   └── styles.css          # Replaces jigsaw.css, responsive
├── public/
│   ├── audio/              # Re-encoded MP3s
│   ├── images/             # Originals
│   └── fonts/PiratesWriters.ttf
├── docs/superpowers/specs/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── railway.toml            # Static deploy config
├── Caddyfile               # Caddy config for serving dist/
├── .gitignore
└── README.md
```

### Module responsibilities

- **`game.ts`** — Pure state and logic: `buildMap`, `shuffleTiles`, `moveTile`, `isFinished`, `validateDirections`. No DOM access. Exports a `GameState` object and reducer-style functions.
- **`render.ts`** — Reads `GameState`, paints `#stage` / `#final` divs. Owns DOM mutation for the board.
- **`audio.ts`** — Sound manager. Lazy-creates `<audio>` elements on first user interaction (sidesteps autoplay policy), exposes `play(name)` and `setMuted(bool)`.
- **`ui.ts`** — Difficulty dropdown, image picker thumbs, mute and show-solution buttons, overlay (intro / restart). Wires user events to `game.ts` actions and `render.ts`.
- **`main.ts`** — Boot: instantiate state, mount UI, wire keyboard listeners.
- **`types.ts`** — `Difficulty = 3 | 4 | 5 | 6`, `Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'`, `GameState` shape.

This split moves the 431-line IIFE into ~5 small files, each understandable in isolation.

### Data flow

```
User input ──▶ ui.ts ──▶ game.ts (mutate GameState)
                                │
                                ▼
                         render.ts (paint DOM)
                                │
                                ▼
                         audio.ts (play SFX)
```

## Behavior changes vs. preserved

**Preserved**
- 4 difficulties (3×3, 4×4, 5×5, 6×6); `timesShuffled = difficulty² × 100`.
- 8 images, plays counter, show-solution-on-press, mute toggle.
- Overlay-based start/restart flow.
- Credits to Cláudio Barradas (original) and the 2020 group (David Morais, Leonardo Carvalho, Ricardo Silva) preserved in README.

**Changed**
- All UI text in English; code identifiers in English (`mapGame` → `boardState`, etc.).
- Difficulty menu: click-to-toggle dropdown instead of hover-only (mobile-friendly).
- Layout: board is `min(90vw, 366px)` square; tile size derives from board size; image picker reflows below board on narrow viewports.
- Audio: 96kbps mono; loaded after first interaction.
- Build: Vite, Bun, TypeScript strict, ES modules.

## Deployment (Railway)

- Build command: `bun install && bun run build` (Vite outputs to `dist/`).
- Serve: Caddy serving `dist/` as static files. Caddy handles gzip/brotli, MIME, caching out of the box.
- Trigger: push to `main` triggers Railway auto-deploy (Railway already connected to GitHub).
- Domain: Railway-provided `*.up.railway.app` (custom domain not in scope).
- No environment variables, no secrets.

## GitHub flow

1. Work on a local `modernize` branch — preserves the original 2021 commit on `main`.
2. Sequence of small commits as work progresses (tooling, restructure, i18n, responsive, audio, README).
3. Push branch, open PR, merge to `main`.
4. Railway picks up the merge and deploys.

## Risks & mitigations

- **Audio autoplay policy** — current code calls `sounds.somDeFundo.play()` on `load`, which silently fails in modern browsers. Mitigation: lazy-load on first click + visible mute/unmute control.
- **Original `366px` math relied on fixed pixel sizes** — `SIZE = (366 / difficulty) - X` with magic offsets per difficulty. Mitigation: derive `SIZE` from the actual rendered board width via `getBoundingClientRect()` and recompute on resize, instead of hard-coded 366.
- **Caddy on Railway Nixpacks** — if Nixpacks doesn't auto-pick Caddy for a Vite project, fall back to a small Bun static server (`bun --bun serve dist/`). Same outcome, slightly more code.

## Success criteria

- Game playable end-to-end at all 4 difficulties on desktop (1280px) and mobile (360px).
- Lighthouse Performance ≥ 90, Accessibility ≥ 90 on the deployed URL.
- Initial JS bundle < 50 KB gzipped.
- Page load (before any user interaction) downloads zero audio bytes.
- README has live URL, screenshot, local-run instructions, deploy instructions.
