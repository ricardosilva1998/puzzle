# Puzzle UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tile-slide and micro-interaction animations to the puzzle, expand responsive layout to 4 breakpoints (with desktop sidebar layout), and respect `prefers-reduced-motion`.

**Architecture:** `render.ts` keeps a `Map<tileId, HTMLDivElement>` so cells persist across renders — the CSS `transition: top, left` then animates moves naturally. `ui.ts` triggers ad-hoc pulse classes on the counter and the stage. `styles.css` is rewritten with keyframes, transitions, 4 breakpoints, and a global reduced-motion override.

**Tech Stack:** TypeScript strict, Vite, Bun, vanilla CSS. No new dependencies.

**Working directory:** `/Users/ricardosilva/projects/puzzle` on branch `ui-polish`.

---

## File Structure

**Modified:**
- `src/render.ts` — adds `RenderContext` (tile cache), splits stage vs. solution render paths.
- `src/ui.ts` — instantiates the context, triggers pulse classes on move and on solve.
- `src/styles.css` — full rewrite: new transitions, animations, 4 breakpoints, reduced-motion.

**Not touched:**
- `src/game.ts`, `src/game.test.ts`, `src/audio.ts`, `src/main.ts`, `src/types.ts`
- `index.html`
- `public/`, `Caddyfile`, `railway.toml`, `package.json`, etc.

---

## Task 1: Refactor `render.ts` + update `ui.ts` for tile-cache rendering

**Files:**
- Modify: `src/render.ts` (rewrite — ~120 lines)
- Modify: `src/ui.ts` (small changes — instantiate `RenderContext`, pass to every `renderBoard` call, add `triggerPulse` helper, call it on move and on solve)

This single task lands both files in one commit so the build stays green.

- [ ] **Step 1: Verify working directory and branch**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && git branch --show-current && git status --short
```
Expected: `ui-polish`, working tree clean (only the spec is committed so far).

- [ ] **Step 2: Replace `src/render.ts` contents**

Use the Write tool to overwrite `/Users/ricardosilva/projects/puzzle/src/render.ts` with:

```ts
import type { GameState } from './types';

export interface RenderRefs {
  stage: HTMLElement;
  final: HTMLElement;
  counter: HTMLElement;
}

export interface RenderOptions {
  onTileClick: (tile: number) => void;
  showingSolution: boolean;
}

export interface RenderContext {
  stageCells: Map<number, HTMLDivElement>;
}

export function createRenderContext(): RenderContext {
  return { stageCells: new Map() };
}

function setCellGeometry(
  cell: HTMLDivElement,
  rowIndex: number,
  columnIndex: number,
  tileSize: number,
  boardSize: number,
  value: number,
  columns: number,
): void {
  const bgX = -((value - 1) % columns) * tileSize;
  const bgY = -Math.floor((value - 1) / columns) * tileSize;
  cell.style.width = `${tileSize}px`;
  cell.style.height = `${tileSize}px`;
  cell.style.top = `${rowIndex * tileSize}px`;
  cell.style.left = `${columnIndex * tileSize}px`;
  cell.style.backgroundPositionX = `${bgX}px`;
  cell.style.backgroundPositionY = `${bgY}px`;
  cell.style.backgroundSize = `${boardSize}px ${boardSize}px`;
}

function setCellImage(cell: HTMLDivElement, imageName: string | null): void {
  if (!imageName) {
    cell.style.backgroundImage = '';
    return;
  }
  const expected = `url("/images/${imageName}")`;
  if (cell.style.backgroundImage !== expected) {
    cell.style.backgroundImage = expected;
  }
}

