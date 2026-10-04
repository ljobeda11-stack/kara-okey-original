// Party soundboard — 100% synthesized with Web Audio, zero audio files.
// Used by the TV (loud) and guest phones (local feedback + broadcast to TV).

export const EFFECTS = [
  { id: 'cheer', emoji: '👏', label: 'Cheer', color: '#22c55e' },
  { id: 'horn', emoji: '📯', label: 'Horn', color: '#f59e0b' },
  { id: 'wow', emoji: '😮', label: 'Wow!', color: '#06b6d4' },
  { id: 'applause', emoji: '🎉', label: 'Applause', color: '#ec4899' },
  { id: 'laugh', emoji: '😂', label: 'Laugh', color: '#a855f7' },
  { id: 'whistle', emoji: '🎶', label: 'Whistle', color: '#6366f1' },
];

let ctx = null;
const lastPlay = {};

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  } catch (e) {
    return false;
  }
}

function now() {
  unlockAudio();
  return ctx ? ctx.currentTime : 0;
}

function noiseBuffer(seconds) {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * seconds), rate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function playNoise({ at = 0, dur = 0.2, volume = 0.5, freq = 2000, type = 'bandpass' }) {
  const t = now() + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(dur + 0.05);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
  src.stop(t + dur + 0.05);
}

function playTone({ at = 0, dur = 0.3, from = 440, to = null, volume = 0.3, type = 'sine' }) {
  const t = now() + at;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function playEffect(id) {
  if (typeof window === 'undefined') return;
  try {
    // Spam-friendly guard: same effect max ~1x per 120ms per device
    const t = performance.now();
    if (t - (lastPlay[id] || 0) < 120) return;
    lastPlay[id] = t;
    unlockAudio();
    if (!ctx) return;
    const fn = builders[id] || builders.cheer;
    fn();
  } catch (e) {}
}

const builders = {
  // Crowd cheer: layered noise swells
  cheer() {
    playNoise({ at: 0, dur: 0.7, volume: 0.5, freq: 1800 });
    playNoise({ at: 0.1, dur: 0.8, volume: 0.45, freq: 2600 });
    playNoise({ at: 0.25, dur: 0.6, volume: 0.4, freq: 1400 });
    playTone({ at: 0.05, dur: 0.4, from: 700, to: 1400, volume: 0.08, type: 'triangle' });
  },
  // Air horn: classic stadium blast
  horn() {
    playTone({ at: 0, dur: 0.9, from: 220, to: 218, volume: 0.45, type: 'sawtooth' });
    playTone({ at: 0, dur: 0.9, from: 277, to: 275, volume: 0.35, type: 'sawtooth' });
    playTone({ at: 0, dur: 0.9, from: 440, to: 438, volume: 0.2, type: 'square' });
  },
  // "Wow!" riser + sparkle
  wow() {
    playTone({ at: 0, dur: 0.7, from: 300, to: 1200, volume: 0.3, type: 'sawtooth' });
    playTone({ at: 0.55, dur: 0.3, from: 1200, to: 1800, volume: 0.2, type: 'sine' });
    playTone({ at: 0.7, dur: 0.5, from: 900, to: 900, volume: 0.15, type: 'triangle' });
  },
  // Applause: rapid clap bursts
  applause() {
    for (let i = 0; i < 10; i++) {
      playNoise({ at: i * 0.09, dur: 0.06, volume: 0.5, freq: 3200, type: 'highpass' });
    }
    playNoise({ at: 1.0, dur: 0.8, volume: 0.35, freq: 2000 });
  },
  // Laugh: bouncing pitch "ha-ha-ha"
  laugh() {
    const seq = [500, 420, 560, 460, 620];
    seq.forEach((f, i) => {
      playTone({ at: i * 0.14, dur: 0.13, from: f, to: f * 0.75, volume: 0.3, type: 'square' });
    });
  },
  // Wolf whistle: two-note slide
  whistle() {
    playTone({ at: 0, dur: 0.35, from: 900, to: 1600, volume: 0.3, type: 'sine' });
    playTone({ at: 0.38, dur: 0.6, from: 1600, to: 2200, volume: 0.3, type: 'sine' });
  },
};
