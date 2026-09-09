import { useEffect, type CSSProperties } from "react";
import { COLLECTION } from "./data/tracks";
import { GestureControl } from "./gestures/GestureControl";
import { GestureCursor } from "./gestures/GestureCursor";
import { InteractionProvider, useInteraction } from "./interaction/InteractionProvider";
import { OrbitProvider, useOrbit } from "./orbit/OrbitProvider";
import { PlayerProvider, usePlayer } from "./player/PlayerProvider";
import { Scene } from "./scene/Scene";
import { AmbientBackground } from "./ui/AmbientBackground";
import { PlayerHud } from "./ui/PlayerHud";
import { TrackBubbles } from "./ui/TrackBubbles";
import { VolumeControl } from "./ui/VolumeControl";
import { sampleCover, paletteGlows } from "./lib/coverPalette";
import { useCoverPalette } from "./lib/useCoverPalette";

function CoreMouth() {
  const { nearCore, absorbingIndex } = useOrbit();
  const absorbing = absorbingIndex !== null;
  return (
    <div
      className={`core-mouth ${nearCore || absorbing ? "is-open" : ""} ${
        absorbing ? "is-wave" : ""
      }`}
      aria-hidden="true"
    >
      <span className="core-mouth__wave" />
      <span className="core-mouth__wave" />
      <span className="core-mouth__wave" />
    </div>
  );
}

function Shell() {
  const { pointer } = useInteraction();
  const { track, tracks } = usePlayer();
  const { heldIndex, absorbingIndex, nearCore } = useOrbit();
  const incoming =
    absorbingIndex !== null
      ? tracks[absorbingIndex]
      : heldIndex !== null
        ? tracks[heldIndex]
        : track;
  const palette = useCoverPalette(incoming.cover);
  const { glow, glowSoft, glowCool } = paletteGlows(palette);

  useEffect(() => {
    tracks.forEach((item) => {
      void sampleCover(item.cover);
    });
  }, [tracks]);

  return (
    <div
      className={`app ${pointer.handVisible ? "is-hand" : ""} ${
        heldIndex !== null ? "is-carrying" : ""
      } ${nearCore || absorbingIndex !== null ? "is-receiving" : ""} ${
        absorbingIndex !== null ? "is-absorbing" : ""
      }`}
      style={
        {
          ["--cover-glow" as string]: glow,
          ["--cover-glow-2" as string]: glowSoft,
          ["--cover-glow-3" as string]: glowCool,
        } as CSSProperties
      }
    >
      <AmbientBackground />
      <Scene />
      <CoreMouth />
      <header className="top-bar">
        <div className="brand">
          <span>{COLLECTION.title}</span>
          <p className="brand__sub">{COLLECTION.subtitle}</p>
        </div>
      </header>
      <GestureControl />
      <VolumeControl />
      <PlayerHud />
      <TrackBubbles />
      <GestureCursor />
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <InteractionProvider>
        <OrbitProvider>
          <Shell />
        </OrbitProvider>
      </InteractionProvider>
    </PlayerProvider>
  );
}