function renderStage(
  state: GameState,
  refs: RenderRefs,
  ctx: RenderContext,
  opts: RenderOptions,
): void {
  const { stage } = refs;
  const boardSize = stage.clientWidth || 366;
  const tileSize = boardSize / state.columns;
  const presentTiles = new Set<number>();

  for (let i = 0; i < state.rows; i++) {
    for (let j = 0; j < state.columns; j++) {
      const value = state.boardState[i]![j]!;
      if (value === 0) continue;
      presentTiles.add(value);

      let cell = ctx.stageCells.get(value);
      if (!cell) {
        cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.tile = String(value);
        cell.addEventListener('click', () => opts.onTileClick(value));
        ctx.stageCells.set(value, cell);
        stage.appendChild(cell);
      }
      setCellImage(cell, state.selectedImage);
      setCellGeometry(cell, i, j, tileSize, boardSize, value, state.columns);
    }
  }

  for (const [tile, cell] of ctx.stageCells) {
    if (!presentTiles.has(tile)) {
      cell.remove();
      ctx.stageCells.delete(tile);
    }
  }
}

function renderSolution(state: GameState, refs: RenderRefs): void {
  const { final } = refs;
  final.replaceChildren();
  const boardSize = final.clientWidth || 366;
  const tileSize = boardSize / state.columns;

  for (let i = 0; i < state.rows; i++) {
    for (let j = 0; j < state.columns; j++) {
      const value = state.solvedState[i]![j]!;
      if (value === 0) continue;
      const cell = document.createElement('div');
      cell.className = 'cell rotate';
      cell.dataset.tile = String(value);
      setCellImage(cell, state.selectedImage);
      setCellGeometry(cell, i, j, tileSize, boardSize, value, state.columns);
      final.appendChild(cell);
    }
  }
}

export function renderBoard(
  state: GameState,
  refs: RenderRefs,
  ctx: RenderContext,
  opts: RenderOptions,
): void {
  if (opts.showingSolution) {
    renderSolution(state, refs);
  } else {
    renderStage(state, refs, ctx, opts);
  }
  refs.counter.textContent = String(state.plays);
}
```

- [ ] **Step 3: Replace `src/ui.ts` contents**

Use the Write tool to overwrite `/Users/ricardosilva/projects/puzzle/src/ui.ts` with:

```ts
import { buildMap, isFinished, markSolvedComplete, moveTile, shuffleBoard } from './game';
import { createRenderContext, renderBoard, type RenderContext, type RenderRefs } from './render';
import { AudioManager } from './audio';
import { DIFFICULTIES, PUZZLE_IMAGES, type Difficulty, type GameState } from './types';

interface DOMRefs extends RenderRefs {
  thumbSet: HTMLElement;
  showResult: HTMLElement;
  muteOpt: HTMLElement;
  game: HTMLElement;
}

const INTRO_RULES = [
  'Rules:',
  '- Click "Start game" to begin at "Very Easy" difficulty',
  '- Then pick an image and play',
  '- To change difficulty, click the difficulty button',
  '- A menu opens with all difficulties',
  '- Click the difficulty you want',
  '- Then pick an image and play',
];

const RESTART_RULES = [
  'Rules:',
  '- Click "Restart game" to play again at the same difficulty',
  '- Or pick a new image to restart with that image',
  '- To change difficulty, click the difficulty button',
  '- A menu opens with all difficulties',
  '- Click the difficulty you want, the game restarts with the previous image',
  '- Then play',
  'Congratulations, you solved the puzzle!',
];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  3: 'Very Easy',
  4: 'Easy',
  5: 'Hard',
  6: 'Very Hard',
};

function triggerPulse(el: HTMLElement, className: string): void {
  el.classList.remove(className);
  // Force a reflow so removing then re-adding the class restarts the animation.
  void el.offsetWidth;
  el.classList.add(className);
}

function clearStageCache(ctx: RenderContext, stage: HTMLElement): void {
  for (const cell of ctx.stageCells.values()) cell.remove();
  ctx.stageCells.clear();
  stage.replaceChildren();
}

