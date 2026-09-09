import { useEffect, useState } from "react";
import { formatTime } from "../lib/math";
import { COLLECTION } from "../data/tracks";
import { usePlayer } from "../player/PlayerProvider";
import { IconWave } from "./icons";

export function PlaylistPanel() {
  const { tracks, index, select, isPlaying } = usePlayer();
  const [durations, setDurations] = useState<number[]>(() =>
    tracks.map((track) => track.duration),
  );

  useEffect(() => {
    const loaders = tracks.map((track, i) => {
      const audio = new Audio();
      audio.preload = "metadata";
      const onMeta = () => {
        if (!Number.isFinite(audio.duration)) return;
        setDurations((prev) => {
          if (prev[i] === audio.duration) return prev;
          const next = [...prev];
          next[i] = audio.duration;
          return next;
        });
      };
      audio.addEventListener("loadedmetadata", onMeta);
      audio.src = track.url;
      return () => {
        audio.removeEventListener("loadedmetadata", onMeta);
        audio.src = "";
      };
    });
    return () => loaders.forEach((stop) => stop());
  }, [tracks]);

  return (
    <aside className="playlist is-open" data-ui="playlist">
      <div className="playlist__intro">
        <h2>{COLLECTION.title}</h2>
        <p>{COLLECTION.subtitle}</p>
      </div>
      <div className="playlist__scroller">
        {tracks.map((track, i) => (
          <button
            key={track.id}
            type="button"
            className={`playlist__item ${i === index ? "is-active" : ""}`}
            data-clickable="true"
            onClick={() => select(i)}
          >
            <span className="playlist__num">{String(i + 1).padStart(2, "0")}</span>
            <img src={track.cover} alt="" />
            <span className="playlist__meta">
              <strong>{track.title}</strong>
              <em>{track.artist}</em>
            </span>
            {i === index && isPlaying ? <IconWave /> : <span />}
            <span className="playlist__time">{formatTime(durations[i] || track.duration)}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
