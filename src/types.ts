export type Track = {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover: string;
  duration: number;
};

export type PointerSource = "mouse" | "hand";

export type UiHit =
  | "blob"
  | "playlist"
  | "progress"
  | "volume"
  | "button"
  | "none";

export type GrabBridge = {
  grab: (index: number) => void;
  move: (clientX: number, clientY: number) => void;
  release: () => void;
  isHolding: () => boolean;
};

export type AudioBands = {
  bass: number;
  mids: number;
  highs: number;
  energy: number;
  beat: number;
};
