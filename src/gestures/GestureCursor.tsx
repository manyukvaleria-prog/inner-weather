import { useEffect, useRef } from "react";
import { GESTURE_CONFIG } from "../config/gestureConfig";
import { useInteraction } from "../interaction/InteractionProvider";

type TrailPoint = { x: number; y: number; life: number };

export function GestureCursor() {
  const { pointer } = useInteraction();
  const pointerRef = useRef(pointer);
  pointerRef.current = pointer;
  const trailRef = useRef<TrailPoint[]>([]);
  const dotsRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const current = pointerRef.current;
      if (!current.handVisible) {
        trailRef.current = [];
        return;
      }
      const trail = trailRef.current;
      trail.unshift({ x: current.x, y: current.y, life: 1 });
      if (trail.length > GESTURE_CONFIG.trailLength) trail.pop();
      trail.forEach((point, i) => {
        point.life = 1 - i / GESTURE_CONFIG.trailLength;
        const el = dotsRef.current[i];
        if (!el) return;
        el.style.opacity = String(point.life * 0.55);
        el.style.transform = `translate(${point.x * window.innerWidth}px, ${
          point.y * window.innerHeight
        }px) scale(${0.35 + point.life * 0.7})`;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!pointer.handVisible) return null;

  return (
    <div
      className={`gesture-cursor ${pointer.pose === "openPalm" ? "is-open" : ""} ${
        pointer.pose === "thumbsUp" ? "is-thumb" : ""
      } ${pointer.pose === "twoFingers" ? "is-two" : ""} ${
        pointer.pose === "pinch" ? "is-pinch" : ""
      }`}
    >
      <div
        className="gesture-cursor__core"
        style={{
          transform: `translate(${pointer.clientX}px, ${pointer.clientY}px)`,
        }}
      />
      <div
        className="gesture-cursor__halo"
        style={{
          transform: `translate(${pointer.clientX}px, ${pointer.clientY}px)`,
        }}
      />
      <div
        className="gesture-cursor__ring"
        style={{
          transform: `translate(${pointer.clientX}px, ${pointer.clientY}px)`,
        }}
      />
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
