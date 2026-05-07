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
