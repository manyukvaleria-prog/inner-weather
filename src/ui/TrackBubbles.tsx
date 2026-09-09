import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GESTURE_CONFIG } from "../config/gestureConfig";
import { lerp } from "../lib/math";
import { useOrbit } from "../orbit/OrbitProvider";
import { usePlayer } from "../player/PlayerProvider";
import type { Track } from "../types";

type Point = { x: number; y: number; scale: number; opacity: number; flying: boolean };

export function TrackBubbles() {
  const { tracks, index, isPlaying } = usePlayer();
  const {
    heldIndex,
    absorbingIndex,
    holdPoint,
    grab,
    moveHold,
    release,
    beginAbsorb,
    finishAbsorb,
    setNearCore,
    nearCore,
  } = useOrbit();

  const bubbleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const flyRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<Point[]>([]);
  const heldRef = useRef(heldIndex);
  const absorbingRef = useRef(absorbingIndex);
  const holdPointRef = useRef(holdPoint);
  const nearRef = useRef(nearCore);
  const clickStart = useRef({ x: 0, y: 0 });
  const localHold = useRef<number | null>(null);
  heldRef.current = heldIndex;
  absorbingRef.current = absorbingIndex;
  holdPointRef.current = holdPoint;
  nearRef.current = nearCore;

  if (posRef.current.length !== tracks.length) {
    posRef.current = tracks.map(() => ({
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      flying: false,
    }));
  }

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (localHold.current === null) return;
      moveHold(event.clientX, event.clientY);
    };
    const onEnd = (event: PointerEvent) => {
      if (localHold.current === null) return;
      const i = localHold.current;
      localHold.current = null;
      const moved = Math.hypot(
        event.clientX - clickStart.current.x,
        event.clientY - clickStart.current.y,
      );
      if (moved < 24) beginAbsorb(i);
      else release();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [beginAbsorb, moveHold, release]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const cx = window.innerWidth * 0.5;
      const cy = window.innerHeight * 0.5;
      const radius =
        Math.min(window.innerWidth, window.innerHeight) * GESTURE_CONFIG.absorbRadius;
      const held = heldRef.current;
      const absorbing = absorbingRef.current;
      const flyIndex = absorbing ?? held;
      let anyNear = false;

      tracks.forEach((_, i) => {
        const pos = posRef.current[i];
        if (i !== flyIndex) {
          pos.flying = false;
          pos.scale = 1;
          pos.opacity = 1;
        }
      });

      if (flyIndex === null) {
        if (anyNear !== nearRef.current) setNearCore(anyNear);
        return;
      }

      const pos = posRef.current[flyIndex];
      const origin = bubbleRefs.current[flyIndex];
      if (!pos.flying) {
        if (origin) {
          const rect = origin.getBoundingClientRect();
          pos.x = rect.left + rect.width / 2;
          pos.y = rect.top + rect.height / 2;
        } else {
          pos.x = holdPointRef.current.x;
          pos.y = holdPointRef.current.y;
        }
        pos.scale = 1;
        pos.opacity = 1;
        pos.flying = true;
      }

      let targetX = pos.x;
      let targetY = pos.y;
      let targetScale = 1.12;
      let targetOpacity = 1;
      let flow = 0.78;

      if (held === flyIndex) {
        targetX = holdPointRef.current.x;
        targetY = holdPointRef.current.y;
        const dist = Math.hypot(pos.x - cx, pos.y - cy);
        anyNear = dist < radius * 1.45;
      } else {
        targetX = cx;
        targetY = cy;
        targetScale = 0.16;
        targetOpacity = 0.08;
        flow = 0.24;
        const dist = Math.hypot(pos.x - cx, pos.y - cy);
        if (dist < 36 || pos.scale < 0.26) {
          finishAbsorb(flyIndex);
          pos.flying = false;
          return;
        }
      }

      pos.x = lerp(pos.x, targetX, flow);
      pos.y = lerp(pos.y, targetY, flow);
      pos.scale = lerp(pos.scale, targetScale, 0.22);
      pos.opacity = lerp(pos.opacity, targetOpacity, 0.16);

      const fly = flyRef.current;
      if (fly) {
        fly.style.opacity = String(pos.opacity);
        fly.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) scale(${pos.scale})`;
      }

      if (anyNear !== nearRef.current) setNearCore(anyNear);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finishAbsorb, setNearCore, tracks]);

  const flyIndex = absorbingIndex ?? heldIndex;
  const flyingTrack = flyIndex !== null ? tracks[flyIndex] : null;
  const played = tracks.slice(0, index).map((track, i) => ({ track, i }));
  const upcoming = tracks.slice(index + 1).map((track, offset) => ({
    track,
    i: index + 1 + offset,
  }));

  const renderSlot = (track: Track, i: number) => {
    const flying = i === heldIndex || i === absorbingIndex;
    return (
      <div key={track.id} className={`track-orbit__slot ${flying ? "is-held" : ""}`}>
        <span className="track-orbit__ghost" aria-hidden="true">
          <span className="track-orbit__ghost-disc" />
          <span className="track-orbit__ghost-meta">
            <strong>{track.title}</strong>
            <em>{track.artist}</em>
          </span>
        </span>
        <button
          type="button"
          className={`track-bubble ${i === index ? "is-active" : ""} ${
            flying ? "is-away" : ""
          }`}
          data-track-index={i}
          data-clickable="true"
          ref={(node) => {
            bubbleRefs.current[i] = node;
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            clickStart.current = { x: event.clientX, y: event.clientY };
            localHold.current = i;
            const rect = event.currentTarget.getBoundingClientRect();
            const pos = posRef.current[i];
            pos.x = rect.left + rect.width / 2;
            pos.y = rect.top + rect.height / 2;
            pos.scale = 1;
            pos.opacity = 1;
            pos.flying = true;
            grab(i);
            moveHold(event.clientX, event.clientY);
          }}
          onDragStart={(event) => event.preventDefault()}
        >
          <span className="track-bubble__disc">
            <img src={track.cover} alt="" draggable={false} />
            {i === index && isPlaying ? <span className="track-bubble__live" /> : null}
          </span>
          <span className="track-bubble__meta">
            <strong>{track.title}</strong>
            <em>{track.artist}</em>
          </span>
        </button>
      </div>
    );
  };

  return (
    <aside className={`track-orbit ${nearCore ? "is-near" : ""}`} data-ui="playlist">
      <div className="track-orbit__shell glass">
        <div className="track-orbit__fade">
          <div className="track-orbit__row">
            <div className="track-orbit__rail track-orbit__rail--past">
              {played.map(({ track, i }) => renderSlot(track, i))}
            </div>
            <div className="track-orbit__now">
              {tracks[index] ? renderSlot(tracks[index], index) : null}
            </div>
            <div className="track-orbit__rail track-orbit__rail--next">
              {upcoming.map(({ track, i }) => renderSlot(track, i))}
            </div>
          </div>
        </div>
      </div>
      {flyingTrack && flyIndex !== null
        ? createPortal(
            <div
              ref={flyRef}
              className={`track-fly ${absorbingIndex === flyIndex ? "is-absorbing" : "is-held"}`}
              aria-hidden="true"
              style={{
                transform: `translate(${posRef.current[flyIndex].x}px, ${posRef.current[flyIndex].y}px) translate(-50%, -50%) scale(${posRef.current[flyIndex].scale})`,
                opacity: posRef.current[flyIndex].opacity,
              }}
            >
              <span className="track-bubble__disc">
                <img src={flyingTrack.cover} alt="" draggable={false} />
              </span>
              <span className="track-bubble__meta">
                <strong>{flyingTrack.title}</strong>
                <em>{flyingTrack.artist}</em>
              </span>
            </div>,
            document.body,
          )
        : null}
    </aside>
  );
}
