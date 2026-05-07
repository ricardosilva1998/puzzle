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
