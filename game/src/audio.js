// Every sound the kitchen makes, synthesised with the Web Audio API: no audio files,
// so the game loads nothing over the network. The context is created lazily on the
// first user gesture, and every call is safe when audio is unavailable.

let context = null;

function audioContext() {
  if (context) return context;
  try {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  } catch {
    return null;
  }
  return context;
}

/** One short oscillator blip. `type` is the waveform, `slideTo` an optional end pitch. */
function blip(frequency, duration, type, volume, slideTo) {
  const ctx = audioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // A browser that refuses audio must never break the game.
  }
}

/** Warm up the context on a gesture so the first real sound is not late. */
export function unlockAudio() {
  audioContext();
}

export function soundChop() {
  blip(220, 0.07, 'square', 0.12, 90);
  blip(440, 0.05, 'triangle', 0.08, 300);
}

export function soundPickup() {
  blip(520, 0.08, 'sine', 0.1, 700);
}

export function soundPlace() {
  blip(300, 0.08, 'triangle', 0.12, 180);
}

export function soundCooked() {
  blip(880, 0.12, 'sine', 0.1, 1320);
}

export function soundServe() {
  blip(523, 0.1, 'triangle', 0.14);
  setTimeout(() => blip(659, 0.1, 'triangle', 0.14), 90);
  setTimeout(() => blip(784, 0.18, 'triangle', 0.16), 180);
}

export function soundNewOrder() {
  blip(660, 0.09, 'sine', 0.09, 880);
}

export function soundError() {
  blip(160, 0.16, 'sawtooth', 0.1, 110);
}

export function soundExpire() {
  blip(392, 0.14, 'sawtooth', 0.09, 196);
  setTimeout(() => blip(311, 0.2, 'sawtooth', 0.09, 155), 130);
}

export function soundTick() {
  blip(980, 0.05, 'sine', 0.07);
}

export function soundStart() {
  blip(392, 0.1, 'triangle', 0.12);
  setTimeout(() => blip(523, 0.1, 'triangle', 0.12), 100);
  setTimeout(() => blip(659, 0.16, 'triangle', 0.14), 200);
}
