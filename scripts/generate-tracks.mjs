import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "tracks");
mkdirSync(outDir, { recursive: true });

const sampleRate = 44100;
const seconds = 36;

const patches = [
  { bpm: 132, root: 49.0, fifth: 73.42 },
  { bpm: 128, root: 55.0, fifth: 82.41 },
  { bpm: 136, root: 46.25, fifth: 69.3 },
  { bpm: 140, root: 61.74, fifth: 92.5 },
  { bpm: 130, root: 51.91, fifth: 77.78 },
];

function writeWav(path, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clipped * 32767), 44 + i * 2);
  }
  writeFileSync(path, buffer);
}

function kick(dt) {
  if (dt < 0 || dt > 0.2) return 0;
  const env = Math.exp(-dt * 26);
  const freq = 140 * Math.exp(-dt * 16) + 42;
  return Math.sin(2 * Math.PI * freq * dt) * env;
}

function hat(dt) {
  if (dt < 0 || dt > 0.06) return 0;
  return (Math.random() * 2 - 1) * Math.exp(-dt * 58);
}

function bass(t, freq, dt) {
  if (dt < 0 || dt > 0.22) return 0;
  const env = Math.exp(-dt * 9);
  const wave = Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(2 * Math.PI * freq * 2 * t);
  return wave * env * 0.42;
}

patches.forEach((patch, index) => {
  const n = sampleRate * seconds;
  const samples = new Float32Array(n);
  const beat = 60 / patch.bpm;
  for (let i = 0; i < n; i += 1) {
    const t = i / sampleRate;
    const fade = Math.min(1, t / 0.4) * Math.min(1, (seconds - t) / 0.8);
    const beatPos = t % beat;
    const step = Math.floor((t / (beat / 2)) % 8);
    let s = kick(beatPos) * 0.95;
    if (step % 2 === 1) s += hat(t % (beat / 2)) * 0.16;
    if (step === 2 || step === 6) s += bass(t, patch.root, t % (beat / 2));
    if (step === 4) s += bass(t, patch.fifth, t % (beat / 2)) * 0.7;
    samples[i] = Math.tanh(s * 1.15) * fade * 0.78;
  }
  const name = `${String(index + 1).padStart(2, "0")}.wav`;
  writeWav(join(outDir, name), samples);
  console.log("wrote", name);
});