export function mountUI(refs: DOMRefs): void {
  const audio = new AudioManager();
  const renderCtx = createRenderContext();
  const state: GameState = {
    difficulty: 3,
    rows: 3,
    columns: 3,
    boardState: [],
    solvedState: [],
    plays: 0,
    selectedImage: null,
    showingSolution: false,
  };

  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  refs.thumbSet.appendChild(overlay);

  const overlayText = document.createElement('div');
  overlayText.className = 'overlay-text';
  overlay.appendChild(overlayText);

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.className = 'startGame';
  startBtn.textContent = 'Start game';
  overlay.appendChild(startBtn);

  const dropdown = document.createElement('div');
  dropdown.id = 'difficulty';
  overlay.appendChild(dropdown);

  const dropdownToggle = document.createElement('button');
  dropdownToggle.type = 'button';
  dropdownToggle.className = 'dropdown-toggle';
  dropdownToggle.textContent = DIFFICULTY_LABELS[state.difficulty];
  dropdown.appendChild(dropdownToggle);

  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'dropdown-menu';
  dropdown.appendChild(dropdownMenu);

  const renderOverlayText = (lines: readonly string[]): void => {
    overlayText.replaceChildren();
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      overlayText.appendChild(p);
    }
  };

  const renderDifficultyButtons = (): void => {
    dropdownMenu.replaceChildren();
    for (const d of DIFFICULTIES) {
      if (d === state.difficulty) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btnDif d${d}`;
      btn.textContent = DIFFICULTY_LABELS[d];
      btn.addEventListener('click', () => {
        state.difficulty = d;
        dropdownToggle.textContent = DIFFICULTY_LABELS[d];
        dropdown.classList.remove('open');
        startGame(state.selectedImage);
      });
      dropdownMenu.appendChild(btn);
    }
  };

  dropdownToggle.addEventListener('click', () => {
    renderDifficultyButtons();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target as Node)) dropdown.classList.remove('open');
  });

  const renderImagePicker = (): void => {
    refs.thumbSet.querySelectorAll('.imgButton, .swing').forEach((n) => n.remove());
    for (const name of PUZZLE_IMAGES) {
      const img = document.createElement('img');
      img.src = `/images/${name}`;
      img.className = name === state.selectedImage ? 'swing' : 'imgButton';
      img.dataset.image = name;
      img.alt = name.replace(/\.[a-z]+$/, '');
      img.addEventListener('click', () => {
        state.selectedImage = name;
        state.plays = 0;
        startGame(name);
      });
      refs.thumbSet.insertBefore(img, overlay);
    }
  };

  const renderCurrent = (): void => {
    renderBoard(state, refs, renderCtx, {
      onTileClick: handleTileClick,
      showingSolution: state.showingSolution,
    });
  };

  const startGame = (imageName: string | null): void => {
    audio.init();
    const built = buildMap(state.difficulty);
    state.rows = built.rows;
    state.columns = built.columns;
    state.boardState = built.boardState;
    state.solvedState = built.solvedState;
    state.selectedImage = imageName;
    state.plays = 0;
    state.showingSolution = false;
    refs.stage.hidden = false;
    refs.final.hidden = true;

    // Drop cached cells so a new game (different difficulty or restart) gets fresh DOM.
    clearStageCache(renderCtx, refs.stage);

    if (imageName) {
      shuffleBoard(state);
      audio.play('shuffle');
    }
    renderImagePicker();
    renderCurrent();
    overlay.classList.remove('visible');
  };

  const handleTileClick = (tile: number): void => {
    const result = moveTile(state, tile);
    if (result.moved) {
      audio.play('move');
      triggerPulse(refs.counter, 'pulse');
    } else {
      audio.play('error');
    }
    renderCurrent();
    if (isFinished(state)) {
      markSolvedComplete(state);
      audio.play('success');
      triggerPulse(refs.stage, 'win-pulse');
      renderOverlayText(RESTART_RULES);
      startBtn.textContent = 'Restart game';
      // Delay so the win pulse plays before the overlay covers it.
      window.setTimeout(() => overlay.classList.add('visible'), 320);
    }
  };

  startBtn.addEventListener('click', () => {
    audio.init();
    startGame(state.selectedImage);
  });

  refs.showResult.addEventListener('mousedown', () => {
    if (isFinished(state) || !state.selectedImage) return;
    state.showingSolution = true;
    refs.stage.hidden = true;
    refs.final.hidden = false;
    refs.showResult.classList.add('viewOff');
    audio.play('solution');
    renderCurrent();
  });

  const hideSolution = (): void => {
    if (!state.showingSolution || isFinished(state)) return;
    state.showingSolution = false;
    refs.stage.hidden = false;
    refs.final.hidden = true;
    refs.showResult.classList.remove('viewOff');
    renderCurrent();
  };
  refs.showResult.addEventListener('mouseup', hideSolution);
  refs.showResult.addEventListener('mouseleave', hideSolution);

  refs.muteOpt.addEventListener('click', () => {
    const next = !audio.isMuted();
    audio.setMuted(next);
    refs.muteOpt.classList.toggle('soundOff', next);
  });

  window.addEventListener('resize', () => {
    if (state.selectedImage) renderCurrent();
  });

  renderImagePicker();
  renderOverlayText(INTRO_RULES);
  overlay.classList.add('visible');
}
```

- [ ] **Step 4: Verify typecheck and tests still pass**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run typecheck
```
Expected: exit 0.

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun test
```
Expected: 7 pass, 0 fail (game.ts tests untouched).

- [ ] **Step 5: Verify build**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run build
```
Expected: `dist/` rebuilt, no TS errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add src/render.ts src/ui.ts
git commit -m "$(cat <<'EOF'
refactor(render): patch existing tile cells instead of rebuilding

render.ts now keeps a Map<tileId, HTMLDivElement> in a RenderContext
so tiles persist across renders. Top/left updates with a CSS
transition (added in next commit) animate the slide.

ui.ts instantiates the context once, threads it through every
renderBoard call, clears it on game restart, and adds tiny
triggerPulse helpers for counter (on move) and stage (on solve).

Solution view (showingSolution=true) keeps replaceChildren so the
.rotate keyframe re-fires each press of the show-solution button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Rewrite `src/styles.css` with animations + 4 responsive breakpoints

**Files:**
- Modify: `src/styles.css` (full rewrite — ~250 lines)

- [ ] **Step 1: Replace `src/styles.css` contents**

Use the Write tool to overwrite `/Users/ricardosilva/projects/puzzle/src/styles.css` with:

```css
/* MultiPuzzle — modernized from the 2020 version
   Original group: David Morais, Leonardo Carvalho, Ricardo Silva */

:root {
  --board-max: 366px;
  --board-size: min(90vw, var(--board-max));
  --picker-thumb: 52px;
  --primary: #1d4952;
  --primary-light: #1e7179;
  --accent: #008cba;
  --accent-dark: #006a8e;
  --bg: rgba(0, 0, 0, 0.92);
  --text-light: #fff;
  --shadow-tile: 0 1px 2px rgba(0, 0, 0, 0.18);
  --shadow-tile-hover: 0 3px 8px rgba(0, 0, 0, 0.28);
  --transition-tile: 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

* { box-sizing: border-box; padding: 0; margin: 0; }

@font-face {
  font-family: PiratesWriters;
  src: url('/fonts/PiratesWriters.ttf') format('truetype');
  font-display: swap;
}

html { height: 100%; }

body {
  background-image: url('/images/background.jpg');
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
  min-height: 100vh;
  font-family: tahoma, sans-serif;
  color: var(--text-light);
  opacity: 0;
  animation: bodyFadeIn 250ms ease-out forwards;
}

@keyframes bodyFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

#game {
  width: var(--board-size);
  margin: 24px auto;
  position: relative;
}

h1#title {
  text-align: center;
  font-family: PiratesWriters, serif;
  font-size: clamp(36px, 8vw, 50px);
  text-shadow: 1px 1px 1px var(--primary);
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}

/* ---------- Board + tiles ---------- */

.board {
  position: relative;
  width: var(--board-size);
  aspect-ratio: 1 / 1;
  margin: 4px 0;
  background-color: white;
  border: 10px solid var(--primary);
  box-shadow: inset 2px 2px 2px 0 #aaa, 4px 4px 4px var(--primary-light);
  border-radius: 2%;
  overflow: hidden;
  transition: box-shadow 280ms ease-out;
}
.board[hidden] { display: none; }

.cell {
  position: absolute;
  border: 1px solid white;
  border-radius: 5%;
  box-shadow: var(--shadow-tile);
  cursor: pointer;
  background-repeat: no-repeat;
  user-select: none;
  touch-action: manipulation;
  transition:
    top var(--transition-tile),
    left var(--transition-tile),
    box-shadow 140ms ease-out,
    transform 140ms ease-out;
  will-change: top, left;
}
.cell:hover { box-shadow: var(--shadow-tile-hover); }
.cell:active { transform: scale(0.96); box-shadow: var(--shadow-tile); }

.rotate {
  position: absolute;
  border: 1px solid white;
  border-radius: 5%;
  box-shadow: var(--shadow-tile);
  background-repeat: no-repeat;
  animation: cellRotate 0.5s ease-out;
}
@keyframes cellRotate {
  from { transform: rotate(180deg); border-radius: 100%; }
  to   { transform: rotate(360deg); border-radius: 5%; }
}

/* Win-pulse on the stage when the puzzle is solved. */
.win-pulse {
  animation: winPulse 380ms ease-out;
}
@keyframes winPulse {
  0%   { transform: scale(1);    box-shadow: inset 2px 2px 2px 0 #aaa, 4px 4px 4px var(--primary-light); }
  50%  { transform: scale(1.04); box-shadow: 0 0 24px 6px rgba(0, 140, 186, 0.55), 4px 4px 4px var(--primary-light); }
  100% { transform: scale(1);    box-shadow: inset 2px 2px 2px 0 #aaa, 4px 4px 4px var(--primary-light); }
}

/* ---------- Output row (counter + icons) ---------- */

#output {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  text-shadow: 1px 1px 1px var(--primary);
}
#output .right { display: flex; gap: 8px; }

#counter {
  display: inline-block;
  min-width: 1.5ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
  transition: transform 200ms ease-out;
}
.pulse { animation: counterPulse 220ms ease-out; }
@keyframes counterPulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.18); }
  100% { transform: scale(1); }
}

