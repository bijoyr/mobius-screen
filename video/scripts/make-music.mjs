// Synthesizes a catchy-but-tasteful, royalty-free backing track to public/music.wav:
// a chord pad + walking bass + a repeating melody motif + a soft beat (kick/hat).
// Self-contained — no external assets or licensing. Regenerated before render/studio.
import fs from "node:fs";
import path from "node:path";

const sr = 32000;
const dur = 35; // seconds (>= composition length ~34s)
const N = sr * dur;

const beat = 0.5; // 120 BPM
const bar = beat * 4; // 2s
const chordDur = bar * 2; // 4s = 2 bars

// Cmaj7 – Am7 – Fmaj7 – G  (root, third, fifth, seventh)
const chords = [
  [261.63, 329.63, 392.0, 493.88],
  [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 329.63],
  [196.0, 246.94, 293.66, 349.23],
];
const chordAt = (t) => chords[Math.floor(t / chordDur) % chords.length];

// Repeating 8-eighth melody motif (indices into the current chord tones, octave up).
const motif = [0, 2, 1, 2, 3, 2, 1, 0];
const pluck = (ph, d) => (ph < 0 ? 0 : Math.exp(-ph * d) * (ph < 0.008 ? ph / 0.008 : 1));

const out = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / sr;

  // pad: equal-power crossfade between current and next chord
  const p = t / chordDur;
  const kf = Math.floor(p);
  const fr = p - kf;
  const cur = chords[kf % 4];
  const nxt = chords[(kf + 1) % 4];
  const sum = (c) => (Math.sin(2 * Math.PI * c[0] * t) + Math.sin(2 * Math.PI * c[1] * t) + Math.sin(2 * Math.PI * c[2] * t) + Math.sin(2 * Math.PI * c[3] * t)) / 4;
  const pad = Math.cos((fr * Math.PI) / 2) * sum(cur) + Math.sin((fr * Math.PI) / 2) * sum(nxt);

  const chord = chordAt(t);

  // melody (eighth notes, octave up)
  const eIdx = Math.floor(t / (beat / 2));
  const ePh = t - eIdx * (beat / 2);
  const mNote = chord[motif[eIdx % 8] % 4] * 2;
  const melody = Math.sin(2 * Math.PI * mNote * t) * pluck(ePh, 7);

  // bass (root/fifth, octave down), accent on beats 1 & 3
  const bIdx = Math.floor(t / beat);
  const bPh = t - bIdx * beat;
  const bWithinBar = bIdx % 4;
  const bassFreq = (bWithinBar === 3 ? chord[2] : chord[0]) / 2;
  const accent = bWithinBar % 2 === 0 ? 1 : 0.6;
  const bass = Math.sin(2 * Math.PI * bassFreq * t) * pluck(bPh, 5) * accent;

  // kick on beats 1 & 3
  let kick = 0;
  if (bWithinBar === 0 || bWithinBar === 2) {
    const f = 50 + 90 * Math.exp(-bPh * 35);
    kick = Math.sin(2 * Math.PI * f * bPh) * Math.exp(-bPh * 14);
  }

  // hat on off-eighths
  let hat = 0;
  if (eIdx % 2 === 1 && ePh < 0.05) {
    hat = (Math.random() * 2 - 1) * Math.exp(-ePh * 90);
  }

  // master fade in (1.5s) / out (3s)
  let fade = 1;
  if (t < 1.5) fade = 0.5 - 0.5 * Math.cos((Math.PI * t) / 1.5);
  else if (t > dur - 3) fade = 0.5 - 0.5 * Math.cos((Math.PI * (dur - t)) / 3);

  const mix = pad * 0.26 + melody * 0.2 + bass * 0.34 + kick * 0.55 + hat * 0.06;
  out[i] = Math.tanh(mix * 1.1) * fade;
}

// write 16-bit mono WAV
const buf = Buffer.alloc(44 + N * 2);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 2, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(sr, 24);
buf.writeUInt32LE(sr * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  const s = Math.max(-1, Math.min(1, out[i]));
  buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
}
const dir = path.join(process.cwd(), "public");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "music.wav"), buf);
console.log(`wrote public/music.wav (${(buf.length / 1048576).toFixed(1)} MB, ${dur}s)`);
