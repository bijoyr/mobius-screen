// Synthesizes a soft, royalty-free ambient backing track (gentle Cmaj7–Am7–Fmaj7–G
// pad + light arpeggio) to public/music.wav. Self-contained — no external assets or
// licensing. Regenerated automatically before `npm run render` / `npm run studio`.
import fs from "node:fs";
import path from "node:path";

const sr = 32000;
const dur = 35; // seconds (>= composition length of ~34s)
const N = sr * dur;

// Chord progression (Hz), 4s each, looping.
const chords = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 349.23], // G
];
const chordDur = 4;

const chordSum = (chord, t) => {
  let s = 0;
  for (const f of chord) s += Math.sin(2 * Math.PI * f * t);
  return s / chord.length;
};

const out = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / sr;
  // --- pad: equal-power crossfade between current and next chord ---
  const p = t / chordDur;
  const k = Math.floor(p);
  const frac = p - k;
  const cur = chords[k % 4];
  const next = chords[(k + 1) % 4];
  const gA = Math.cos((frac * Math.PI) / 2);
  const gB = Math.sin((frac * Math.PI) / 2);
  const pad = gA * chordSum(cur, t) + gB * chordSum(next, t);

  // --- light arpeggio one octave up, gentle pluck every 0.5s ---
  const step = Math.floor(t / 0.5);
  const note = cur[step % 4] * 2;
  const phase = t - step * 0.5;
  const env = Math.exp(-phase * 6) * (phase < 0.01 ? phase / 0.01 : 1);
  const arp = Math.sin(2 * Math.PI * note * t) * env;

  // --- master fade in (2s) / out (3s) ---
  let fade = 1;
  if (t < 2) fade = 0.5 - 0.5 * Math.cos((Math.PI * t) / 2);
  else if (t > dur - 3) fade = 0.5 - 0.5 * Math.cos((Math.PI * (dur - t)) / 3);

  out[i] = Math.tanh((pad * 0.5 + arp * 0.16) * fade);
}

// --- write 16-bit mono WAV ---
const buf = Buffer.alloc(44 + N * 2);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 2, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(1, 22); // mono
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
