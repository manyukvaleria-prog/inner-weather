import { useEffect, useRef, type PointerEvent } from "react";
import { clamp } from "../lib/math";
import { usePlayer } from "../player/PlayerProvider";
import { IconMuted, IconSpeaker } from "./icons";

export function VolumeControl() {
  const { volume, setVolume, muted, toggleMute } = usePlayer();
  const shown = muted ? 0 : volume;
  const drag = useRef({ active: false, y: 0, start: volume });
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const setVolumeRef = useRef(setVolume);
  setVolumeRef.current = setVolume;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const step = (clamp(pixels, -100, 100) / 100) * 0.05;
      const next = clamp(volumeRef.current - step, 0, 1);
      volumeRef.current = next;
      setVolumeRef.current(next);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { active: true, y: event.clientY, start: volume };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const delta = (drag.current.y - event.clientY) / 140;
    const next = clamp(drag.current.start + delta, 0, 1);
    volumeRef.current = next;
    setVolume(next);
  };

  const onPointerUp = () => {
    drag.current.active = false;
  };

  return (
    <div
      className={`volume glass ${muted ? "is-muted" : ""}`}
      data-ui="volume"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="volume__ring" viewBox="0 0 96 96" aria-hidden="true">
        <circle className="volume__track" cx="48" cy="48" r={radius} />
        <circle
          className="volume__arc"
          cx="48"
          cy="48"
          r={radius}
          strokeDasharray={`${circumference * shown} ${circumference}`}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="volume__core">
        <button
          type="button"
          className="volume__mute"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <IconMuted /> : <IconSpeaker />}
        </button>
        <span className="volume__value">{Math.round(shown * 100)}</span>
      </div>
    </div>
  );
}
