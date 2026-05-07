# Puzzle Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the 2020 vanilla HTML/CSS/JS sliding-tile puzzle to TypeScript + Vite + Bun, translate the UI to English, make the layout responsive, lazy-load re-encoded audio, and deploy as a static site on Railway.

**Architecture:** Vite-bundled static site. TypeScript split into 5 focused modules under `src/` (`game.ts` pure logic, `render.ts` DOM, `audio.ts` sound, `ui.ts` events, `main.ts` boot). Assets in `public/`. Railway runs Caddy serving `dist/`.

**Tech Stack:** Bun (package manager + test runner), Vite (bundler), TypeScript strict, Caddy (static server on Railway), ffmpeg (audio re-encode).

**Working directory:** `/Users/ricardosilva/projects/puzzle` on branch `modernize`.

---

## File Structure

**Created:**
- `package.json` — Bun project metadata
- `tsconfig.json` — TS strict config
- `vite.config.ts` — Vite config
- `index.html` — Vite entry (replaces `jigsaw.html`)
- `src/types.ts` — `Difficulty`, `Direction`, `GameState` types
- `src/game.ts` — pure game logic
- `src/game.test.ts` — Bun tests for `game.ts`
- `src/audio.ts` — lazy-loaded sound manager
- `src/render.ts` — DOM rendering
- `src/ui.ts` — event wiring, dropdown, picker, overlay
- `src/main.ts` — bootstrap
- `src/styles.css` — responsive styles (replaces `jigsaw.css`)
- `Caddyfile` — Railway static server config
- `railway.toml` — Railway build/start commands
- `.gitignore`
- `README.md` — proper README (overwrite empty original)

**Moved:**
- `audio/` → `public/audio/`
- `images/` → `public/images/`
- `fonts/` → `public/fonts/`

**Deleted:**
- `jigsaw.html`, `jigsaw.js`, `jigsaw.css`

---

## Task 1: Project bootstrap (Bun + Vite + TS)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`

