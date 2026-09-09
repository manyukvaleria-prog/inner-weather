import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { AudioEngine } from "../audio/AudioEngine";
import { TRACKS } from "../data/tracks";
import { clamp } from "../lib/math";
import type { AudioBands, Track } from "../types";

type PlayerContextValue = {
  tracks: Track[];
  track: Track;
  index: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  volume: number;
  muted: boolean;
  bands: AudioBands;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  select: (index: number) => void;
  seek: (ratio: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  unlock: () => void;
  bandsRef: MutableRefObject<AudioBands>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();
  const engine = engineRef.current;

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.72);
  const [muted, setMuted] = useState(false);
  const [bands, setBands] = useState<AudioBands>({
    bass: 0,
    mids: 0,
    highs: 0,
    energy: 0,
    beat: 0,
  });
  const bandsRef = useRef<AudioBands>(bands);
  const indexRef = useRef(index);
  indexRef.current = index;

  const tracks = useMemo(() => [...TRACKS], []);
  const track = tracks[index];

  const loadIndex = useCallback(
    (nextIndex: number, shouldPlay: boolean) => {
      const wrapped = (nextIndex + tracks.length) % tracks.length;
      setIndex(wrapped);
      engine.load(tracks[wrapped]);
      if (shouldPlay) {
        void engine.play().then(() => setIsPlaying(true)).catch(() => {
          setIsPlaying(false);
        });
      }
    },
    [engine, tracks],
  );

  useEffect(() => {
    engine.attach();
    engine.load(tracks[0]);
    engine.setVolume(0.72);
    bandsRef.current = engine.bands;

    const audio = engine.element;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      if (!engine.isUnlocking) setIsPlaying(true);
    };
    const onPause = () => {
      if (!engine.isUnlocking) setIsPlaying(false);
    };
    const onEnded = () => {
      const next = (indexRef.current + 1) % tracks.length;
      loadIndex(next, true);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    const vis = window.setInterval(() => {
      setBands({ ...engine.bands });
    }, 80);

    return () => {
      window.clearInterval(vis);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      engine.dispose();
    };
  }, [engine, loadIndex, tracks]);

  const unlock = useCallback(() => {
    void engine.unlock();
  }, [engine]);

  const play = useCallback(() => {
    void engine.play().catch(() => setIsPlaying(false));
  }, [engine]);

  const pause = useCallback(() => {
    engine.pause();
  }, [engine]);

  const toggle = useCallback(() => {
    if (engine.element.paused) play();
    else pause();
  }, [engine, pause, play]);

  const next = useCallback(() => {
    loadIndex(indexRef.current + 1, !engine.element.paused || isPlaying);
  }, [engine, isPlaying, loadIndex]);

  const previous = useCallback(() => {
    loadIndex(indexRef.current - 1, !engine.element.paused || isPlaying);
  }, [engine, isPlaying, loadIndex]);

  const select = useCallback(
    (nextIndex: number) => {
      loadIndex(nextIndex, true);
    },
    [loadIndex],
  );

  const seek = useCallback(
    (ratio: number) => {
      engine.seek(ratio);
      setCurrentTime(engine.element.currentTime);
    },
    [engine],
  );

  const setVolume = useCallback(
    (value: number) => {
      const next = clamp(value, 0, 1);
      setVolumeState(next);
      engine.setVolume(next);
      if (next > 0) {
        engine.element.muted = false;
        setMuted(false);
      }
    },
    [engine],
  );

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      engine.element.muted = next;
      return next;
    });
  }, [engine]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      tracks,
      track,
      index,
      isPlaying,
      currentTime,
      duration,
      progress: duration > 0 ? currentTime / duration : 0,
      volume,
      muted,
      bands,
      play,
      pause,
      toggle,
      next,
      previous,
      select,
      seek,
      setVolume,
      toggleMute,
      unlock,
      bandsRef,
    }),
    [
      bands,
      currentTime,
      duration,
      index,
      isPlaying,
      next,
      pause,
      play,
      previous,
      seek,
      select,
      setVolume,
      toggle,
      toggleMute,
      track,
      tracks,
      unlock,
      volume,
      muted,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
