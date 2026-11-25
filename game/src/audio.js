// audio.js — all sound is synthesized with WebAudio, no audio files. Tiny
// bleeps for chopping, sizzling, plating, serving and mistakes, plus a soft
// wok-toss noise. Created lazily on the first user gesture so browsers allow it.
let audioContext = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureContext() {
  if (audioContext) return audioContext;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  } catch {
    return null;
  }
  return audioContext;
}

export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(freq, durationMs, type = 'sine', volume = 0.12, slideTo = null) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + durationMs / 1000);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.02);
  } catch {
    // Sound is garnish; a failure must never break the game.
  }
}

function noiseBurst(durationMs, volume = 0.08) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const len = Math.floor(ctx.sampleRate * (durationMs / 1000));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    src.start();
  } catch {
    // Ignore audio failures.
  }
}

export const sfx = {
  chop() {
    tone(720, 60, 'square', 0.07);
    noiseBurst(50, 0.05);
  },
  scoopRice() {
    tone(300, 90, 'sine', 0.1, 520);
  },
  sizzleStart() {
    noiseBurst(320, 0.09);
    tone(180, 200, 'sawtooth', 0.04, 90);
  },
  toss() {
    tone(420, 70, 'triangle', 0.09, 640);
  },
  plate() {
    tone(520, 90, 'triangle', 0.1);
    tone(780, 110, 'triangle', 0.08);
  },
  serveGood() {
    tone(523, 110, 'sine', 0.12);
    setTimeout(() => tone(659, 110, 'sine', 0.12), 90);
    setTimeout(() => tone(784, 180, 'sine', 0.12), 180);
  },
  servePerfect() {
    tone(523, 100, 'sine', 0.12);
    setTimeout(() => tone(659, 100, 'sine', 0.12), 80);
    setTimeout(() => tone(784, 100, 'sine', 0.12), 160);
    setTimeout(() => tone(1046, 220, 'sine', 0.12), 240);
  },
  burnt() {
    tone(220, 260, 'sawtooth', 0.1, 110);
  },
  expired() {
    tone(330, 180, 'square', 0.07, 180);
  },
  denied() {
    tone(160, 120, 'square', 0.08);
  },
  tick() {
    tone(980, 40, 'sine', 0.05);
  },
  dayEnd() {
    tone(392, 140, 'sine', 0.1);
    setTimeout(() => tone(523, 140, 'sine', 0.1), 130);
    setTimeout(() => tone(659, 260, 'sine', 0.1), 260);
  },
};
