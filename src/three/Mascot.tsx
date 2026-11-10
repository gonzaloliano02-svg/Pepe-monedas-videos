import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";

// Channel mascot: the little yellow "you" from the videos, amazed, holding a
// tape measure that shoots up out of frame (whatever it measures is huge).
const YELLOW = "#ffd60a";
const INK = "#0b0d12";

const Cam: React.FC = () => {
  const { camera } = useThree();
  camera.position.set(0.2, 1.6, 3.7);
  camera.lookAt(0.08, 1.5, 0);
  camera.updateProjectionMatrix();
  return null;
};

const Yellow: React.FC = () => (
  <meshPhysicalMaterial color={YELLOW} roughness={0.32} clearcoat={0.6} clearcoatRoughness={0.25} />
);

const Eye: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, 2.22, 0.66]} rotation={[-0.25, x * 0.6, 0]}>
    <mesh scale={[1, 1.15, 0.6]}>
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshStandardMaterial color="#ffffff" roughness={0.2} />
    </mesh>
    {/* pupil looking up */}
    <mesh position={[0, 0.07, 0.11]} scale={[1, 1.1, 0.5]}>
      <sphereGeometry args={[0.11, 24, 24]} />
      <meshStandardMaterial color={INK} roughness={0.1} />
    </mesh>
    <mesh position={[0.04, 0.12, 0.16]}>
      <sphereGeometry args={[0.03, 12, 12]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  </group>
);

const Tape: React.FC = () => {
  // tape blade from the case up and out of frame
  const len = 4.2;
  const ticks = Array.from({ length: 28 });
  return (
    <group position={[0.95, 1.05, 0.35]} rotation={[0, 0, -0.32]}>
      {/* case */}
      <mesh>
        <boxGeometry args={[0.46, 0.46, 0.22]} />
        <meshPhysicalMaterial color={INK} roughness={0.35} clearcoat={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.115]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      {/* blade */}
      <group position={[0, 0.23 + len / 2, 0]}>
        <mesh>
          <boxGeometry args={[0.16, len, 0.02]} />
          <meshStandardMaterial color={YELLOW} emissive="#6b5500" emissiveIntensity={0.25} />
        </mesh>
        {ticks.map((_, i) => (
          <mesh key={i} position={[-0.04 + (i % 4 === 0 ? 0.0 : -0.02), -len / 2 + 0.15 + i * 0.15, 0.012]}>
            <boxGeometry args={[i % 4 === 0 ? 0.09 : 0.05, 0.018, 0.005]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const Mascot: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(circle at 50% 38%, #2a3a8a 0%, #141c48 45%, #070a1c 100%)",
    }}
  >
    {/* comic speed burst behind the head */}
    <AbsoluteFill
      style={{
        background:
          "repeating-conic-gradient(from 0deg at 50% 36%, rgba(255,214,10,0.10) 0deg 6deg, transparent 6deg 18deg)",
        maskImage: "radial-gradient(circle at 50% 36%, #000 0%, transparent 62%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 36%, #000 0%, transparent 62%)",
      }}
    />
    <ThreeCanvas width={1080} height={1080} gl={{ alpha: true }} style={{ position: "absolute", inset: 0 }}>
      <Cam />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 6]} intensity={2.4} />
      {/* blue rim light from behind-left */}
      <directionalLight position={[-4, 3, -3]} intensity={2.2} color="#7fa8ff" />
      <pointLight position={[0, 1.8, 2.4]} intensity={3} distance={6} color="#fff3c4" />

      <group rotation={[0, -0.12, 0]}>
        {/* head (chibi: big) */}
        <mesh position={[0, 2.05, 0]}>
          <sphereGeometry args={[0.78, 48, 48]} />
          <Yellow />
        </mesh>
        <Eye x={-0.28} />
        <Eye x={0.28} />
        {/* amazed mouth */}
        <mesh position={[0, 1.7, 0.7]} rotation={[-0.2, 0, 0]} scale={[1, 1.35, 0.5]}>
          <sphereGeometry args={[0.1, 24, 24]} />
          <meshStandardMaterial color="#3a1a10" roughness={0.6} />
        </mesh>
        {/* eyebrows raised */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.29, 2.6, 0.6]} rotation={[-0.6, 0, Math.PI / 2 - s * 0.35]}>
            <capsuleGeometry args={[0.035, 0.2, 6, 12]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        ))}
        {/* body */}
        <mesh position={[0, 0.72, 0]}>
          <capsuleGeometry args={[0.5, 0.55, 12, 32]} />
          <Yellow />
        </mesh>
        {/* left arm up in surprise */}
        <mesh position={[-0.68, 1.12, 0.1]} rotation={[0, 0, 0.75]}>
          <capsuleGeometry args={[0.13, 0.5, 8, 16]} />
          <Yellow />
        </mesh>
        <mesh position={[-0.9, 1.42, 0.12]}>
          <sphereGeometry args={[0.15, 24, 24]} />
          <Yellow />
        </mesh>
        {/* right arm holding the tape */}
        <mesh position={[0.66, 0.82, 0.2]} rotation={[0, 0, -0.9]}>
          <capsuleGeometry args={[0.13, 0.42, 8, 16]} />
          <Yellow />
        </mesh>
        <Tape />
      </group>
    </ThreeCanvas>
    <AbsoluteFill
      style={{ background: "radial-gradient(circle at 50% 50%, transparent 58%, rgba(0,0,0,0.4) 74%)" }}
    />
  </AbsoluteFill>
);