.icon {
  width: 32px;
  height: 32px;
  background-position: 0 0;
  background-repeat: no-repeat;
  background-size: cover;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  transition: transform 140ms ease-out, box-shadow 140ms ease-out;
}
.icon:hover { transform: scale(1.08); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35); }
.icon:active { transform: scale(0.94); }

.view {
  background-image: url('/images/ui/view.png');
  background-size: 64px 32px;
  box-shadow: inset 0 0 0 1px white;
}
.viewOff { background-position-x: -32px; }

.sound {
  background-image: url('/images/ui/sound-icon-250.png');
  background-size: 64px 32px;
}
.soundOff { background-position-x: -32px; }

/* ---------- Image picker ---------- */

#thumbSet {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  position: relative;
}
.imgButton, .swing {
  width: var(--picker-thumb);
  height: var(--picker-thumb);
  border-radius: 50%;
  padding: 1px;
  background-color: white;
  cursor: pointer;
  object-fit: cover;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 160ms ease-out, box-shadow 160ms ease-out;
}
.imgButton:hover, .imgButton:focus-visible {
  transform: scale(1.08);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
  outline: none;
}
.swing {
  animation: thumbSwing 12s infinite ease-in-out;
  transform-origin: center;
}
@keyframes thumbSwing {
  12.5% { transform: rotate(30deg); }
  37.5% { transform: rotate(-30deg); }
  50%   { transform: none; }
  62.5% { transform: rotate(-30deg); }
  87.5% { transform: rotate(30deg); }
  100%  { transform: none; }
}

