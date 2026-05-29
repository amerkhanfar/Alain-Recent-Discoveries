/* =========================================================================
   Procedural UI sound effects (Web Audio API)
   No audio files — fully offline-safe. All sounds are short, soft and tuned
   for a calm museum ambience. Browsers block audio until a user gesture, so
   unlock() must be called from the first tap/click (wired in main.js).
   ========================================================================= */
let ctx = null;
let master = null;
let enabled = true;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;          // overall headroom
    master.connect(ctx.destination);
  } catch (e) { ctx = null; }
  return ctx;
}

function resume() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
  return c;
}

/* a single soft oscillator "blip" with an exponential decay envelope */
function blip({ freq = 440, type = 'sine', dur = 0.12, peak = 0.14, attack = 0.004, from = null, to = null, when = 0 }) {
  const c = resume();
  if (!c || !enabled) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  const f0 = (from == null) ? freq : from;
  osc.frequency.setValueAtTime(f0, t0);
  if (to != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/* soft band-passed noise "whoosh" for transitions / the reveal */
function whoosh({ dur = 0.35, peak = 0.10, when = 0, f0 = 300, f1 = 1400 }) {
  const c = resume();
  if (!c || !enabled) return;
  const t0 = c.currentTime + when;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(f0, t0);
  bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  bp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export const SFX = {
  /* call from a user gesture to satisfy the autoplay policy */
  unlock() { resume(); },
  setEnabled(v) { enabled = !!v; },
  isEnabled() { return enabled; },

  /* generic button tap — a soft, quick descending "tok" */
  click() { blip({ type: 'triangle', from: 880, to: 600, dur: 0.05, peak: 0.13 }); },

  /* going back — a gentler, lower descending blip */
  back() { blip({ type: 'triangle', from: 540, to: 360, dur: 0.07, peak: 0.12 }); },

  /* moving between pages — a light whoosh + rising tone */
  transition() {
    whoosh({ dur: 0.28, peak: 0.07, f0: 500, f1: 1600 });
    blip({ type: 'sine', from: 440, to: 660, dur: 0.18, peak: 0.07 });
  },

  /* arriving at the exhibit / "start exploring" — a warm two-note chime */
  chime() {
    blip({ type: 'sine', freq: 587.33, dur: 0.30, peak: 0.14, when: 0 });     // D5
    blip({ type: 'sine', freq: 880.00, dur: 0.42, peak: 0.11, when: 0.10 });  // A5
  },

  /* home stone-reveal — soft whoosh + warm rising arpeggio */
  reveal() {
    whoosh({ dur: 0.5, peak: 0.10, f0: 250, f1: 1900 });
    [392.00, 523.25, 659.25, 783.99].forEach((n, i) =>     // G4 C5 E5 G5
      blip({ type: 'sine', freq: n, dur: 0.5, peak: 0.15, attack: 0.01, when: i * 0.09 }));
  },

  /* story-step entrance — a few staggered pips that echo the parts popping in */
  step(idx = 0) {
    const base = 520 + (((idx % 4) + 4) % 4) * 40;
    [0, 0.07, 0.14].forEach((d, i) =>
      blip({ type: 'sine', freq: base + i * 120, dur: 0.13, peak: 0.08, when: d }));
  }
};
