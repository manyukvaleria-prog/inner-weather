import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { AdditiveBlending, BackSide, Color, Group, Mesh, PointLight } from "three";
import { AudioBlob } from "./AudioBlob";
import { FitWindowBlob } from "./FitWindowBlob";
import { useCoverPalette } from "../lib/useCoverPalette";
import { useOrbit } from "../orbit/OrbitProvider";
import { usePlayer } from "../player/PlayerProvider";

function HaloDome() {
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[10, 32, 32]} />
      <meshBasicMaterial color="#000000" side={BackSide} />
    </mesh>
  );
}

function Atmosphere() {
  const { isPlaying, bandsRef, track, tracks } = usePlayer();
  const { heldIndex, absorbingIndex, nearCore } = useOrbit();
  const incoming =
    absorbingIndex !== null
      ? tracks[absorbingIndex]
      : heldIndex !== null && nearCore
        ? tracks[heldIndex]
        : track;
  const palette = useCoverPalette(incoming.cover);
  const group = useRef<Group>(null);
  const playRef = useRef(isPlaying);
  playRef.current = isPlaying;
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  const nearRef = useRef(nearCore);
  nearRef.current = nearCore;
  const absorbingRef = useRef(absorbingIndex !== null);
  absorbingRef.current = absorbingIndex !== null;
  const _light = useRef(new Color("#f4eee6"));

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const energy = bandsRef.current.energy;
    const beat = bandsRef.current.beat || 0;
    const receiving = nearRef.current || absorbingRef.current;
    const pulse =
      0.55 +
      energy * (playRef.current ? 1.1 : 0.35) +
      beat * (playRef.current ? 0.55 : 0) +
      (receiving ? 0.35 : 0);
    const p = paletteRef.current;
    const mix = playRef.current ? 0.02 : 0.012;
    group.current.children.forEach((child, i) => {
      child.rotation.y = t * (0.15 + i * 0.05);
      child.position.y = Math.sin(t * 0.4 + i) * 0.12;
      if (child instanceof PointLight) {
        const live = playRef.current;
        child.intensity = pulse * (live ? 0.7 + i * 0.18 : 0.42);
        const src = i === 1 ? p.accent : p.primary;
        _light.current.setRGB(src[0], src[1], src[2]);
        if (live) child.color.lerp(_light.current, mix);
      }
    });
  });

  return (
    <group ref={group}>
      <pointLight color="#e8e0d4" position={[2.4, 1.4, 2.2]} intensity={0.55} />
      <pointLight color="#c8c0d0" position={[-2.2, -0.6, 1.6]} intensity={0.32} />
      <pointLight color="#a8a0b0" position={[0.2, 2.2, -1.4]} intensity={0.28} />
      <pointLight color="#d0c8c0" position={[0, -1.8, 2.4]} intensity={0.22} />
    </group>
  );
}

function InnerCore() {
  const { bandsRef, isPlaying } = usePlayer();
  const { absorbingIndex } = useOrbit();
  const mesh = useRef<Mesh>(null);
  const playRef = useRef(isPlaying);
  playRef.current = isPlaying;
  const receiveRef = useRef(false);
  receiveRef.current = absorbingIndex !== null;

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const bass = bandsRef.current.bass;
    const beat = bandsRef.current.beat || 0;
    const active = playRef.current ? 1 : 0.45;
    const receive = receiveRef.current ? 0.22 : 0;
    const s =
      0.48 +
      beat * 0.08 * active +
      bass * 0.05 * active +
      receive +
      Math.sin(clock.elapsedTime * 1.6) * 0.02;
    mesh.current.scale.setScalar(s);
    mesh.current.rotation.y = clock.elapsedTime * 0.3;
    const material = mesh.current.material as { opacity: number };
    material.opacity = 0.07 + receive * 0.06;
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[0.58, 16]} />
      <meshBasicMaterial
        color="#f2ebe3"
        transparent
        opacity={0.07}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function Scene() {
  return (
    <div className="scene-root">
      <Canvas
        camera={{ position: [0, 0, 4.05], fov: 34 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        style={{ pointerEvents: "none" }}
      >
        <FitWindowBlob />
        <HaloDome />
        <ambientLight intensity={0.14} />
        <Atmosphere />
        <AudioBlob />
        <InnerCore />
        <Suspense fallback={null}>
          <Environment
            preset="night"
            background={false}
            environmentIntensity={1.25}
            environmentRotation={[0, 0.35, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
