import type { AudioBands, Track } from "../types";
import { clamp } from "../lib/math";

const EMPTY_BANDS: AudioBands = { bass: 0, mids: 0, highs: 0, energy: 0, beat: 0 };

function averageRange(data: Uint8Array, from: number, to: number): number {
  let sum = 0;
  const start = Math.max(0, from);
  const end = Math.min(data.length - 1, to);
  if (end < start) return 0;
  for (let i = start; i <= end; i += 1) sum += data[i];
  return sum / (end - start + 1) / 255;
}

export class AudioEngine {
  readonly element: HTMLAudioElement;
  readonly bands: AudioBands = { ...EMPTY_BANDS };

  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freq = new Uint8Array(0);
  private raf = 0;
  private smoothed: AudioBands = { ...EMPTY_BANDS };
  private kickEnv = 0;
  private kickFloor = 0;
  private unlocked = false;
  private swallowing = false;

  constructor() {
    const audio = document.createElement("audio");
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    this.element = audio;
  }

  attach(): void {
    if (this.element.isConnected) return;
    this.element.hidden = true;
    document.body.appendChild(this.element);
  }

  ensureGraph(): void {
    if (this.context && this.analyser) {
      if (this.context.state === "suspended") void this.context.resume();
      return;
    }

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.32;
    const source = context.createMediaElementSource(this.element);
    source.connect(analyser);
    analyser.connect(context.destination);

    this.context = context;
    this.analyser = analyser;
    this.source = source;
    this.freq = new Uint8Array(analyser.frequencyBinCount);
    if (context.state === "suspended") void context.resume();
    this.poll();
  }

  setVolume(volume: number): void {
    this.element.volume = clamp(volume, 0, 1);
  }

  get isUnlocking(): boolean {
    return this.swallowing;
  }

  load(track: Track): void {
    const next = new URL(track.url, window.location.origin).href;
    if (this.element.src === next && this.element.currentSrc) return;
    this.element.src = track.url;
    this.element.load();
  }

  async unlock(): Promise<void> {
    this.ensureGraph();
    if (this.context?.state === "suspended") {
      await this.context.resume().catch(() => undefined);
    }
    if (this.unlocked || !this.element.paused) {
      this.unlocked = true;
      return;
    }
    const el = this.element;
    this.swallowing = true;
    try {
      el.muted = true;
      await el.play();
      if (this.swallowing) el.pause();
      this.unlocked = true;
    } catch {
      this.unlocked = false;
    } finally {
      el.muted = false;
      this.swallowing = false;
    }
  }

  async play(): Promise<void> {
    this.swallowing = false;
    this.ensureGraph();
    if (this.context?.state === "suspended") {
      await this.context.resume();
    }
    this.unlocked = true;
    this.element.muted = false;
    await this.element.play();
  }

  pause(): void {
    this.element.pause();
  }

  seek(ratio: number): void {
    const duration = this.element.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    this.element.currentTime = clamp(ratio, 0, 1) * duration;
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.element.pause();
    this.element.remove();
    this.element.src = "";
    this.source?.disconnect();
    this.analyser?.disconnect();
    void this.context?.close();
    this.context = null;
    this.source = null;
    this.analyser = null;
  }

  private poll = (): void => {
    this.raf = requestAnimationFrame(this.poll);
    const analyser = this.analyser;
    if (!analyser) return;
    analyser.getByteFrequencyData(this.freq);

    const nyquist = (this.context?.sampleRate ?? 44100) / 2;
    const binHz = nyquist / this.freq.length;
    const bass = averageRange(this.freq, 0, Math.floor(180 / binHz));
    const kickRaw = averageRange(this.freq, 0, Math.floor(120 / binHz));
    const mids = averageRange(
      this.freq,
      Math.floor(180 / binHz),
      Math.floor(2800 / binHz),
    );
    const highs = averageRange(
      this.freq,
      Math.floor(2800 / binHz),
      Math.floor(10000 / binHz),
    );
    const energy = bass * 0.5 + mids * 0.32 + highs * 0.18;
    const kick = Math.pow(kickRaw, 1.18);

    this.kickFloor += (kick - this.kickFloor) * 0.032;
    const onset = Math.max(0, kick - this.kickFloor * 0.88);
    const beatTarget = Math.min(1, kick * 0.7 + onset * 2.6);
    const beatFollow = beatTarget > this.kickEnv ? 0.62 : 0.12;
    this.kickEnv += (beatTarget - this.kickEnv) * beatFollow;

    const bassFollow = bass > this.smoothed.bass ? 0.45 : 0.12;
    this.smoothed.bass += (bass - this.smoothed.bass) * bassFollow;
    this.smoothed.mids += (mids - this.smoothed.mids) * 0.16;
    this.smoothed.highs += (highs - this.smoothed.highs) * 0.16;
    this.smoothed.energy += (energy - this.smoothed.energy) * 0.18;
    this.smoothed.beat = this.kickEnv;

    this.bands.bass = this.smoothed.bass;
    this.bands.mids = this.smoothed.mids;
    this.bands.highs = this.smoothed.highs;
    this.bands.energy = this.smoothed.energy;
    this.bands.beat = this.smoothed.beat;
  };
}
