import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { GESTURE_CONFIG } from "../config/gestureConfig";
import type { HandPose, HandSide } from "../gestures/handPose";
import { wrapAngle } from "../gestures/handPose";
import { dist } from "../lib/math";
import type { GrabBridge } from "../types";
import { usePlayer } from "../player/PlayerProvider";
import type { PointerSource, UiHit } from "../types";

export type PointerState = {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  pressed: boolean;
  openPalm: boolean;
  pose: HandPose;
  source: PointerSource;
  handVisible: boolean;
};

type HandInput = {
  x: number;
  y: number;
  visible: boolean;
  pose: HandPose;
  angle: number;
  handedness: HandSide;
};

type GestureMode = "none" | "volume" | "grab";

type GestureState = {
  pose: HandPose;
  mode: GestureMode;
  originX: number;
  originY: number;
  lastX: number;
  lastY: number;
  lastAngle: number;
  startedAt: number;
  lastPoseAt: number;
};

function createGestureState(): GestureState {
  return {
    pose: "idle",
    mode: "none",
    originX: 0.5,
    originY: 0.5,
    lastX: 0.5,
    lastY: 0.5,
    lastAngle: 0,
    startedAt: 0,
    lastPoseAt: 0,
  };
}

type InteractionContextValue = {
  pointer: PointerState;
  playlistOpen: boolean;
  playlistRef: RefObject<HTMLDivElement>;
  updateHands: (hands: HandInput[]) => void;
  setHandUnavailable: () => void;
  registerGrab: (bridge: GrabBridge | null) => void;
};

const InteractionContext = createContext<InteractionContextValue | null>(null);

function hitFromPoint(clientX: number, clientY: number): {
  hit: UiHit;
  element: Element | null;
} {
  const element = document.elementFromPoint(clientX, clientY);
  if (element?.closest("[data-ui='playlist']")) {
    return { hit: "playlist", element };
  }
  if (element?.closest("[data-ui='progress']")) {
    return { hit: "progress", element };
  }
  if (element?.closest("[data-ui='volume']")) {
    return { hit: "volume", element };
  }
  if (element?.closest("button, [data-clickable='true']")) {
    return { hit: "button", element };
  }

  const nx = clientX / window.innerWidth - 0.5;
  const ny = clientY / window.innerHeight - 0.5;
  const blobR = GESTURE_CONFIG.blobHitRadius;
  if (nx * nx + ny * ny * 1.15 < blobR * blobR) {
    return { hit: "blob", element: element ?? null };
  }
  return { hit: "none", element: element ?? null };
}

function trackIndexAt(clientX: number, clientY: number): number | null {
  const { element } = hitFromPoint(clientX, clientY);
  const direct = element?.closest("[data-track-index]");
  if (direct) {
    const index = Number(direct.getAttribute("data-track-index"));
    if (Number.isFinite(index)) return index;
  }

  let best: number | null = null;
  let bestDist: number = GESTURE_CONFIG.grabRadius;
  document.querySelectorAll("[data-track-index]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.classList.contains("is-away")) return;
    const rect = node.getBoundingClientRect();
    const distTo = Math.hypot(
      clientX - (rect.left + rect.width / 2),
      clientY - (rect.top + rect.height / 2),
    );
    if (distTo < bestDist) {
      bestDist = distTo;
      const index = Number(node.getAttribute("data-track-index"));
      if (Number.isFinite(index)) best = index;
    }
  });
  return best;
}

