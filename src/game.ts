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
