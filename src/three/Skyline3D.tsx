import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// A skyline of towers drawn to scale (heights in metres). Each scene focuses
// one tower: the camera glides from the previous focus to this one and the
// focused tower turns yellow. Used for countdown rankings.
export type SkylineItem = { h: number; shape?: "taper" | "twist" | "block" | "spire" };

export type Skyline3DProps = {
  items: SkylineItem[];
  focus: number;
  prevFocus?: number;
};

const GAP = 190;

const camFor = (items: SkylineItem[], i: number) => {
  const h = items[i].h;
  const x = i * GAP;
  const d = h * 1.6;
  return { pos: [x + d * 0.3, h * 0.28, d] as const, target: [x, h * 0.62, 0] as const };
};

const Rig: React.FC<{ pos: readonly number[]; target: readonly number[] }> = ({ pos, target }) => {
  const { camera } = useThree();
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(target[0], target[1], target[2]);
  camera.updateProjectionMatrix();
  return null;
};

const Tower: React.FC<{ item: SkylineItem; x: number; hot: boolean }> = ({ item, x, hot }) => {
  const h = item.h;
  const w = Math.max(h * 0.085, 30);
  const color = hot ? "#ffd60a" : "#8ea3b8";
  const mat = (
    <meshStandardMaterial
      color={color}
      metalness={hot ? 0.2 : 0.6}
      roughness={0.25}
      emissive={hot ? "#7a5c00" : "#0b1a2a"}
      emissiveIntensity={hot ? 0.35 : 0.2}
    />
  );
  const shape = item.shape ?? "taper";
  const body = h * (shape === "spire" ? 0.78 : 0.9);
  return (
    <group position={[x, 0, 0]}>
      {shape === "block" ? (
        <mesh castShadow position={[0, body / 2, 0]}>
          <boxGeometry args={[w * 1.3, body, w * 1.3]} />
          {mat}
        </mesh>
      ) : (
        <mesh castShadow position={[0, body / 2, 0]} rotation={[0, shape === "twist" ? 0.4 : 0.785, 0]}>
          <cylinderGeometry args={[w * (shape === "twist" ? 0.55 : 0.35), w * 0.8, body, shape === "twist" ? 24 : 4, 1]} />
          {mat}
        </mesh>
      )}
      {/* spire / crown */}
      <mesh castShadow position={[0, body + (h - body) / 2, 0]}>
        <coneGeometry args={[w * 0.12, h - body, 8]} />
        {mat}
      </mesh>
    </group>
  );
};

export const Skyline3D: React.FC<Skyline3DProps> = ({ items, focus, prevFocus }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const from = camFor(items, prevFocus ?? focus);
  const to = camFor(items, focus);
  const t = interpolate(frame, [0, fps * 1.3], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const drift = frame * 0.25;
  const mix = (a: readonly number[], b: readonly number[]) => a.map((v, k) => v + (b[k] - v) * t);
  const pos = mix(from.pos, to.pos);
  pos[0] += drift;
  const target = mix(from.target, to.target);
  const maxH = Math.max(...items.map((i) => i.h));
  return (
    <ThreeCanvas width={width} height={height} shadows camera={{ fov: 50, near: 1, far: 20000 }}>
      <Rig pos={pos} target={target} />
      <color attach="background" args={["#f2a65a"]} />
      <fog attach="fog" args={["#e9b27a", maxH * 1.5, maxH * 6]} />
      <hemisphereLight args={["#ffe2bd", "#3b2c40", 0.9]} />
      <directionalLight position={[-800, 900, 600]} intensity={2.4} color="#fff1d6" castShadow />
      <ambientLight intensity={0.35} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GAP * 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20000, 20000]} />
        <meshStandardMaterial color="#5b4a52" roughness={1} />
      </mesh>
      {/* low city blocks for context */}
      {Array.from({ length: 60 }).map((_, k) => {
        const r = (n: number) => Math.abs(Math.sin(k * 12.9 + n * 7.7));
        const bh = 20 + r(1) * 90;
        return (
          <mesh key={k} position={[-300 + r(2) * (GAP * 6), bh / 2, -150 - r(3) * 500]}>
            <boxGeometry args={[25 + r(4) * 30, bh, 25 + r(5) * 30]} />
            <meshStandardMaterial color="#6d5e68" roughness={0.9} />
          </mesh>
        );
      })}
      {items.map((it, i) => (
        <Tower key={i} item={it} x={i * GAP} hot={i === focus} />
      ))}
    </ThreeCanvas>
  );
};