- [ ] **Step 1: Verify working directory and branch**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && git branch --show-current
```
Expected: `modernize`

- [ ] **Step 2: Create `.gitignore`**

Create `/Users/ricardosilva/projects/puzzle/.gitignore`:
```
node_modules/
dist/
.DS_Store
*.log
.env
.env.local
bun.lockb
.vite/
```

- [ ] **Step 3: Create `package.json`**

Create `/Users/ricardosilva/projects/puzzle/package.json`:
```json
{
  "name": "puzzle",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "@types/bun": "latest"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

Create `/Users/ricardosilva/projects/puzzle/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["bun-types"],
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true
  },
  "include": ["src/**/*.ts", "vite.config.ts"]
}
```

- [ ] **Step 5: Create `vite.config.ts`**

Create `/Users/ricardosilva/projects/puzzle/vite.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    cssMinify: true,
    minify: 'esbuild',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: false,
  },
});
```

- [ ] **Step 6: Create minimal `index.html`**

Create `/Users/ricardosilva/projects/puzzle/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>MultiPuzzle</title>
    <link rel="stylesheet" href="/src/styles.css">
</head>
<body>
    <main id="game">
        <h1 id="title">MultiPuzzle</h1>
        <div id="stage" class="board"></div>
        <div id="final" class="board" hidden></div>
        <div id="output">
            <div id="moves" class="left">
                <strong>Moves:</strong> <span id="counter">0</span>
            </div>
            <div class="right">
                <button id="showResult" class="icon view" type="button" aria-label="Show solution"></button>
                <button id="muteOpt" class="icon sound" type="button" aria-label="Toggle sound"></button>
            </div>
        </div>
        <div id="thumbSet"></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 7: Install deps and verify dev server boots**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun install
```
Expected: install completes; `node_modules/` and `bun.lockb` created.

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && timeout 5 bun run dev || true
```
Expected: Vite logs `Local: http://localhost:5173/` before timeout.

- [ ] **Step 8: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add .gitignore package.json tsconfig.json vite.config.ts index.html
git commit -m "$(cat <<'EOF'
build: scaffold Vite + Bun + TypeScript

Add package.json, tsconfig (strict), vite config, basic index.html,
and .gitignore. node_modules and bun.lockb are gitignored.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Move assets to `public/` and remove old files

**Files:**
- Move: `audio/`, `images/`, `fonts/` → `public/`
- Delete: `jigsaw.html`, `jigsaw.js`, `jigsaw.css`, `.gitattributes`

- [ ] **Step 1: Create `public/` and move assets**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && mkdir -p public && git mv audio public/audio && git mv images public/images && git mv fonts public/fonts
```
Expected: three directories moved; `git status` shows renames.

- [ ] **Step 2: Delete old top-level files**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && git rm jigsaw.html jigsaw.js jigsaw.css .gitattributes
```
Expected: 4 files deleted.

- [ ] **Step 3: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git commit -m "$(cat <<'EOF'
refactor: move assets to public/, remove flat JS/HTML/CSS files

Vite serves anything under public/ at the root path. The old
jigsaw.html / jigsaw.js / jigsaw.css are replaced by the
upcoming src/ TypeScript modules.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Define shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

Create `/Users/ricardosilva/projects/puzzle/src/types.ts`:
```ts
export type Difficulty = 3 | 4 | 5 | 6;

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type Board = number[][];

export interface GameState {
  difficulty: Difficulty;
  rows: number;
  columns: number;
  boardState: Board;
  solvedState: Board;
  plays: number;
  selectedImage: string | null;
  showingSolution: boolean;
}

export type SoundName = 'background' | 'move' | 'error' | 'shuffle' | 'solution' | 'success';

export const DIFFICULTIES: readonly Difficulty[] = [3, 4, 5, 6] as const;

export const PUZZLE_IMAGES: readonly string[] = [
  'algarve.png',
  'casino.png',
  'chaves.png',
  'girl.jpg',
  'obidos.jpg',
  'panda.jpg',
  'vchaves.jpg',
  'vidago.jpg',
] as const;
```

- [ ] **Step 2: Verify TS compiles**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run typecheck
```
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add src/types.ts
git commit -m "$(cat <<'EOF'
feat: add shared types and constants

Difficulty, Direction, Board, GameState, SoundName plus the
DIFFICULTIES and PUZZLE_IMAGES constants used by other modules.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Game logic (TDD)

**Files:**
- Create: `src/game.ts`, `src/game.test.ts`

- [ ] **Step 1: Write failing tests for `buildMap`, `isFinished`, and `moveTile`**

Create `/Users/ricardosilva/projects/puzzle/src/game.test.ts`:
```ts
import { describe, expect, it } from 'bun:test';
import { buildMap, isFinished, moveTile } from './game';
import type { GameState } from './types';

function makeState(difficulty: 3 | 4 | 5 | 6): GameState {
  const built = buildMap(difficulty);
  return {
    difficulty,
    rows: built.rows,
    columns: built.columns,
    boardState: built.boardState,
    solvedState: built.solvedState,
    plays: 0,
    selectedImage: null,
    showingSolution: false,
  };
}

describe('buildMap', () => {
  it('produces a difficulty x difficulty grid for 3', () => {
    const { boardState, solvedState, rows, columns } = buildMap(3);
    expect(rows).toBe(3);
    expect(columns).toBe(3);
    expect(boardState.length).toBe(3);
    expect(boardState[0]?.length).toBe(3);
    expect(solvedState).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
  });

  it('places empty tile (0) at bottom-right of boardState for 4x4', () => {
    const { boardState } = buildMap(4);
    expect(boardState[3]?.[3]).toBe(0);
  });

  it('numbers tiles 1..n*n with empty at end for 6x6', () => {
    const { boardState } = buildMap(6);
    expect(boardState[0]?.[0]).toBe(1);
    expect(boardState[5]?.[4]).toBe(35);
    expect(boardState[5]?.[5]).toBe(0);
  });
});

describe('isFinished', () => {
  it('returns false for an unsolved board', () => {
    const state = makeState(3);
    state.boardState = [[1, 2, 3], [4, 5, 6], [7, 0, 8]];
    expect(isFinished(state)).toBe(false);
  });

  it('returns true when tiles are in solved order', () => {
    const state = makeState(3);
    state.boardState = [[1, 2, 3], [4, 5, 6], [7, 8, 0]];
    expect(isFinished(state)).toBe(true);
  });
});

describe('moveTile', () => {
  it('swaps a tile with an adjacent empty cell and increments plays', () => {
    const state = makeState(3);
    state.boardState = [[1, 2, 3], [4, 5, 6], [7, 0, 8]];
    const result = moveTile(state, 8);
    expect(result.moved).toBe(true);
    expect(state.boardState).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 0]]);
    expect(state.plays).toBe(1);
  });

  it('does not move a tile that is not adjacent to the empty cell', () => {
    const state = makeState(3);
    state.boardState = [[1, 2, 3], [4, 5, 6], [7, 8, 0]];
    const result = moveTile(state, 1);
    expect(result.moved).toBe(false);
    expect(state.plays).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail with module-not-found**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun test src/game.test.ts 2>&1 | head -20
```
Expected: failure — `Cannot find module './game'` or similar.

- [ ] **Step 3: Implement `src/game.ts`**

Create `/Users/ricardosilva/projects/puzzle/src/game.ts`:
```ts
import type { Board, Difficulty, Direction, GameState } from './types';

export interface BuiltMap {
  rows: number;
  columns: number;
  boardState: Board;
  solvedState: Board;
}

export function buildMap(difficulty: Difficulty): BuiltMap {
  const rows = difficulty;
  const columns = difficulty;
  const boardState: Board = [];
  const solvedState: Board = [];
  let n = 1;
  for (let i = 0; i < rows; i++) {
    const rowBoard: number[] = [];
    const rowSolved: number[] = [];
    for (let j = 0; j < columns; j++) {
      rowBoard.push(n);
      rowSolved.push(n);
      n++;
    }
    boardState.push(rowBoard);
    solvedState.push(rowSolved);
  }
  boardState[rows - 1]![columns - 1] = 0;
  return { rows, columns, boardState, solvedState };
}

export function isFinished(state: GameState): boolean {
  let n = 0;
  for (let i = 0; i < state.rows; i++) {
    for (let j = 0; j < state.columns; j++) {
      n++;
      if (n < state.rows * state.columns) {
        if (state.boardState[i]![j] !== n) return false;
      }
    }
  }
  return true;
}

function findTile(state: GameState, tile: number): { row: number; column: number } | null {
  for (let i = 0; i < state.rows; i++) {
    for (let j = 0; j < state.columns; j++) {
      if (state.boardState[i]![j] === tile) return { row: i, column: j };
    }
  }
  return null;
}

export function moveTile(state: GameState, tile: number): { moved: boolean } {
  const pos = findTile(state, tile);
  if (!pos) return { moved: false };
  const { row, column } = pos;
  const board = state.boardState;
  const neighbors: Array<[number, number]> = [
    [row - 1, column],
    [row + 1, column],
    [row, column - 1],
    [row, column + 1],
  ];
  for (const [r, c] of neighbors) {
    if (r < 0 || r >= state.rows || c < 0 || c >= state.columns) continue;
    if (board[r]![c] === 0) {
      board[r]![c] = tile;
      board[row]![column] = 0;
      state.plays += 1;
      return { moved: true };
    }
  }
  return { moved: false };
}

function validDirections(
  state: GameState,
  emptyRow: number,
  emptyCol: number,
  prevRow: number,
  prevCol: number,
): Direction[] {
  const out: Direction[] = [];
  if (emptyRow - 1 >= 0 && emptyRow - 1 !== prevRow) out.push('UP');
  if (emptyRow + 1 < state.rows && emptyRow + 1 !== prevRow) out.push('DOWN');
  if (emptyCol - 1 >= 0 && emptyCol - 1 !== prevCol) out.push('LEFT');
  if (emptyCol + 1 < state.columns && emptyCol + 1 !== prevCol) out.push('RIGHT');
  return out;
}

export function shuffleBoard(state: GameState, random: () => number = Math.random): void {
  const iterations = state.difficulty * state.difficulty * 100;
  let i = state.rows - 1;
  let j = state.columns - 1;
  let prevI = i;
  let prevJ = j;

  for (let iter = 0; iter < iterations; iter++) {
    const dirs = validDirections(state, i, j, prevI, prevJ);
    const dir = dirs[Math.floor(random() * dirs.length)]!;
    const board = state.boardState;
    let ni = i;
    let nj = j;
    switch (dir) {
      case 'UP': ni = i - 1; break;
      case 'DOWN': ni = i + 1; break;
      case 'LEFT': nj = j - 1; break;
      case 'RIGHT': nj = j + 1; break;
    }
    board[i]![j] = board[ni]![nj]!;
    board[ni]![nj] = 0;
    prevI = i;
    prevJ = j;
    i = ni;
    j = nj;
  }
}

export function markSolvedComplete(state: GameState): void {
  state.boardState[state.rows - 1]![state.columns - 1] = state.rows * state.columns;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun test src/game.test.ts
```
Expected: 7 pass, 0 fail.

- [ ] **Step 5: Verify typecheck passes**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run typecheck
```
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add src/game.ts src/game.test.ts
git commit -m "$(cat <<'EOF'
feat: pure game logic with bun:test coverage

buildMap, isFinished, moveTile, shuffleBoard, markSolvedComplete.
Logic mirrors the 2020 implementation but is DOM-free, typed,
and unit-tested. shuffleBoard accepts an injectable random.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Audio module (lazy load)

**Files:**
- Create: `src/audio.ts`

- [ ] **Step 1: Create `src/audio.ts`**

Create `/Users/ricardosilva/projects/puzzle/src/audio.ts`:
```ts
import type { SoundName } from './types';

const SOURCES: Record<SoundName, { src: string; loop: boolean; volume: number }> = {
  background: { src: '/audio/introMusic.mp3', loop: true, volume: 0.2 },
  move: { src: '/audio/mover.mp3', loop: false, volume: 1 },
  error: { src: '/audio/erro.mp3', loop: false, volume: 1 },
  shuffle: { src: '/audio/baralhar.mp3', loop: false, volume: 1 },
  solution: { src: '/audio/showfinal.mp3', loop: false, volume: 1 },
  success: { src: '/audio/success.mp3', loop: false, volume: 1 },
};

export class AudioManager {
  private elements = new Map<SoundName, HTMLAudioElement>();
  private muted = false;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    for (const name of Object.keys(SOURCES) as SoundName[]) {
      const config = SOURCES[name];
      const el = new Audio(config.src);
      el.preload = 'auto';
      el.loop = config.loop;
      el.volume = config.volume;
      this.elements.set(name, el);
    }
    this.initialized = true;
    if (!this.muted) this.elements.get('background')?.play().catch(() => {});
  }

  play(name: SoundName): void {
    if (!this.initialized || this.muted) return;
    const el = this.elements.get(name);
    if (!el) return;
    if (name === 'background') {
      if (el.paused) el.play().catch(() => {});
      return;
    }
    el.currentTime = 0;
    el.play().catch(() => {});
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const bg = this.elements.get('background');
    if (!bg) return;
    if (muted) bg.pause();
    else if (this.initialized) bg.play().catch(() => {});
  }

  isMuted(): boolean {
    return this.muted;
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run typecheck
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add src/audio.ts
git commit -m "$(cat <<'EOF'
feat: lazy-loaded audio manager

AudioManager.init() runs on first user interaction (called from ui.ts
in a later commit) so we don't fight the browser autoplay policy or
download megabytes before the user touches the page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Render module

**Files:**
- Create: `src/render.ts`

- [ ] **Step 1: Create `src/render.ts`**

Create `/Users/ricardosilva/projects/puzzle/src/render.ts`:
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

export function renderBoard(
  state: GameState,
  refs: RenderRefs,
  opts: RenderOptions,
): void {
  const { stage, final, counter } = refs;
  const target = opts.showingSolution ? final : stage;
  const board = opts.showingSolution ? state.solvedState : state.boardState;

  target.replaceChildren();

  const boardSize = target.clientWidth || 366;
  const tileSize = boardSize / state.columns;

  for (let i = 0; i < state.rows; i++) {
    for (let j = 0; j < state.columns; j++) {
      const value = board[i]![j]!;
      if (value === 0) continue;

      const cell = document.createElement('div');
      cell.className = opts.showingSolution ? 'cell rotate' : 'cell';
      cell.dataset.tile = String(value);

      const bgX = -((value - 1) % state.columns) * tileSize;
      const bgY = -Math.floor((value - 1) / state.columns) * tileSize;

      cell.style.width = `${tileSize}px`;
      cell.style.height = `${tileSize}px`;
      cell.style.top = `${i * tileSize}px`;
      cell.style.left = `${j * tileSize}px`;
      cell.style.backgroundPositionX = `${bgX}px`;
      cell.style.backgroundPositionY = `${bgY}px`;
      cell.style.backgroundSize = `${boardSize}px ${boardSize}px`;

      if (state.selectedImage) {
        cell.style.backgroundImage = `url("/images/${state.selectedImage}")`;
      }

      if (!opts.showingSolution && state.selectedImage) {
        cell.addEventListener('click', () => opts.onTileClick(value));
      }

      target.appendChild(cell);
    }
  }

  counter.textContent = String(state.plays);
}
```

- [ ] **Step 2: Verify typecheck**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run typecheck
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add src/render.ts
git commit -m "$(cat <<'EOF'
feat: render module — paints board from GameState

Tile size derives from the actual rendered board width, so the
puzzle scales with the responsive layout (no more hard-coded 366
with magic per-difficulty offsets).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: UI module (overlay, picker, dropdown, mute, show-solution)

**Files:**
- Create: `src/ui.ts`

- [ ] **Step 1: Create `src/ui.ts`**

Create `/Users/ricardosilva/projects/puzzle/src/ui.ts`:
```ts
import { buildMap, isFinished, markSolvedComplete, moveTile, shuffleBoard } from './game';
import { renderBoard, type RenderRefs } from './render';
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

export function mountUI(refs: DOMRefs): void {
  const audio = new AudioManager();
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

    if (imageName) {
      shuffleBoard(state);
      audio.play('shuffle');
    }
    renderImagePicker();
    renderBoard(state, refs, { onTileClick: handleTileClick, showingSolution: false });
    overlay.classList.remove('visible');
  };

  const handleTileClick = (tile: number): void => {
    const result = moveTile(state, tile);
    if (result.moved) {
      audio.play('move');
    } else {
      audio.play('error');
    }
    if (isFinished(state)) {
      markSolvedComplete(state);
      audio.play('success');
      renderOverlayText(RESTART_RULES);
      startBtn.textContent = 'Restart game';
      overlay.classList.add('visible');
    }
    renderBoard(state, refs, { onTileClick: handleTileClick, showingSolution: false });
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
    renderBoard(state, refs, { onTileClick: handleTileClick, showingSolution: true });
  });

  const hideSolution = (): void => {
    if (!state.showingSolution || isFinished(state)) return;
    state.showingSolution = false;
    refs.stage.hidden = false;
    refs.final.hidden = true;
    refs.showResult.classList.remove('viewOff');
    renderBoard(state, refs, { onTileClick: handleTileClick, showingSolution: false });
  };
  refs.showResult.addEventListener('mouseup', hideSolution);
  refs.showResult.addEventListener('mouseleave', hideSolution);

  refs.muteOpt.addEventListener('click', () => {
    const next = !audio.isMuted();
    audio.setMuted(next);
    refs.muteOpt.classList.toggle('soundOff', next);
  });

  window.addEventListener('resize', () => {
    if (state.selectedImage) {
      renderBoard(state, refs, {
        onTileClick: handleTileClick,
        showingSolution: state.showingSolution,
      });
    }
  });

  renderImagePicker();
  renderOverlayText(INTRO_RULES);
  overlay.classList.add('visible');
}
```

- [ ] **Step 2: Verify typecheck**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run typecheck
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add src/ui.ts
git commit -m "$(cat <<'EOF'
feat: UI wiring with click-to-toggle difficulty dropdown

Replaces the hover-only difficulty menu with a button + dropdown
that works on touch. Mounts overlay, image picker, mute, and
show-solution. Wires audio through AudioManager.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Bootstrap + responsive styles

**Files:**
- Create: `src/main.ts`, `src/styles.css`

- [ ] **Step 1: Create `src/main.ts`**

Create `/Users/ricardosilva/projects/puzzle/src/main.ts`:
```ts
import { mountUI } from './ui';

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} element`);
  return el as T;
}

window.addEventListener('DOMContentLoaded', () => {
  mountUI({
    game: requireElement('game'),
    stage: requireElement('stage'),
    final: requireElement('final'),
    counter: requireElement('counter'),
    showResult: requireElement('showResult'),
    muteOpt: requireElement('muteOpt'),
    thumbSet: requireElement('thumbSet'),
  });
});
```

- [ ] **Step 2: Create `src/styles.css`**

Create `/Users/ricardosilva/projects/puzzle/src/styles.css`:
```css
/* MultiPuzzle — modernized from the 2020 version
   Original group: David Morais, Leonardo Carvalho, Ricardo Silva */

:root {
  --board-max: 366px;
  --board-size: min(90vw, var(--board-max));
  --primary: #1d4952;
  --primary-light: #1e7179;
  --accent: #008cba;
  --bg: rgba(0, 0, 0, 0.9);
  --text-light: #fff;
}

* { box-sizing: border-box; padding: 0; margin: 0; }

@font-face {
  font-family: PiratesWriters;
  src: url('/fonts/PiratesWriters.ttf') format('truetype');
  font-display: swap;
}

body {
  background-image: url('/images/background.jpg');
  background-size: cover;
  background-attachment: fixed;
  min-height: 100vh;
  font-family: tahoma, sans-serif;
  color: var(--text-light);
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
}

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
}
.board[hidden] { display: none; }

