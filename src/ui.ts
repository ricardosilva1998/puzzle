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