/* ---------- Overlay (intro / restart) ---------- */

#overlay {
  position: fixed;
  inset: 0;
  background-color: var(--bg);
  display: none;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  z-index: 10;
  opacity: 0;
  transition: opacity 200ms ease-out;
}
#overlay.visible {
  display: flex;
  animation: overlayFadeIn 220ms ease-out forwards;
}
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

#overlay .overlay-text {
  max-width: 600px;
  font-family: Arial, Helvetica, sans-serif;
  text-align: left;
  animation: overlayCardIn 280ms ease-out;
}
@keyframes overlayCardIn {
  from { transform: scale(0.96); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

#overlay .overlay-text p:first-child {
  font-weight: bold;
  text-decoration: underline;
  font-size: 1.25rem;
  margin-bottom: 8px;
}
#overlay .overlay-text p {
  font-size: 1rem;
  line-height: 1.5;
}

.startGame {
  background-color: var(--accent);
  border: 3px solid var(--accent-dark);
  border-radius: 12px;
  padding: 14px 28px;
  font-size: 1.25rem;
  font-weight: bold;
  font-family: Arial, Helvetica, sans-serif;
  color: white;
  cursor: pointer;
  transition: transform 140ms ease-out, background-color 160ms ease-out, box-shadow 160ms ease-out;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
.startGame:hover {
  background-color: var(--accent-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
.startGame:active { transform: translateY(0); }

/* ---------- Difficulty dropdown ---------- */

#difficulty { position: relative; }
.dropdown-toggle {
  background-color: #4caf50;
  border: 3px solid #2e7d32;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
  color: white;
  transition: transform 140ms ease-out, box-shadow 140ms ease-out;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
}
.dropdown-toggle:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35); }

.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 6px;
  flex-direction: column;
  gap: 4px;
  z-index: 11;
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity 140ms ease-out, transform 140ms ease-out;
}
#difficulty.open .dropdown-menu {
  display: flex;
  opacity: 1;
  transform: translateY(0);
}

