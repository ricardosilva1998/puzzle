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