export function InteractionProvider({ children }: { children: ReactNode }) {
  const player = usePlayer();
  const playerRef = useRef(player);
  playerRef.current = player;

  const playlistRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<PointerState>({
    x: 0.5,
    y: 0.5,
    clientX: typeof window === "undefined" ? 0 : window.innerWidth * 0.5,
    clientY: typeof window === "undefined" ? 0 : window.innerHeight * 0.5,
    pressed: false,
    openPalm: false,
    pose: "idle",
    source: "mouse",
    handVisible: false,
  });
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const gestures = useRef({
    Left: createGestureState(),
    Right: createGestureState(),
    unknown: createGestureState(),
  });

  const grabRef = useRef<GrabBridge | null>(null);
  const registerGrab = useCallback((bridge: GrabBridge | null) => {
    grabRef.current = bridge;
  }, []);

  const mouseBlob = useRef({
    down: false,
    x: 0,
    y: 0,
    hit: "none" as UiHit,
  });

  const resetGesture = (g: GestureState, pose: HandPose, x: number, y: number) => {
    g.pose = pose;
    g.mode = "none";
    g.originX = x;
    g.originY = y;
    g.lastX = x;
    g.lastY = y;
    g.startedAt = performance.now();
  };

  const updateHands = useCallback((hands: HandInput[]) => {
    if (!hands.length) return;
    const hasLeft = hands.some((hand) => hand.handedness === "Left");
    const cursor =
      hands.find((hand) => hand.handedness === "Right") ??
      hands[0];
    setPointer({
      x: cursor.x,
      y: cursor.y,
      clientX: cursor.x * window.innerWidth,
      clientY: cursor.y * window.innerHeight,
      pressed: cursor.pose !== "idle",
      openPalm: cursor.pose === "openPalm",
      pose: cursor.pose,
      source: "hand",
      handVisible: true,
    });

    hands.forEach((input) => {
      const allowVolume = input.handedness !== "Left" || !hasLeft;
      const g = gestures.current[input.handedness];
      const clientX = input.x * window.innerWidth;
      const clientY = input.y * window.innerHeight;

      if (input.pose !== g.pose) {
        if (g.mode === "grab") {
          grabRef.current?.release();
        }
        resetGesture(g, input.pose, input.x, input.y);
        g.lastAngle = input.angle;
        const now = performance.now();
        if (
          input.pose === "thumbsUp" &&
          now - g.lastPoseAt > GESTURE_CONFIG.poseCooldownMs
        ) {
          g.lastPoseAt = now;
          playerRef.current.play();
        } else if (
          input.pose === "twoFingers" &&
          now - g.lastPoseAt > GESTURE_CONFIG.poseCooldownMs
        ) {
          g.lastPoseAt = now;
          playerRef.current.pause();
        }
      }

      if (input.pose === "pinch") {
        g.lastX = input.x;
        g.lastY = input.y;
        if (g.mode !== "grab") {
          const index = trackIndexAt(clientX, clientY);
          if (index !== null) {
            grabRef.current?.grab(index);
            grabRef.current?.move(clientX, clientY);
            g.mode = "grab";
          }
        } else {
          grabRef.current?.move(clientX, clientY);
        }
        return;
      }

      if (input.pose === "openPalm") {
        const dAngle = wrapAngle(input.angle - g.lastAngle);
        const frameMove = Math.hypot(input.x - g.lastX, input.y - g.lastY);
        g.lastX = input.x;
        g.lastY = input.y;
        g.lastAngle = input.angle;

        if (g.mode === "none") {
          const rotating =
            allowVolume &&
            Math.abs(dAngle) > GESTURE_CONFIG.rotateDeadzone &&
            frameMove < GESTURE_CONFIG.rotateMaxTranslation;
          if (rotating) g.mode = "volume";
          else return;
        }

        if (g.mode === "volume" && allowVolume) {
          if (Math.abs(dAngle) > GESTURE_CONFIG.rotateDeadzone) {
            playerRef.current.setVolume(
              playerRef.current.volume + dAngle * GESTURE_CONFIG.rotateSensitivity,
            );
          }
        }
      }
    });
  }, []);

  const setHandUnavailable = useCallback(() => {
    if (
      gestures.current.Left.mode === "grab" ||
      gestures.current.Right.mode === "grab" ||
      gestures.current.unknown.mode === "grab"
    ) {
      grabRef.current?.release();
    }
    resetGesture(gestures.current.Left, "idle", 0.5, 0.5);
    resetGesture(gestures.current.Right, "idle", 0.5, 0.5);
    resetGesture(gestures.current.unknown, "idle", 0.5, 0.5);
    setPointer((prev) => ({
      ...prev,
      pressed: false,
      openPalm: false,
      pose: "idle",
      source: "mouse",
      handVisible: false,
    }));
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (pointer.handVisible) return;
      setPointer({
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
        clientX: event.clientX,
        clientY: event.clientY,
        pressed: event.buttons === 1,
        openPalm: false,
        pose: "idle",
        source: "mouse",
        handVisible: false,
      });
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || pointer.handVisible) return;
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      const { hit } = hitFromPoint(event.clientX, event.clientY);
      mouseBlob.current = { down: true, x, y, hit };
    };

    const onUp = (event: PointerEvent) => {
      if (pointer.handVisible) return;
      if (grabRef.current?.isHolding()) return;
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      const { down, x: startX, y: startY, hit } = mouseBlob.current;
      mouseBlob.current.down = false;
      if (!down) return;
      if (hit !== "blob") return;
      if (dist(x, y, startX, startY) > GESTURE_CONFIG.tapMaxDistance) return;
      playerRef.current.toggle();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [pointer.handVisible]);

  useEffect(() => {
    setPlaylistOpen(pointer.x >= GESTURE_CONFIG.playlistEdge);
  }, [pointer.x]);

  const value = useMemo<InteractionContextValue>(
    () => ({
      pointer,
      playlistOpen,
      playlistRef,
      updateHands,
      setHandUnavailable,
      registerGrab,
    }),
    [playlistOpen, pointer, registerGrab, setHandUnavailable, updateHands],
  );

  return (
    <InteractionContext.Provider value={value}>
      {children}
    </InteractionContext.Provider>
  );
}

export function useInteraction(): InteractionContextValue {
  const ctx = useContext(InteractionContext);
  if (!ctx) {
    throw new Error("useInteraction must be used within InteractionProvider");
  }
  return ctx;
}
