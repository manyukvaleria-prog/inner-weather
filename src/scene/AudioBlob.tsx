import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { createNoise3D } from "simplex-noise";
import { Color, Mesh, MeshPhysicalMaterial, SphereGeometry, Vector3 } from "three";
import { useCoverPalette } from "../lib/useCoverPalette";
import { useOrbit } from "../orbit/OrbitProvider";
import { usePlayer } from "../player/PlayerProvider";

const noise3D = createNoise3D();
const _vertex = new Vector3();
const _body = new Color();
const _emissive = new Color();
const _sheen = new Color();
const _pearl = new Color("#050506");

export function AudioBlob() {
  const { isPlaying, bandsRef, track, tracks } = usePlayer();
  const { corePulse, nearCore, heldIndex, absorbingIndex } = useOrbit();
  const incoming =
    absorbingIndex !== null
      ? tracks[absorbingIndex]
      : heldIndex !== null && nearCore
        ? tracks[heldIndex]
        : track;
  const palette = useCoverPalette(incoming.cover);
  const meshRef = useRef<Mesh>(null);
  const playRef = useRef(isPlaying);
  playRef.current = isPlaying;
  const pulseRef = useRef(0);
  const nearRef = useRef(nearCore);
  pulseRef.current = corePulse;
  nearRef.current = nearCore;
  const activity = useRef(0);
  const swallow = useRef(0);
  const tint = useRef(0);
  const beatS = useRef(0);
  const bassS = useRef(0);
  const pumpS = useRef(0);
  const hitS = useRef(0);
  const kickPrev = useRef(0);
  const lastBeat = useRef(-1);
  const warp = useRef(0);
  const warpTo = useRef(0);
  const phase = useRef(0);
  const frame = useRef(0);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  const ease = (ref: { current: number }, target: number, rise: number, fall: number) => {
    ref.current += (target - ref.current) * (target > ref.current ? rise : fall);
    return ref.current;
  };

  const geometry = useMemo(() => {
    const geo = new SphereGeometry(1.24, 80, 60);
    const original = Float32Array.from(geo.attributes.position.array);
    geo.userData.original = original;
    geo.userData.current = original.slice(0);
    return geo;
  }, []);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const geo = mesh.geometry as SphereGeometry;
    const original = geo.userData.original as Float32Array;
    const current = geo.userData.current as Float32Array;
    const positions = geo.attributes.position;
    const time = clock.elapsedTime;
    const bands = bandsRef.current;
    const targetPlay = playRef.current ? 1 : 0;
    activity.current += (targetPlay - activity.current) * (playRef.current ? 0.1 : 0.045);
    const live = activity.current;
    const beat = ease(beatS, playRef.current ? bands.beat || 0 : 0, 0.38, 0.11);
    const bassBand = ease(bassS, bands.bass, 0.28, 0.1);
    const dt = Math.min(0.05, delta);
    const kick = playRef.current ? bands.beat || 0 : 0;
    const rising = kick - kickPrev.current;
    kickPrev.current = kick;
    if (!playRef.current) lastBeat.current = -1;
    if (live > 0.25 && rising > 0.048 && kick > 0.28 && time - lastBeat.current > 0.22) {
      lastBeat.current = time;
      warpTo.current += 0.82;
      hitS.current = 1;
    }
    hitS.current += (0 - hitS.current) * (1 - Math.exp(-dt * 8));
    warp.current += (warpTo.current - warp.current) * (1 - Math.exp(-dt * 2.4));
    const hit = hitS.current;
    const pump = ease(
      pumpS,
      live * Math.min(1, beat * 0.78 + bassBand * 0.4),
      0.4,
      0.1,
    );
    const idle = 0.038 + live * 0.02;
    const flow = 0.16 + live * 0.05 + hit * 0.06;
    const count = positions.count;
    phase.current += dt * (0.18 + live * 0.1 + pump * 0.06);
    const t = phase.current;
    const w = warp.current;
    const stretchY = 1 + pump * 0.1 - hit * 0.03;
    const stretchX = 1 - pump * 0.07 + hit * 0.03;
    const stretchZ = 1 + pump * 0.18 + hit * 0.1;
    const arr = positions.array as Float32Array;

    for (let i = 0; i < count; i += 1) {
      const ox = original[i * 3];
      const oy = original[i * 3 + 1];
      const oz = original[i * 3 + 2];
      const n1 = noise3D(ox * 0.5 + t + w, oy * 0.5, oz * 0.5 - t * 0.7);
      const n2 = noise3D(ox * 0.28 + w * 0.4, oy * 0.28 + t * 0.12, oz * 0.28);
      const nBeat = noise3D(ox * 0.4 + t * 0.22 + w, oy * 0.4, oz * 0.4);
      const deform = Math.min(
        1.55,
        Math.max(
          0.68,
          1 +
            idle * n1 +
            live * (0.16 * n1 + 0.1 * n2) +
            live * bassBand * (0.18 * n1 + 0.08 * n2) +
            pump * (0.07 + 0.11 * nBeat) +
            hit * (0.08 + 0.1 * n1),
        ),
      );
      _vertex.set(ox * stretchX, oy * stretchY, oz * stretchZ).multiplyScalar(deform);
      const i3 = i * 3;
      current[i3] += (_vertex.x - current[i3]) * flow;
      current[i3 + 1] += (_vertex.y - current[i3 + 1]) * flow;
      current[i3 + 2] += (_vertex.z - current[i3 + 2]) * flow;
      arr[i3] = current[i3];
      arr[i3 + 1] = current[i3 + 1];
      arr[i3 + 2] = current[i3 + 2];
    }
    positions.needsUpdate = true;
    frame.current += 1;
    if (frame.current % 3 === 0) geo.computeVertexNormals();

    mesh.rotation.y = time * (0.038 + live * 0.04);
    mesh.rotation.x = Math.sin(time * 0.14) * 0.08;
    mesh.rotation.z = Math.cos(time * 0.11) * 0.04;
    const swallowTarget = pulseRef.current * 1.15 + (nearRef.current ? 0.52 : 0);
    swallow.current += (swallowTarget - swallow.current) * 0.14;
    mesh.scale.setScalar(
      (1 + pump * 0.04) *
        (1 + Math.sin(time * 0.55) * 0.006 * (0.35 + live)) *
        (1 + swallow.current * 0.1),
    );

    const shine = playRef.current ? 1 : 0;
    tint.current += (shine - tint.current) * (shine ? 0.08 : 0.04);
    const p = paletteRef.current;
    _sheen.setRGB(
      0.46 + p.accent[0] * 0.06,
      0.36 + p.accent[1] * 0.04,
      0.42 + p.accent[2] * 0.05,
    );
    _emissive.setRGB(0.02, 0.018, 0.022);
    _body.copy(_pearl);

    const material = mesh.material as MeshPhysicalMaterial;
    material.color.copy(_body);
    material.emissive.copy(_emissive);
    material.sheenColor.copy(_sheen);
    material.emissiveIntensity = 0.025 + live * (0.02 + pump * 0.06);
    material.iridescence = 1;
    material.envMapIntensity = 1.85;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color="#050506"
        metalness={0.82}
        roughness={0.04}
        clearcoat={1}
        clearcoatRoughness={0.03}
        ior={1.72}
        iridescence={1}
        iridescenceIOR={1.31}
        iridescenceThicknessRange={[180, 920]}
        sheen={0.9}
        sheenRoughness={0.2}
        sheenColor="#7a5a68"
        emissive="#050506"
        emissiveIntensity={0.025}
        envMapIntensity={1.85}
      />
    </mesh>
  );
}
