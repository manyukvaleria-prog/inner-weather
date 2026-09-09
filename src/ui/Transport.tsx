import { IconNext, IconPause, IconPlay, IconPrev } from "./icons";
import { usePlayer } from "../player/PlayerProvider";

export function Transport() {
  const { isPlaying, toggle, next, previous } = usePlayer();

  return (
    <div className="transport">
      <button type="button" className="icon-button" onClick={previous} aria-label="Previous">
        <IconPrev />
      </button>
      <button
        type="button"
        className="icon-button icon-button--main"
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <IconPause /> : <IconPlay />}
      </button>
      <button type="button" className="icon-button" onClick={next} aria-label="Next">
        <IconNext />
      </button>
    </div>
  );
}
