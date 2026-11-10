import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Subject } from "./subjects";

// Channel avatar: a tiny yellow person on a glowing ring, looking up at a
// giant sperm whale gliding overhead. Designed for a circular crop.
const Cam: React.FC = () => {
  const { camera } = useThree();
  camera.position.set(0, 0.6, 6.2);
  camera.lookAt(0, 2.9, 0);
  camera.updateProjectionMatrix();
  return null;
};

const Person: React.FC = () => (
  <group>
    <mesh position={[0, 1.6, 0]}>
      <sphereGeometry args={[0.13, 24, 24]} />
      <meshStandardMaterial color="#ffd60a" emissive="#ffb000" emissiveIntensity={0.35} roughness={0.4} />
    </mesh>
    <mesh position={[0, 1.13, 0]}>
      <capsuleGeometry args={[0.2, 0.5, 8, 16]} />
      <meshStandardMaterial color="#ffd60a" emissive="#ffb000" emissiveIntensity={0.35} roughness={0.4} />
    </mesh>
    {[-0.1, 0.1].map((x) => (
      <mesh key={x} position={[x, 0.42, 0]}>
        <capsuleGeometry args={[0.08, 0.6, 6, 12]} />
        <meshStandardMaterial color="#ffd60a" emissive="#ffb000" emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
    ))}
  </group>
);

export const Avatar: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(circle at 50% 28%, #1f7fb0 0%, #0b3d62 38%, #04182b 72%, #020a14 100%)",
    }}
  >
    {/* light shafts from the surface */}
    <AbsoluteFill
      style={{
        background:
          "repeating-linear-gradient(100deg, rgba(190,235,255,0.07) 0 40px, transparent 40px 120px)",
        maskImage: "linear-gradient(#000, transparent 70%)",
        WebkitMaskImage: "linear-gradient(#000, transparent 70%)",
      }}
    />
    <ThreeCanvas width={1080} height={1080} gl={{ alpha: true }} style={{ position: "absolute", inset: 0 }}>
      <Cam />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#bfe8ff", "#05324a", 0.9]} />
      <directionalLight position={[2, 12, 6]} intensity={2.6} color="#dff4ff" />
      <pointLight position={[0, 0.4, 1.0]} intensity={10} distance={5} color="#ffd60a" />
      {/* whale overhead, nose toward upper-left, seen slightly from below */}
      <group position={[0.1, 6.2, -7]} rotation={[0.25, -0.55, 0.38]}>
        <group position={[0, -14 * 0.1 * 1.3, 0]}>
          <Subject kind="sperm-whale" size={14} color="#3c4a5a" frame={8} />
        </group>
      </group>
      {/* glowing ring + person */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.45, 0.62, 64]} />
        <meshBasicMaterial color="#ffd60a" />
      </mesh>
      <group scale={1.25} position={[0, 0, 0.3]}>
        <Person />
      </group>
      {/* bubbles */}
      {Array.from({ length: 26 }).map((_, i) => {
        const r = (k: number) => Math.abs(Math.sin(i * 91.7 + k * 13.3));
        return (
          <mesh key={i} position={[(r(1) - 0.5) * 7, r(2) * 6, -1 - r(3) * 4]}>
            <sphereGeometry args={[0.02 + r(4) * 0.05, 10, 10]} />
            <meshStandardMaterial color="#cfefff" transparent opacity={0.5} emissive="#9fdcff" emissiveIntensity={0.3} />
          </mesh>
        );
      })}
    </ThreeCanvas>
    {/* soft vignette so the circle crop feels finished */}
    <AbsoluteFill
      style={{ background: "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 72%)" }}
    />
  </AbsoluteFill>
);
