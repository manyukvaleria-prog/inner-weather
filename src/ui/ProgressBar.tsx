import { useRef, type PointerEvent } from "react";
import { formatTime } from "../lib/math";
import { usePlayer } from "../player/PlayerProvider";

export function ProgressBar() {
  const { progress, currentTime, duration, seek, track } = usePlayer();
  const barRef = useRef<HTMLDivElement>(null);

  const ratioFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  };

  return (
    <div className="progress-block">
      <div className="progress-block__times">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration || track.duration)}</span>
      </div>
      <div
        ref={barRef}
        className="progress-bar"
        data-ui="progress"
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || track.duration)}
        aria-valuenow={Math.round(currentTime)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          seek(ratioFromEvent(event));
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            seek(ratioFromEvent(event));
          }
        }}
      >
        <div className="progress-bar__fill" style={{ width: `${progress * 100}%` }} />
        <div className="progress-bar__thumb" style={{ left: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