.cell {
  position: absolute;
  border: 1px solid white;
  border-radius: 5%;
  box-shadow: 1px 1px 1px #888;
  cursor: pointer;
  background-repeat: no-repeat;
  user-select: none;
}
.cell:hover { opacity: 0.9; }

.rotate {
  position: absolute;
  border: 1px solid white;
  border-radius: 5%;
  box-shadow: 1px 1px 1px #888;
  background-repeat: no-repeat;
  animation: rotate ease-out 0.5s;
}
@keyframes rotate {
  from { transform: rotate(180deg); border-radius: 100%; }
  to   { transform: rotate(360deg); border-radius: 5%; }
}

#output {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  text-shadow: 1px 1px 1px var(--primary);
}
#output .right { display: flex; gap: 6px; }

.icon {
  width: 28px;
  height: 28px;
  background-position: 0 0;
  background-repeat: no-repeat;
  background-size: cover;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
}
.view {
  background-image: url('/images/ui/view.png');
  box-shadow: inset 0 0 0 1px white;
}
.viewOff { background-position-x: -28px; }
.sound { background-image: url('/images/ui/sound-icon-250.png'); }
.soundOff { background-position-x: -28px; }

#thumbSet {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  position: relative;
}
.imgButton, .swing {
  width: 52px; height: 52px;
  border-radius: 50%;
  padding: 1px;
  background-color: white;
  cursor: pointer;
  object-fit: cover;
}
.swing { animation: swing infinite ease-in-out 12s; transform-origin: center; }
@keyframes swing {
  12.5% { transform: rotate(30deg); }
  37.5% { transform: rotate(-30deg); }
  50%   { transform: none; }
  62.5% { transform: rotate(-30deg); }
  87.5% { transform: rotate(30deg); }
  100%  { transform: none; }
}

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
}
#overlay.visible { display: flex; }
#overlay .overlay-text {
  max-width: 600px;
  font-family: Arial, Helvetica, sans-serif;
  text-align: left;
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
  border: 3px solid blue;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 1.25rem;
  font-weight: bold;
  font-family: Arial, Helvetica, sans-serif;
  color: white;
  cursor: pointer;
}
.startGame:hover { background-color: blue; }

