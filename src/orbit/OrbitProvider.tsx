import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GESTURE_CONFIG } from "../config/gestureConfig";
import { useInteraction } from "../interaction/InteractionProvider";
import { usePlayer } from "../player/PlayerProvider";

export type OrbitContextValue = {
  heldIndex: number | null;
  absorbingIndex: number | null;
  nearCore: boolean;
  corePulse: number;
  grab: (index: number) => void;
  moveHold: (clientX: number, clientY: number) => void;
  release: () => void;
  isHolding: () => boolean;
  setNearCore: (near: boolean) => void;
  beginAbsorb: (index: number) => void;
  finishAbsorb: (index: number) => void;
  holdPoint: { x: number; y: number };
};

const OrbitContext = createContext<OrbitContextValue | null>(null);

export function OrbitProvider({ children }: { children: ReactNode }) {
  const player = usePlayer();
  const playerRef = useRef(player);
  playerRef.current = player;
  const { registerGrab } = useInteraction();

  const [heldIndex, setHeldIndex] = useState<number | null>(null);
  const [absorbingIndex, setAbsorbingIndex] = useState<number | null>(null);
  const [nearCore, setNearCore] = useState(false);
  const [corePulse, setCorePulse] = useState(0);
  const [holdPoint, setHoldPoint] = useState({ x: 0, y: 0 });

  const heldRef = useRef<number | null>(null);
  const absorbingRef = useRef<number | null>(null);
  const holdPointRef = useRef({ x: 0, y: 0 });

  const grab = useCallback((index: number) => {
    if (absorbingRef.current !== null) return;
    heldRef.current = index;
    setHeldIndex(index);
  }, []);

  const moveHold = useCallback((clientX: number, clientY: number) => {
    holdPointRef.current = { x: clientX, y: clientY };
    setHoldPoint({ x: clientX, y: clientY });
  }, []);

  const beginAbsorb = useCallback((index: number) => {
    if (absorbingRef.current !== null) return;
    heldRef.current = null;
    absorbingRef.current = index;
    setHeldIndex(null);
    setAbsorbingIndex(index);
    setNearCore(true);
  }, []);

  const finishAbsorb = useCallback((index: number) => {
    if (absorbingRef.current !== index) return;
    absorbingRef.current = null;
    setAbsorbingIndex(null);
    setNearCore(false);
    setCorePulse(1);
    playerRef.current.select(index);
    window.setTimeout(() => setCorePulse(0), 900);
  }, []);

  const release = useCallback(() => {
    const held = heldRef.current;
    heldRef.current = null;
    setHeldIndex(null);
    if (held === null || absorbingRef.current !== null) return;
    const dx = holdPointRef.current.x - window.innerWidth * 0.5;
    const dy = holdPointRef.current.y - window.innerHeight * 0.5;
    const radius =
      Math.min(window.innerWidth, window.innerHeight) * GESTURE_CONFIG.absorbRadius;
    if (Math.hypot(dx, dy) <= radius * 1.2) beginAbsorb(held);
  }, [beginAbsorb]);

  const isHolding = useCallback(() => heldRef.current !== null, []);

  const value = useMemo<OrbitContextValue>(
    () => ({
      heldIndex,
      absorbingIndex,
      nearCore,
      corePulse,
      grab,
      moveHold,
      release,
      isHolding,
      setNearCore,
      beginAbsorb,
      finishAbsorb,
      holdPoint,
    }),
    [
      absorbingIndex,
      beginAbsorb,
      corePulse,
      finishAbsorb,
      grab,
      heldIndex,
      holdPoint,
      isHolding,
      moveHold,
      nearCore,
      release,
    ],
  );

  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    registerGrab({
      grab: (index) => valueRef.current.grab(index),
      move: (clientX, clientY) => valueRef.current.moveHold(clientX, clientY),
      release: () => valueRef.current.release(),
      isHolding: () => valueRef.current.isHolding(),
    });
    return () => registerGrab(null);
  }, [registerGrab]);

  return <OrbitContext.Provider value={value}>{children}</OrbitContext.Provider>;
}

export function useOrbit(): OrbitContextValue {
  const ctx = useContext(OrbitContext);
  if (!ctx) throw new Error("useOrbit must be used within OrbitProvider");
  return ctx;
}
