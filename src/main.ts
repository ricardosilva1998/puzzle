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