#difficulty {
  position: relative;
}
.dropdown-toggle {
  background-color: #4caf50;
  border: 3px solid green;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
  color: white;
}
.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  flex-direction: column;
  gap: 4px;
  z-index: 11;
}
#difficulty.open .dropdown-menu { display: flex; }

.btnDif {
  padding: 8px 12px;
  border-radius: 8px;
  border: 0;
  font-weight: bold;
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
  color: white;
  font-size: 0.9rem;
}
.d3 { background-color: #4caf50; border: 3px solid green; }
.d4 { background-color: #ffe066; border: 3px solid #d4a017; color: #333; }
.d5 { background-color: #ff6a33; border: 3px solid orangered; }
.d6 { background-color: #f44336; border: 3px solid darkred; }

@media (max-width: 480px) {
  :root { --board-max: 100vw; }
  #game { margin-top: 12px; }
  h1#title { font-size: 36px; }
  .imgButton, .swing { width: 44px; height: 44px; }
}
```

- [ ] **Step 3: Verify typecheck and dev server boots**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run typecheck
```
Expected: exit 0.

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && timeout 5 bun run dev || true
```
Expected: Vite logs `Local: http://localhost:5173/`.

- [ ] **Step 4: Verify production build**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run build
```
Expected: `dist/` created, no TS errors, `dist/index.html` and `dist/assets/*` present.

- [ ] **Step 5: Sanity-check bundle size**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && du -sh dist/assets/*.js dist/assets/*.css 2>/dev/null
```
Expected: combined JS+CSS under 50 KB minified.

- [ ] **Step 6: Manual smoke test the dev server**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run dev &
SERVER_PID=$!
sleep 3
curl -s http://localhost:5173/ | head -5
kill $SERVER_PID 2>/dev/null
```
Expected: HTML response containing `<title>MultiPuzzle</title>`.

- [ ] **Step 7: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add src/main.ts src/styles.css
git commit -m "$(cat <<'EOF'
feat: bootstrap + responsive stylesheet

main.ts mounts the UI on DOMContentLoaded.
styles.css uses CSS variables and aspect-ratio: 1/1 so the
board scales with viewport. Mobile breakpoint at 480px.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Re-encode large MP3s with ffmpeg

**Files:**
- Modify (in-place): `public/audio/introMusic.mp3`, `public/audio/BlownAway.mp3`, `public/audio/Ouroboros.mp3`

The 3 large tracks (intro 9 MB, BlownAway 4 MB, Ouroboros 3 MB) are background music. The small SFX (`mover.mp3`, `erro.mp3`, `baralhar.mp3`, `showfinal.mp3`, `success.mp3`) are already small enough — skip them.

- [ ] **Step 1: Verify ffmpeg is available**

Run:
```bash
which ffmpeg && ffmpeg -version | head -1
```
Expected: ffmpeg path printed and version line. If missing, install with `brew install ffmpeg` and re-run.

- [ ] **Step 2: Re-encode introMusic.mp3 at 96 kbps mono**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle/public/audio
ls -lh introMusic.mp3
ffmpeg -y -i introMusic.mp3 -ac 1 -b:a 96k -map_metadata -1 introMusic.tmp.mp3 && mv introMusic.tmp.mp3 introMusic.mp3
ls -lh introMusic.mp3
```
Expected: re-encoded file is materially smaller than original (96k mono ≈ 720 KB/min; original 9 MB shrinks to ~30% or less).

- [ ] **Step 3: Re-encode BlownAway.mp3**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle/public/audio
ls -lh BlownAway.mp3
ffmpeg -y -i BlownAway.mp3 -ac 1 -b:a 96k -map_metadata -1 BlownAway.tmp.mp3 && mv BlownAway.tmp.mp3 BlownAway.mp3
ls -lh BlownAway.mp3
```
Expected: re-encoded file smaller than original.

- [ ] **Step 4: Re-encode Ouroboros.mp3**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle/public/audio
ls -lh Ouroboros.mp3
ffmpeg -y -i Ouroboros.mp3 -ac 1 -b:a 96k -map_metadata -1 Ouroboros.tmp.mp3 && mv Ouroboros.tmp.mp3 Ouroboros.mp3
ls -lh Ouroboros.mp3
```
Expected: re-encoded file smaller than original.

- [ ] **Step 5: Listen-test (manual, optional)**

Open `public/audio/introMusic.mp3` in any audio player. Confirm playback is intelligible (mono, ~96 kbps is fine for game music).

- [ ] **Step 6: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add public/audio/introMusic.mp3 public/audio/BlownAway.mp3 public/audio/Ouroboros.mp3
git commit -m "$(cat <<'EOF'
chore(audio): re-encode music tracks at 96 kbps mono

Drops introMusic from 9 MB, BlownAway from 4 MB, Ouroboros from
3 MB to ~1 MB each. Combined with lazy load in audio.ts this
keeps the page-load budget tiny.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Caddyfile + railway.toml

**Files:**
- Create: `Caddyfile`, `railway.toml`

- [ ] **Step 1: Create `Caddyfile`**

Create `/Users/ricardosilva/projects/puzzle/Caddyfile`:
```
:{$PORT:8080} {
    root * dist
    encode gzip zstd
    file_server
    try_files {path} /index.html
    @html path *.html
    header @html Cache-Control "no-cache, must-revalidate"
    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
}
```

- [ ] **Step 2: Create `railway.toml`**

Create `/Users/ricardosilva/projects/puzzle/railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "bun install && bun run build"

[deploy]
startCommand = "caddy run --config Caddyfile --adapter caddyfile"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[nixpacksConfig]
nixpkgs = ["caddy"]
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add Caddyfile railway.toml
git commit -m "$(cat <<'EOF'
build(deploy): Railway config — Caddy serving dist/

NIXPACKS builder runs bun install + vite build, then Caddy
serves the static dist/ on \$PORT with gzip+zstd, immutable
caching for /assets/*, no-cache for HTML.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Real README

**Files:**
- Modify: `README.md` (overwrite the empty original)

- [ ] **Step 1: Take a screenshot of the running app for the README**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && bun run dev &
SERVER_PID=$!
sleep 3
mkdir -p docs/img
bunx playwright@latest install chromium 2>&1 | tail -3
bunx --bun -p '@playwright/test' playwright screenshot --browser=chromium --viewport-size=900,1100 http://localhost:5173/ docs/img/screenshot.png
kill $SERVER_PID 2>/dev/null
ls -lh docs/img/screenshot.png
```
Expected: `docs/img/screenshot.png` created. If Playwright is unavailable, skip this step and write the README without an image — leave a `<!-- screenshot pending -->` comment instead.

- [ ] **Step 2: Overwrite `README.md`**

Create (replace contents) `/Users/ricardosilva/projects/puzzle/README.md`:
```markdown
# MultiPuzzle

A sliding-tile puzzle game. Pick one of 8 images, choose a difficulty (3×3 to 6×6), shuffle, and click tiles to slide them toward the empty cell until the picture is restored. Modernized in 2026 from a 2020 vanilla HTML/CSS/JS prototype.

![Screenshot](docs/img/screenshot.png)

**[Play it →](https://puzzle.up.railway.app)** *(URL filled in after first deploy)*

## Stack

- **TypeScript** strict mode
- **Vite** for bundling and dev server
- **Bun** as the package manager and test runner
- **Caddy** for static serving on Railway

## Run locally

```bash
bun install
bun run dev          # http://localhost:5173
```

## Test

```bash
bun test             # game logic unit tests
bun run typecheck
```

## Build

```bash
bun run build        # outputs to dist/
bun run preview      # serve the built bundle locally
```

## Deploy

Pushes to `main` are auto-deployed by Railway. The build runs
`bun install && bun run build`, and Caddy serves `dist/` on the
port Railway provides via `$PORT`.

To deploy from the CLI:

```bash
railway up
```

## Project layout

```
src/
  main.ts        bootstrap
  game.ts        pure game logic (DOM-free, unit-tested)
  render.ts      paints the board from GameState
  audio.ts       lazy-loaded sound manager
  ui.ts          events, dropdown, picker, overlay
  types.ts       shared types and constants
  styles.css     responsive styles
public/
  audio/         re-encoded mp3s (background music + SFX)
  images/        puzzle images and UI icons
  fonts/         display font (PiratesWriters.ttf)
```

## Credits

Original 2020 university project (Aplicações Multimédia):
**David Morais · Leonardo Carvalho · Ricardo Silva**.
Original scaffolding © Cláudio Barradas.

Modernized 2026 by Ricardo Silva.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ricardosilva/projects/puzzle
git add README.md
[ -f docs/img/screenshot.png ] && git add docs/img/screenshot.png
git commit -m "$(cat <<'EOF'
docs: real README with stack, run/build/deploy, layout, credits

Replaces the placeholder empty README. Includes screenshot when
the dev server + Playwright are available; leaves a marker
otherwise.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Push, merge, deploy, verify

**Files:** none (operational task)

- [ ] **Step 1: Push the `modernize` branch**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && git push -u origin modernize
```
Expected: branch published.

- [ ] **Step 2: Open a PR to `main`**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && gh pr create --title "Modernize: Vite + Bun + TypeScript, English UI, responsive layout, Railway deploy" --body "$(cat <<'EOF'
## Summary
- Migrate from flat HTML/CSS/JS to TypeScript + Vite + Bun
- Translate UI text and code identifiers from Portuguese to English
- Responsive layout (mobile/tablet/desktop), click-to-toggle difficulty
- Lazy-loaded audio with re-encoded MP3s
- Real README; Railway static deploy via Caddy

## Test plan
- [ ] `bun test` — game-logic unit tests pass
- [ ] `bun run typecheck` — clean
- [ ] `bun run build` — clean
- [ ] Manually play through a 3×3 and a 6×6 on desktop
- [ ] Manually play through a 3×3 on mobile (DevTools 375 wide)
- [ ] Verify difficulty dropdown opens on click and closes on outside click
- [ ] Verify mute toggle, show-solution press-and-hold

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR URL printed.

- [ ] **Step 3: Merge the PR**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && gh pr merge --squash --delete-branch
```
Expected: PR merged into `main`.

- [ ] **Step 4: Connect Railway project (one-time)**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && railway whoami
```
If not logged in, run `railway login` and complete the browser flow.

Then create / link the project:
```bash
cd /Users/ricardosilva/projects/puzzle && railway init --name puzzle
```
If a Railway project already exists for this repo, run `railway link` instead.

- [ ] **Step 5: Trigger first deploy**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && git checkout main && git pull && railway up --detach
```
Expected: build starts, deploy URL printed.

- [ ] **Step 6: Generate / fetch a public domain**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && railway domain
```
Expected: a `https://*.up.railway.app` URL.

- [ ] **Step 7: Tail logs for ~60 s and confirm Caddy started**

Run:
```bash
cd /Users/ricardosilva/projects/puzzle && timeout 60 railway logs || true
```
Expected: log lines from Caddy showing it bound to the port.

- [ ] **Step 8: Smoke-test the deployed URL**

Run (replace URL with the one from Step 6):
```bash
DEPLOYED_URL="https://puzzle-production.up.railway.app"
curl -sI "$DEPLOYED_URL" | head -3
curl -s "$DEPLOYED_URL" | grep -o '<title>[^<]*</title>'
```
Expected: HTTP 200; `<title>MultiPuzzle</title>`.

- [ ] **Step 9: Update README with the live URL**

Edit `README.md` — replace the placeholder line:
```
**[Play it →](https://puzzle.up.railway.app)** *(URL filled in after first deploy)*
```
with the actual `$DEPLOYED_URL`.

- [ ] **Step 10: Commit and push README update**

```bash
cd /Users/ricardosilva/projects/puzzle
git add README.md
git commit -m "$(cat <<'EOF'
docs: add live deployment URL to README

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin main
```

- [ ] **Step 11: Final manual QA on the live site**

Open the deployed URL in a desktop browser and a mobile DevTools viewport (375 wide):

1. Click "Start game" → overlay closes, image picker shows.
2. Click an image → board renders shuffled, plays counter at 0.
3. Click a tile adjacent to the empty cell → tile slides, counter increments.
4. Click a tile NOT adjacent → no movement, error sound plays.
5. Press and hold the eye icon → board shows the solved image; release → returns to scrambled.
6. Click the speaker icon → music mutes; click again → unmutes.
7. Click the difficulty button → dropdown appears with 3 options; click one → board rebuilds at that size.
8. Solve a 3×3 → success sound plays, "Restart game" overlay appears.

If any step fails, file an issue and address before declaring done.

---

## Self-Review Notes

Coverage check vs. spec:
- Build system Vite + Bun + TS strict — Task 1
- File restructure — Tasks 1, 2, 3-8
- Translate Portuguese → English — Task 7 (rules text), Task 8 (CSS comments), all source files
- Responsive layout — Task 8
- Click-to-toggle difficulty — Task 7
- Re-encode + lazy-load audio — Tasks 5, 9
- Real README — Task 11
- Railway deploy — Tasks 10, 12

Success criteria mapped:
- 4 difficulties on desktop + mobile → Task 12 Step 11
- Lighthouse perf/a11y ≥ 90 → not explicitly automated; manual check on the deployed URL
- Initial JS bundle < 50 KB minified → Task 8 Step 5
- Page load downloads zero audio bytes → enforced by `audio.ts` design (Task 5); audio elements only created on first interaction
- README has live URL, screenshot, run/deploy → Tasks 11 + 12 Step 9
