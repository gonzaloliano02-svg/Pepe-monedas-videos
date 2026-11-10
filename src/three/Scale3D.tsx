import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import * as THREE from "three";
import { Subject, SubjectKind } from "./subjects";

export type Scale3DProps = {
  subject: SubjectKind;
  // real-world size of the subject in metres (its longest dimension)
  size: number;
  color?: string;
  // environment: "ocean" (blue fog, light shafts) | "land" | "space"
  env?: "ocean" | "land" | "space";
};

const ENV = {
  ocean: { fog: "#05324a", ground: "#0a4a63", light: "#bfe8ff" },
  land: { fog: "#a9c6d9", ground: "#6f8f5a", light: "#fff4e0" },
  space: { fog: "#000006", ground: "#111122", light: "#ffffff" },
};

// A low-poly person 1.75 m tall, used as the scale reference.
const Person: React.FC = () => (
  <group>
    <mesh position={[0, 1.6, 0]} castShadow>
      <sphereGeometry args={[0.13, 20, 20]} />
      <meshStandardMaterial color="#ffd60a" roughness={0.5} />
    </mesh>
    <mesh position={[0, 1.13, 0]} castShadow>
      <capsuleGeometry args={[0.2, 0.5, 8, 16]} />
      <meshStandardMaterial color="#ffd60a" roughness={0.5} />
    </mesh>
    {[-0.1, 0.1].map((x) => (
      <mesh key={x} position={[x, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.6, 6, 12]} />
        <meshStandardMaterial color="#ffd60a" roughness={0.5} />
      </mesh>
    ))}
  </group>
);

const Particles: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const pts = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(900);
    for (let i = 0; i < 900; i++) {
      // deterministic pseudo-random
      arr[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    }
    for (let i = 0; i < 300; i++) {
      arr[i * 3] *= 60;
      arr[i * 3 + 1] = Math.abs(arr[i * 3 + 1]) * 30;
      arr[i * 3 + 2] *= 60;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  return (
    <points geometry={pts} position={[0, (frame * 0.01) % 3, 0]}>
      <pointsMaterial color={color} size={0.08} transparent opacity={0.6} />
    </points>
  );
};

export const Scale3D: React.FC<Scale3DProps> = ({
  subject,
  size,
  color,
  env = "ocean",
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const e = ENV[env];
  // Camera starts close to the person, then pulls back to reveal the subject.
  const t = interpolate(frame, [8, durationInFrames * 0.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  // Long subjects (whales, buses) lie side-on with the nose beside the
  // person; tall/round subjects stand behind-right. The camera pulls back
  // until the whole subject fits the vertical frame.
  const long = subject === "whale" || subject === "sperm-whale" || subject === "bus" || subject === "elephant";
  const yaw = 0;
  const isEle = subject === "elephant";
  const subjectPos: [number, number, number] = isEle
    ? [size * 0.92 + 1.0, 0, -1.2]
    : long
    ? [size / 2 + 1.2, 0, -1.5]
    : [size * 0.3 + 2, 0, -size * 0.3];
  const midX = isEle
    ? (subjectPos[0] + size * 0.65) / 2
    : long
    ? (size + 1.2) / 2
    : subjectPos[0] * 0.6;
  const midZ = subjectPos[2];
  const near = 4.2;
  const far = isEle ? size * 4.4 : Math.max(size * (long ? 2.55 : 1.6), 9);
  const dist = near + (far - near) * t;
  const orbit = 0.3 - t * 0.3 + frame * 0.0006;
  const target: [number, number, number] = [midX * t, 1.1 + size * 0.12 * t, midZ * t];
  const camPos: [number, number, number] = [
    target[0] + Math.sin(orbit) * dist,
    1.5 + size * 0.28 * t,
    target[2] + Math.cos(orbit) * dist,
  ];
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      camera={{ fov: 50, position: camPos, near: 0.1, far: 2000 }}
    >
      <CameraRig pos={camPos} target={target} />
      <color attach="background" args={[e.fog]} />
      <fog attach="fog" args={[e.fog, far * 0.6, far * 3]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={[e.light, e.ground, 0.8]} />
      <directionalLight
        position={[size, size * 2 + 10, size]}
        intensity={2.2}
        color={e.light}
        castShadow
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color={e.ground} roughness={1} />
      </mesh>
      <Person />
      {/* "you are here" marker, grows as the camera pulls back */}
      <mesh position={[0, 2.2 + t * size * 0.08, 0]} rotation={[Math.PI, 0, 0]} scale={1 + t * size * 0.045}>
        <coneGeometry args={[0.18, 0.4, 4]} />
        <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.8} />
      </mesh>
      <group position={subjectPos} rotation={[0, yaw, 0]}>
        <Subject kind={subject} size={size} color={color} frame={frame} />
      </group>
      <Particles color={e.light} />
    </ThreeCanvas>
  );
};

import { useThree } from "@react-three/fiber";
const CameraRig: React.FC<{
  pos: [number, number, number];
  target: [number, number, number];
}> = ({ pos, target }) => {
  const { camera } = useThree();
  camera.position.set(...pos);
  camera.lookAt(...target);
  camera.updateProjectionMatrix();
  return null;
};
