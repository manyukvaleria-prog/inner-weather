import { useOrbit } from "../orbit/OrbitProvider";
import { usePlayer } from "../player/PlayerProvider";
import { ProgressBar } from "./ProgressBar";
import { Transport } from "./Transport";

export function PlayerHud() {
  const { track, tracks, isPlaying } = usePlayer();
  const { heldIndex, absorbingIndex, nearCore } = useOrbit();
  const incoming =
    absorbingIndex !== null
      ? tracks[absorbingIndex]
      : heldIndex !== null && nearCore
        ? tracks[heldIndex]
        : track;

  return (
    <div
      className={`hud glass ${isPlaying ? "is-live" : ""} ${
        heldIndex !== null ? "is-carrying" : ""
      } ${nearCore ? "is-receiving" : ""} ${
        absorbingIndex !== null ? "is-absorbing" : ""
      }`}
    >
      <span className="hud__shine" aria-hidden="true" />
      <div className="hud__cover">
        <img src={incoming.cover} alt="" />
      </div>
      <h1 className="hud__title">{incoming.title}</h1>
      <p className="hud__artist">{incoming.artist}</p>
      <ProgressBar />
      <Transport />
    </div>
  );
}
