import { Lightformer } from "@react-three/drei";
import { BackSide } from "three";

const RINGS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const RIBS = [-5.2, -2.6, 0, 2.6, 5.2];

export function UndergroundEnv() {
  return (
    <>
      <color attach="background" args={["#12081c"]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 0.4, 6]} color="#7af6ff" intensity={40} distance={30} />
      <pointLight position={[4, -1, -8]} color="#ff4ec4" intensity={32} distance={28} />
      <pointLight position={[-5, 2.2, 0]} color="#9b7cff" intensity={22} distance={24} />

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[6.6, 6.6, 40, 64, 1, true]} />
        <meshStandardMaterial
          color="#3a3348"
          side={BackSide}
          roughness={0.38}
          metalness={0.72}
        />
      </mesh>

      <mesh position={[0, -2.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 40]} />
        <meshStandardMaterial color="#16141e" metalness={0.88} roughness={0.22} />
      </mesh>

      {RINGS.map((i) => (
        <mesh key={i} position={[0, 0, -16 + i * 2.7]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[6.25, 0.07, 12, 80]} />
          <meshBasicMaterial color={i % 2 ? "#5cf7ff" : "#ff4ec4"} />
        </mesh>
      ))}

      {RIBS.map((x) => (
        <mesh key={x} position={[x, -0.15, -3]}>
          <boxGeometry args={[0.18, 5.2, 0.18]} />
          <meshStandardMaterial
            color="#2a2436"
            metalness={0.8}
            roughness={0.28}
            emissive={x < 0 ? "#ff2fa0" : "#2ee9ff"}
            emissiveIntensity={0.55}
          />
        </mesh>
      ))}

      <mesh position={[0, 0, -18]}>
        <circleGeometry args={[6.5, 64]} />
        <meshBasicMaterial color="#0b0614" />
      </mesh>
      <mesh position={[0, 0, -17.7]}>
        <ringGeometry args={[1.05, 2.35, 64]} />
        <meshBasicMaterial color="#67f4ff" />
      </mesh>
      <mesh position={[0, 2.85, -6]}>
        <boxGeometry args={[10, 0.12, 24]} />
        <meshBasicMaterial color="#7af6ff" />
      </mesh>
      <mesh position={[0, -2.28, -4]}>
        <boxGeometry args={[6.4, 0.08, 26]} />
        <meshBasicMaterial color="#ff4ec4" />
      </mesh>

      <Lightformer
        intensity={9}
        color="#67f4ff"
        form="rect"
        rotation-x={Math.PI / 2}
        position={[0, 5.4, 0]}
        scale={[14, 1.6, 1]}
      />
      <Lightformer
        intensity={7}
        color="#ff4ec4"
        form="rect"
        rotation-y={Math.PI / 2}
        position={[-6.4, 0, -2]}
        scale={[12, 1.2, 1]}
      />
      <Lightformer
        intensity={5.5}
        color="#b08cff"
        form="rect"
        rotation-y={-Math.PI / 2}
        position={[6.4, 1, -2]}
        scale={[10, 1.5, 1]}
      />
      <Lightformer intensity={4} color="#e8deff" position={[0, 0.5, 8]} scale={[5, 8, 1]} />
      <Lightformer
        intensity={6}
        color="#67f4ff"
        form="rect"
        rotation-x={-Math.PI / 2}
        position={[0, -5.2, 0]}
        scale={[14, 1.4, 1]}
      />
      <Lightformer intensity={3.2} color="#ff4ec4" position={[0, 4, -10]} scale={[8, 3, 1]} />
    </>
  );
}
