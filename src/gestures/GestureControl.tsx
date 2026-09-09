import {
  GestureHeadTilt,
  GesturePinch,
  GestureThumb,
  GestureTwist,
  GestureTwoFingers,
} from "../ui/GestureIcons";
import { useHandTracking } from "./useHandTracking";

const GESTURES = [
  { id: "play", action: "play", Icon: GestureThumb },
  { id: "pause", action: "pause", Icon: GestureTwoFingers },
  { id: "skip", action: "tilt · skip", Icon: GestureHeadTilt },
  { id: "drag", action: "pinch · drag", Icon: GesturePinch },
  { id: "volume", action: "volume", Icon: GestureTwist },
] as const;

export function GestureControl() {
  const { status, error, enable, disable, videoRef } = useHandTracking();

  return (
    <div className="camera-dock">
      <ul className="gesture-legend glass">
        {GESTURES.map(({ id, action, Icon }) => (
          <li key={id} aria-label={action}>
            <Icon className="gesture-legend__icon" />
            <em>{action}</em>
          </li>
        ))}
      </ul>
      {status === "live" ? (
        <button
          type="button"
          className="glass-button glass camera-dock__action"
          onClick={disable}
        >
          Disable Camera
        </button>
      ) : (
        <button
          type="button"
          className="glass-button glass camera-dock__action"
          onClick={() => void enable()}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Opening camera…" : "Turn on gesture control"}
        </button>
      )}
      {error && (
        <p className="gesture-control__error">
          Camera unavailable. Mouse control stays active.
        </p>
      )}
      <video
        ref={videoRef}
        className={`camera-preview glass ${status === "live" ? "is-live" : ""}`}
        playsInline
        muted
        aria-hidden={status !== "live"}
      />
    </div>
  );
}
