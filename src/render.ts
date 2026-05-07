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
