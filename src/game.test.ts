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
