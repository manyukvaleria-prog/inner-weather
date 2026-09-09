import { useEffect, useRef } from "react";
import { GESTURE_CONFIG } from "../config/gestureConfig";
import { useInteraction } from "../interaction/InteractionProvider";

type TrailPoint = { x: number; y: number; life: number };

export function GestureCursor() {
  const { pointer, pointerLive } = useInteraction();
  const trailRef = useRef<TrailPoint[]>([]);
  const dotsRef = useRef<HTMLSpanElement[]>([]);
  const coreRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const current = pointerLive.current;
      if (!current?.handVisible) {
        trailRef.current = [];
        return;
      }
      const x = current.clientX;
      const y = current.clientY;
      const move = `translate(${x}px, ${y}px)`;
      if (coreRef.current) coreRef.current.style.transform = move;
      if (haloRef.current) haloRef.current.style.transform = move;
      if (ringRef.current) ringRef.current.style.transform = move;

      const trail = trailRef.current;
      trail.unshift({ x: current.x, y: current.y, life: 1 });
      if (trail.length > GESTURE_CONFIG.trailLength) trail.pop();
      trail.forEach((point, i) => {
        point.life = 1 - i / GESTURE_CONFIG.trailLength;
        const el = dotsRef.current[i];
        if (!el) return;
        el.style.opacity = String(point.life * 0.45);
        el.style.transform = `translate(${point.x * window.innerWidth}px, ${
          point.y * window.innerHeight
        }px) scale(${0.35 + point.life * 0.7})`;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pointerLive]);

  if (!pointer.handVisible) return null;

  return (
    <div
      className={`gesture-cursor ${pointer.pose === "openPalm" ? "is-open" : ""} ${
        pointer.pose === "thumbsUp" ? "is-thumb" : ""
      } ${pointer.pose === "twoFingers" ? "is-two" : ""} ${
        pointer.pose === "pinch" ? "is-pinch" : ""
      }`}
    >
      <div ref={coreRef} className="gesture-cursor__core" />
      <div ref={haloRef} className="gesture-cursor__halo" />
      <div ref={ringRef} className="gesture-cursor__ring" />
      {Array.from({ length: GESTURE_CONFIG.trailLength }, (_, i) => (
        <span
          key={i}
          className="gesture-cursor__trail"
          ref={(node) => {
            if (node) dotsRef.current[i] = node;
          }}
        />
      ))}
    </div>
  );
}
