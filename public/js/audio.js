// Lightweight Web Audio sound effects - no audio files, no network requests.
import { store } from './store.js';

let context = null;
function ctx() {
  if (!context) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    context = new AudioCtx();
  }
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

function tone(freq, delay, duration, type = 'sine', volume = 0.07) {
  const ac = ctx();
  if (!ac) return;
  const now = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

const SOUNDS = {
  click: () => tone(520, 0, 0.055, 'triangle', 0.045),
  move: () => tone(680, 0, 0.08, 'triangle', 0.06),
  capture: () => { tone(720, 0, 0.07); tone(960, 0.06, 0.09); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.24, 'triangle', 0.075)),
  draw: () => { tone(392, 0, 0.14); tone(330, 0.12, 0.2); },
  lose: () => { tone(330, 0, 0.16, 'triangle', 0.05); tone(247, 0.13, 0.22, 'triangle', 0.045); },
  connect: () => { tone(440, 0, 0.09); tone(660, 0.08, 0.12); },
  disconnect: () => { tone(300, 0, 0.14, 'sawtooth', 0.04); tone(180, 0.12, 0.2, 'sawtooth', 0.035); },
  vote: () => tone(820, 0, 0.06, 'square', 0.035),
};

export function playSound(name) {
  if (store.get().muted) return;
  SOUNDS[name]?.();
}