.btnDif {
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  font-weight: bold;
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
  color: white;
  font-size: 0.9rem;
  transition: transform 120ms ease-out;
}
.btnDif:hover { transform: translateY(-1px); }
.d3 { background-color: #4caf50; border: 3px solid #2e7d32; }
.d4 { background-color: #ffe066; border: 3px solid #d4a017; color: #333; }
.d5 { background-color: #ff6a33; border: 3px solid #b03a00; }
.d6 { background-color: #f44336; border: 3px solid #b71c1c; }

/* ---------- Responsive breakpoints ---------- */

/* Phone-large / tablet */
@media (min-width: 481px) {
  :root {
    --board-max: 480px;
    --picker-thumb: 56px;
  }
  #game { margin: 32px auto; }
}

/* Tablet-landscape / small desktop */
@media (min-width: 769px) {
  :root {
    --board-max: 480px;
    --picker-thumb: 60px;
  }
}

/* Desktop with sidebar picker */
@media (min-width: 1024px) {
  :root {
    --board-max: 520px;
    --picker-thumb: 64px;
  }
  #game {
    width: auto;
    max-width: calc(var(--board-size) + 280px);
    display: grid;
    grid-template-columns: var(--board-size) 240px;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      "title  picker"
      "stage  picker"
      "output picker";
    gap: 12px 32px;
    align-items: start;
  }
  h1#title { grid-area: title; margin-bottom: 0; }
  #stage   { grid-area: stage; }
  #final   { grid-area: stage; }
  #output  { grid-area: output; }
  #thumbSet {
    grid-area: picker;
    margin-top: 0;
    align-content: start;
  }
}

/* Phone (override) */
@media (max-width: 480px) {
  :root {
    --board-max: 100vw;
    --picker-thumb: 44px;
  }
  #game { margin-top: 12px; padding: 0 4px; }
  h1#title { font-size: 36px; }
}

/* ---------- Reduced motion ---------- */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  body { opacity: 1; }
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run build
```
Expected: clean build, `dist/assets/index-*.css` updated.

- [ ] **Step 3: Boot dev server and confirm it serves**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle
( bun run dev & PID=$!; sleep 4; curl -s http://localhost:5173/ | grep -o '<title>[^<]*</title>'; kill $PID 2>/dev/null ) 2>&1 | tail -5
```
Expected: prints `<title>MultiPuzzle</title>`.

- [ ] **Step 4: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add src/styles.css
git commit -m "$(cat <<'EOF'
style: animations, micro-interactions, 4 responsive breakpoints

Adds tile slide transition (180ms), tile press/hover states,
counter pulse on move, win pulse on solve, body fade-in,
overlay fade + card scale-in, dropdown slide, and picker thumb
hover lift. Replaces single 480px breakpoint with phone /
phone-large / tablet / desktop tiers. Desktop (>=1024px) puts
the image picker beside the board as a sidebar grid. Respects
prefers-reduced-motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Visual verification across breakpoints

**Files:**
- Create / overwrite: `docs/img/screenshot.png` (desktop hero)
- Create: `docs/img/screenshot-mobile.png`, `docs/img/screenshot-tablet.png`, `docs/img/screenshot-desktop-wide.png`

- [ ] **Step 1: Boot dev server and capture screenshots**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle
mkdir -p docs/img
( bun run dev & PID=$!; sleep 4; \
  bunx --bun -p '@playwright/test' playwright screenshot --browser=chromium --viewport-size=375,720  http://localhost:5173/ docs/img/screenshot-mobile.png; \
  bunx --bun -p '@playwright/test' playwright screenshot --browser=chromium --viewport-size=768,1024 http://localhost:5173/ docs/img/screenshot-tablet.png; \
  bunx --bun -p '@playwright/test' playwright screenshot --browser=chromium --viewport-size=1280,900 http://localhost:5173/ docs/img/screenshot.png; \
  bunx --bun -p '@playwright/test' playwright screenshot --browser=chromium --viewport-size=1440,900 http://localhost:5173/ docs/img/screenshot-desktop-wide.png; \
  kill $PID 2>/dev/null ) 2>&1 | tail -8
ls -lh docs/img/
```
Expected: 4 PNGs created. Screenshot at 1280px should clearly show the picker on the right side of the board (sidebar). Screenshot at 375 should show the picker below the board.

- [ ] **Step 2: Inspect each screenshot**

Use the Read tool on each PNG (Claude Code can render images) and confirm:
- `screenshot-mobile.png` — single-column layout, picker below board, no horizontal scroll
- `screenshot-tablet.png` — board capped at ~480px, picker still below
- `screenshot.png` — desktop sidebar layout (picker right of board)
- `screenshot-desktop-wide.png` — same as desktop, no extreme stretching

If any layout looks wrong, that's a BLOCKED state — escalate.

- [ ] **Step 3: Commit screenshots**

```bash
cd /Users/ricardosilva/projects/puzzle
git add docs/img/
git commit -m "$(cat <<'EOF'
docs(img): refresh screenshots at 4 viewport sizes

Captures mobile (375), tablet (768), desktop (1280, sidebar
layout), and wide desktop (1440) for the README and visual
regression baseline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Push, merge, deploy, verify

**Files:** none (operational).

- [ ] **Step 1: Push the `ui-polish` branch**

```bash
cd /Users/ricardosilva/projects/puzzle && git push -u origin ui-polish
```

- [ ] **Step 2: Open a PR to `main`**

```bash
cd /Users/ricardosilva/projects/puzzle && gh pr create --title "UI polish: tile-slide animation + responsive layout (4 breakpoints)" --body "$(cat <<'EOF'
## Summary
- Add tile-slide animation (180ms) by switching renderer to a tile cache
- Add micro-interactions: tile press/hover, counter pulse, win pulse, modal fade+scale, dropdown slide, picker hover lift, body fade-in
- Replace single 480px breakpoint with phone / phone-large / tablet / desktop (>=1024px gets a sidebar picker)
- Respect \`prefers-reduced-motion\`

## Test plan
- [ ] \`bun test\` — game-logic tests still pass
- [ ] \`bun run typecheck\` clean, \`bun run build\` clean
- [ ] Mobile (375): board fills width, picker below, no h-scroll
- [ ] Tablet (768): board capped ~480, picker below
- [ ] Desktop (1280): picker on the right side of the board
- [ ] Tile slide animates smoothly when clicking a tile
- [ ] Counter pulses on move
- [ ] Solving the puzzle pulses the board, then shows the restart overlay
- [ ] Reduced-motion: turn on macOS reduced motion → animations disabled, layout unchanged

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Merge the PR**

```bash
cd /Users/ricardosilva/projects/puzzle && gh pr merge --squash --delete-branch
```

- [ ] **Step 4: Update local main and let Railway redeploy**

```bash
cd /Users/ricardosilva/projects/puzzle && git checkout main && git pull
```

Railway is already linked to the repo from the prior modernization deploy — it picks up the squash-merge automatically and rebuilds. No `railway up` needed.

- [ ] **Step 5: Tail Railway logs for ~60s to confirm rebuild**

```bash
cd /Users/ricardosilva/projects/puzzle
( railway logs & PID=$!; sleep 60; kill $PID 2>/dev/null ) 2>&1 | head -60
```
Expected: a fresh build invocation; Caddy starts again and binds to the port.

- [ ] **Step 6: Smoke-test the deployed URL**

```bash
DEPLOYED_URL="https://puzzle-production-5cea.up.railway.app"
curl -sI "$DEPLOYED_URL" | head -3
curl -s "$DEPLOYED_URL" | grep -o '<title>[^<]*</title>'
JS_URL=$(curl -s "$DEPLOYED_URL" | grep -oE '/assets/index-[^"]+\.js')
echo "JS asset: $JS_URL"
curl -sI "${DEPLOYED_URL}${JS_URL}" | head -3
```
Expected: HTTP 200; title `MultiPuzzle`; JS asset 200.

If the JS asset hash hasn't changed since the previous deploy, the new build hasn't propagated yet — wait 30-60s and retry.

- [ ] **Step 7: Final manual QA on the live site (skip in subagent execution; the human does this)**

Manually open the live URL in:
- Desktop browser at full width — confirm sidebar picker, smooth tile slide
- DevTools mobile (375 wide) — confirm single-column layout
- macOS Reduce Motion enabled — confirm animations disabled

---

## Self-Review Notes

Spec coverage:
- Tile slide animation — Tasks 1 + 2 (renderer cache + CSS transition)
- Tile press / hover — Task 2
- Counter pulse — Tasks 1 (`triggerPulse`) + 2 (keyframe)
- Modal entrance/exit — Task 2 (`overlayFadeIn`, `overlayCardIn`)
- Dropdown slide — Task 2 (`.dropdown-menu` opacity + transform)
- Picker thumb hover — Task 2
- Win celebration — Tasks 1 (`triggerPulse` on stage) + 2 (`winPulse` keyframe)
- Initial body fade-in — Task 2 (`bodyFadeIn`)
- 4 responsive breakpoints — Task 2 (`@media (min-width: ...)` cascade)
- Desktop sidebar picker — Task 2 (grid layout at >=1024px)
- `prefers-reduced-motion` — Task 2 (global override)

Success criteria mapped:
- Tiles glide on click → Tasks 1 + 2
- No horizontal scroll at 360-1440 widths → Task 3 (visual verify)
- Sidebar picker at >=1024px → Task 2 grid + Task 3 visual verify
- Lighthouse perf >=90 → not gated; manual check on deployed URL
- Reduced-motion shows no animations → Task 2 global override
- Game still wins/loses identically → Tasks 1 + Task 4 Step 7 manual QA
