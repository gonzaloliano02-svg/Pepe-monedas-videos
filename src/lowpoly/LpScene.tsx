import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Badge, Cam, Gauge, Ground, Lights, Person, Stamp, Track, Train, Trees, blinkAt, flat } from "./LowPoly";
import { FONT_DISPLAY } from "../theme";

// Scene type "lp" (2026-11-23, owner: "me gusta… mucho mejor"): data-driven low-poly 3D.
// All times are in SECONDS from the scene start. Positions are [x, z] on the floor (y up),
// the camera looks at the stage around the origin. See PIPELINE.md "LOW-POLY 3D".

type V3 = [number, number, number];
export type LpCast = {
  who?: "pepe" | "novia" | "man" | "woman" | "kid" | "boss" | "granny";
  pos?: [number, number];
  to?: [number, number]; // walk here between move[0]..move[1]
  move?: [number, number];
  rot?: number; // facing, radians (0 = towards camera)
  talk?: boolean | [number, number][]; // true = while the narration speaks; or time ranges
  wave?: [number, number];
  look?: [number, number];
  brows?: number;
  scared?: number; // time when he jumps back scared
  jump?: number; // time of a jump
  lie?: "left" | "right"; // lying in bed (set "bed")
  scale?: number;
  color?: string; // shirt
};
export type LpObject = {
  kind: "train" | "car" | "box" | "coin" | "ball" | "rock" | "pizza" | "burger" | "cake" | "phone" | "money" | "bottle" | "tv" | "bag" | "tree" | "house" | "meteor" | "cube" | "moon" | "earth" | "bolt";
  vanish?: number;
  from: V3;
  to?: V3;
  move?: [number, number];
  scale?: number;
  grow?: [number, number, number]; // start scale factor, at, end
  spin?: number;
  color?: string;
  appear?: number;
};
export type LpOverlay =
  | { kind: "badge"; text: string; at: number; y?: number; color?: string }
  | { kind: "gauge"; from: number; to: number; at: number; end: number; unit: string; y?: number }
  | { kind: "stamp"; text: string; at: number }
  | { kind: "counter"; text: string; at?: number }
  | { kind: "choice"; a: string; b: string; at: number; pick?: "a" | "b"; pickAt?: number }
  | { kind: "label"; text: string; at: number; y?: number };
export type LpSpec = {
  set?: "tracks" | "bed" | "room" | "street" | "field" | "desert" | "kitchen" | "beach" | "space" | "office" | "night";
  cam?: { from?: V3; to?: V3; look?: V3; fov?: number; shake?: [number, number, number] };
  cast?: LpCast[];
  objects?: LpObject[];
  overlays?: LpOverlay[];
  moon?: boolean;
};

const LOOKS: Record<string, { skin: string; shirt: string; pants: string; glasses: boolean; hair: string | null }> = {
  pepe: { skin: "#e9b48f", shirt: "#2f7fd6", pants: "#2b2f3a", glasses: true, hair: null },
  novia: { skin: "#f0c09e", shirt: "#e05d7b", pants: "#33415c", glasses: false, hair: "#5a3420" },
  man: { skin: "#c98f68", shirt: "#3a9d5d", pants: "#3b3b46", glasses: false, hair: "#2b2018" },
  woman: { skin: "#d9a07c", shirt: "#f2a541", pants: "#2e3a59", glasses: false, hair: "#1d1410" },
  kid: { skin: "#f1c6a3", shirt: "#ff6b35", pants: "#1f6feb", glasses: false, hair: "#a0522d" },
  boss: { skin: "#e3a985", shirt: "#20242c", pants: "#20242c", glasses: false, hair: "#8a8a8a" },
  granny: { skin: "#efc3a4", shirt: "#8e6bb5", pants: "#5b4b6b", glasses: true, hair: "#e6e6e6" },
};

const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t * (3 - 2 * t) });
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------- sets ----------
const Box: React.FC<{ p: V3; s: V3; c: string; r?: number }> = ({ p, s, c, r = 0 }) => (
  <mesh position={p} rotation={[0, r, 0]}><boxGeometry args={s} /><meshStandardMaterial color={c} {...flat} /></mesh>
);

const Buildings: React.FC = () => (
  <>
    {Array.from({ length: 16 }).map((_, i) => {
      const r = (k: number) => Math.abs(Math.sin(i * 51.3 + k * 7.1));
      const side = i % 2 ? 1 : -1;
      const h = 4 + r(1) * 10;
      const cols = ["#e8d5b7", "#c9d6df", "#f2b5a7", "#b8c6a8", "#d8c3e0"];
      return <Box key={i} p={[side * (7 + r(2) * 3), h / 2, -4 - Math.floor(i / 2) * 7]} s={[5, h, 5]} c={cols[i % 5]} />;
    })}
  </>
);

const Set: React.FC<{ set: LpSpec["set"]; moon?: boolean }> = ({ set, moon = true }) => {
  switch (set) {
    case "tracks":
      return (<><Ground /><Trees /><Track /></>);
    case "street":
      return (
        <>
          <Ground color="#9aa0a6" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -40]}><planeGeometry args={[6, 200]} /><meshStandardMaterial color="#44474d" {...flat} /></mesh>
          {Array.from({ length: 20 }).map((_, i) => <Box key={i} p={[0, 0.02, 4 - i * 5]} s={[0.15, 0.01, 2]} c="#f5f5f5" />)}
          {[-1, 1].map((s) => <Box key={s} p={[s * 4, 0.1, -40]} s={[2, 0.2, 200]} c="#c7c2b8" />)}
          <Buildings />
        </>
      );
    case "desert":
      return (
        <>
          <Ground color="#e7c27d" />
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={i} position={[-40 + i * 14, 0, -60 - (i % 3) * 20]}><coneGeometry args={[10, 6 + (i % 3) * 3, 5]} /><meshStandardMaterial color="#d9a85b" {...flat} /></mesh>
          ))}
          {[-5, 6, -9].map((x, i) => (
            <group key={i} position={[x, 0, -8 - i * 6]}>
              <Box p={[0, 1.2, 0]} s={[0.5, 2.4, 0.5]} c="#4f8a3c" />
              <Box p={[0.5, 1.5, 0]} s={[0.6, 0.35, 0.35]} c="#4f8a3c" />
            </group>
          ))}
        </>
      );
    case "beach":
      return (
        <>
          <Ground color="#f1dca7" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -60]}><planeGeometry args={[400, 100]} /><meshStandardMaterial color="#3aa6c9" {...flat} /></mesh>
          {[-4, 5].map((x) => (
            <group key={x} position={[x, 0, -3]}>
              <Box p={[0, 2, 0]} s={[0.3, 4, 0.3]} c="#8b5a2b" />
              <mesh position={[0, 4.1, 0]}><coneGeometry args={[1.8, 0.8, 6]} /><meshStandardMaterial color="#3f8f3f" {...flat} /></mesh>
            </group>
          ))}
        </>
      );
    case "room":
    case "office":
    case "kitchen":
    case "bed": {
      const wall = set === "office" ? "#d7dde4" : set === "kitchen" ? "#f3e6c8" : "#e9d8c4";
      return (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} /><meshStandardMaterial color={set === "kitchen" ? "#cfc6b8" : "#a8784f"} {...flat} /></mesh>
          <Box p={[0, 4, -4]} s={[30, 8, 0.2]} c={wall} />
          <Box p={[-7, 4, 0]} s={[0.2, 8, 30]} c={wall} />
          <Box p={[7, 4, 0]} s={[0.2, 8, 30]} c={wall} />
          {set === "room" && (
            <group position={[0, 0, -2.8]}>
              <Box p={[0, 0.45, 0]} s={[3.6, 0.5, 1.1]} c="#5c7aa8" />
              <Box p={[0, 1.0, -0.45]} s={[3.6, 0.9, 0.25]} c="#5c7aa8" />
              <Box p={[2.2, 1.6, 0.2]} s={[0.6, 0.06, 0.6]} c="#333" />
            </group>
          )}
          {set === "room" && <Box p={[-3.4, 2.6, -3.85]} s={[1.6, 1.1, 0.05]} c="#86c5da" />}
          {set === "office" && (
            <>
              <Box p={[0, 0.75, -1.2]} s={[3, 0.1, 1.2]} c="#8a6a4a" />
              <Box p={[0.4, 1.15, -1.4]} s={[0.9, 0.6, 0.05]} c="#222" />
            </>
          )}
          {set === "kitchen" && (
            <>
              <Box p={[0, 0.5, -3.3]} s={[12, 1, 1.2]} c="#f7f7f7" />
              <Box p={[0, 1.02, -3.3]} s={[12, 0.06, 1.25]} c="#6b6b6b" />
              <Box p={[0, 0.5, -0.6]} s={[3.4, 1, 1.2]} c="#c98b54" />
            </>
          )}
          {set === "bed" && (
            <>
              <Box p={[0, 0.9, -1.8]} s={[4.6, 2.0, 0.3]} c="#7a4a2a" />
              <Box p={[0, 0.3, 0.6]} s={[4.4, 0.6, 4.6]} c="#e8e8f0" />
              {[-1, 1].map((s) => <Box key={s} p={[s * 0.62, 0.7, -1.1]} s={[1.15, 0.35, 0.9]} c="#cfd6e6" />)}
              <Box p={[0, 0.72, 1.0]} s={[4.5, 0.3, 3.4]} c="#c9d2ea" />
              {Array.from({ length: 6 }).map((_, i) => <Box key={i} p={[0, 0.88, -0.3 + i * 0.5]} s={[4.52, 0.01, 0.05]} c={i % 2 ? "#e07a5f" : "#5b7bd5"} />)}
            </>
          )}
        </>
      );
    }
    case "space":
      return (
        <>
          {Array.from({ length: 140 }).map((_, i) => {
            const r = (k: number) => Math.sin(i * 12.9898 + k * 78.233) * 0.5 + 0.5;
            return <mesh key={i} position={[(r(1) - 0.5) * 80, (r(2) - 0.3) * 50, -20 - r(3) * 40]}><sphereGeometry args={[0.06 + r(4) * 0.1, 4, 4]} /><meshBasicMaterial color="#fff" /></mesh>;
          })}
          <mesh position={[0, -40, -20]}><icosahedronGeometry args={[40, 2]} /><meshStandardMaterial color="#9a9a9a" {...flat} /></mesh>
        </>
      );
    case "night":
      return (<><Ground color="#2e3b2c" /><Trees />{moon && <mesh position={[8, 14, -60]}><sphereGeometry args={[3, 12, 12]} /><meshBasicMaterial color="#fff6d0" /></mesh>}</>);
    default:
      return (<><Ground color="#8fc46a" /><Trees /></>);
  }
};

const SKY: Record<string, string> = {
  tracks: "linear-gradient(#8fcfff, #e7f5ff 70%)", street: "linear-gradient(#9fd6ff, #eef8ff 70%)",
  desert: "linear-gradient(#ffb86b, #ffe6b0 70%)", beach: "linear-gradient(#6cc6ff, #dff3ff 70%)",
  space: "#05060f", night: "linear-gradient(#0b1430, #24345e 80%)", field: "linear-gradient(#8fcfff, #e7f5ff 70%)",
};

// ---------- objects ----------
const Obj: React.FC<{ o: LpObject; t: number }> = ({ o, t }) => {
  if (o.appear !== undefined && t < o.appear) return null;
  const k = o.to ? ease(t, o.move?.[0] ?? 0, o.move?.[1] ?? 2) : 0;
  const p = o.to ? lerp3(o.from, o.to, k) : o.from;
  let s = o.scale ?? 1;
  if (o.grow) s *= interpolate(t, [o.grow[1], o.grow[2]], [o.grow[0], 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o.appear !== undefined) s *= Math.min(1, (t - o.appear) * 6);
  if (o.vanish !== undefined) { if (t > o.vanish + 0.5) return null; if (t > o.vanish) s *= 1 - (t - o.vanish) / 0.5; }
  const c = o.color;
  if (o.kind === "meteor" && o.to && t > (o.move?.[1] ?? 2)) {
    // impact: an expanding fireball that fades, then nothing
    const e = t - (o.move?.[1] ?? 2);
    if (e > 1.2) return null;
    const r = (o.scale ?? 1) * (1 + e * 6);
    return (
      <group position={o.to}>
        <mesh scale={r}><icosahedronGeometry args={[0.7, 1]} /><meshBasicMaterial color="#ffd27a" transparent opacity={Math.max(0, 0.85 - e * 0.7)} /></mesh>
        <mesh scale={r * 1.5}><icosahedronGeometry args={[0.7, 1]} /><meshBasicMaterial color="#ff6a00" transparent opacity={Math.max(0, 0.4 - e * 0.33)} /></mesh>
      </group>
    );
  }
  const body = (() => {
    switch (o.kind) {
      case "train": return <Train z={0} />;
      case "car": return (<><Box p={[0, 0.55, 0]} s={[1.8, 0.7, 3.6]} c={c ?? "#e63946"} /><Box p={[0, 1.15, -0.2]} s={[1.6, 0.6, 1.9]} c={c ?? "#e63946"} /><Box p={[0, 1.15, 0.78]} s={[1.5, 0.5, 0.05]} c="#1d3557" />{[[-0.9, 1.1], [0.9, 1.1], [-0.9, -1.1], [0.9, -1.1]].map(([x, z], i) => (<mesh key={i} position={[x, 0.35, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.35, 0.35, 0.25, 8]} /><meshStandardMaterial color="#222" {...flat} /></mesh>))}</>);
      case "coin": return <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.5, 0.5, 0.1, 16]} /><meshStandardMaterial color={c ?? "#f2c230"} metalness={0.6} roughness={0.3} {...{ flatShading: true }} /></mesh>;
      case "ball": return <mesh position={[0, 0.5, 0]}><icosahedronGeometry args={[0.5, 1]} /><meshStandardMaterial color={c ?? "#ff6b35"} {...flat} /></mesh>;
      case "meteor": return <Meteor dir={o.to ? [o.to[0] - o.from[0], o.to[1] - o.from[1], o.to[2] - o.from[2]] : [-1, -1, 0]} />;
      case "rock": return <mesh position={[0, 0.6, 0]}><dodecahedronGeometry args={[0.7, 0]} /><meshStandardMaterial color={c ?? "#8d8d8d"} {...flat} /></mesh>;
      case "pizza": return (<><mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.9, 0.9, 0.1, 12]} /><meshStandardMaterial color="#f3d27a" {...flat} /></mesh>{Array.from({ length: 6 }).map((_, i) => <mesh key={i} position={[Math.cos(i) * 0.5, 0.13, Math.sin(i) * 0.5]}><cylinderGeometry args={[0.12, 0.12, 0.04, 8]} /><meshStandardMaterial color={c ?? "#c0392b"} /></mesh>)}</>);
      case "burger": return (<><mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.6, 0.55, 0.25, 10]} /><meshStandardMaterial color="#d9a05b" {...flat} /></mesh><mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.62, 0.62, 0.18, 10]} /><meshStandardMaterial color="#5b3a1e" {...flat} /></mesh><mesh position={[0, 0.48, 0]}><cylinderGeometry args={[0.66, 0.66, 0.05, 10]} /><meshStandardMaterial color="#5fbf3f" {...flat} /></mesh><mesh position={[0, 0.65, 0]}><sphereGeometry args={[0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e0a85f" {...flat} /></mesh></>);
      case "cake": return (<><mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.8, 0.8, 0.8, 12]} /><meshStandardMaterial color={c ?? "#f6c1d0"} {...flat} /></mesh><mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.04, 0.04, 0.3, 6]} /><meshStandardMaterial color="#fff" /></mesh></>);
      case "phone": return <Box p={[0, 0.8, 0]} s={[0.45, 0.9, 0.06]} c={c ?? "#111"} />;
      case "money": return (<>{Array.from({ length: 5 }).map((_, i) => <Box key={i} p={[0, 0.06 + i * 0.12, 0]} s={[1.1, 0.1, 0.55]} c={c ?? "#4caf50"} r={i * 0.2} />)}</>);
      case "bottle": return (<><mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.22, 0.22, 1, 8]} /><meshStandardMaterial color={c ?? "#4fc3f7"} transparent opacity={0.8} {...flat} /></mesh><mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.08, 0.12, 0.25, 8]} /><meshStandardMaterial color="#1565c0" /></mesh></>);
      case "tv": return (<><Box p={[0, 1.2, 0]} s={[2, 1.2, 0.12]} c="#111" /><Box p={[0, 1.2, 0.07]} s={[1.85, 1.05, 0.01]} c={c ?? "#3a86ff"} /></>);
      case "bag": return <Box p={[0, 0.45, 0]} s={[0.8, 0.9, 0.4]} c={c ?? "#8d6e63"} />;
      case "tree": return (<><mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.2, 0.25, 1.6, 6]} /><meshStandardMaterial color="#7a5a3a" {...flat} /></mesh><mesh position={[0, 2.3, 0]}><icosahedronGeometry args={[1.2, 0]} /><meshStandardMaterial color={c ?? "#5f9c4a"} {...flat} /></mesh></>);
      case "house": return (<><Box p={[0, 1.2, 0]} s={[3, 2.4, 3]} c={c ?? "#f2e3c6"} /><mesh position={[0, 3.0, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[2.4, 1.4, 4]} /><meshStandardMaterial color="#b5473a" {...flat} /></mesh></>);
      case "bolt": return (<>{[[0, 9, 0, 0.35], [0.5, 6.5, 0, -0.45], [-0.2, 4, 0, 0.4], [0.3, 1.6, 0, -0.35]].map((q, i) => <mesh key={i} position={[q[0], q[1], q[2]]} rotation={[0, 0, q[3]]}><boxGeometry args={[0.22, 2.8, 0.22]} /><meshBasicMaterial color={(Math.floor(t * 20) % 2) ? "#fff7a8" : "#ffffff"} /></mesh>)}<pointLight position={[0, 4, 1]} intensity={40} distance={30} color="#fff7c0" /></>);
      case "moon": return (<><mesh position={[0, 1, 0]}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={c ?? "#d8d4c8"} emissive="#3a3830" {...flat} /></mesh>{[[0.5, 1.4, 0.75], [-0.4, 0.7, 0.85], [0.1, 0.4, 0.95], [-0.6, 1.5, 0.7]].map((q, i) => <mesh key={i} position={[q[0], q[1], q[2]]}><sphereGeometry args={[0.16 + (i % 2) * 0.08, 6, 6]} /><meshStandardMaterial color="#9e998c" {...flat} /></mesh>)}</>);
      case "earth": return (<><mesh position={[0, 1, 0]}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={c ?? "#2f7fd6"} {...flat} /></mesh>{[[0.4, 1.4, 0.8], [-0.5, 0.8, 0.8], [0.2, 0.5, 0.9]].map((q, i) => <mesh key={i} position={[q[0], q[1], q[2]]}><icosahedronGeometry args={[0.38, 0]} /><meshStandardMaterial color="#4caf50" {...flat} /></mesh>)}</>);
      default: return <Box p={[0, 0.5, 0]} s={[1, 1, 1]} c={c ?? "#c49a6c"} />;
    }
  })();
  return <group position={p} scale={s} rotation={[0, (o.spin ?? 0) * t, 0]}>{body}</group>;
};

// Meteor: rock + glowing fireball + a long trail pointing back along its path, so it reads even far away.
const Meteor: React.FC<{ dir: V3 }> = ({ dir }) => {
  const f = useCurrentFrame();
  const v = new THREE.Vector3(...dir);
  if (v.lengthSq() < 1e-6) v.set(-1, -1, 0);
  v.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().negate());
  const flick = 1 + Math.sin(f * 1.7) * 0.08;
  return (
    <group>
      <mesh><dodecahedronGeometry args={[0.7, 0]} /><meshStandardMaterial color="#5a4636" emissive="#ff5a00" emissiveIntensity={0.6} {...flat} /></mesh>
      <mesh scale={1.6 * flick}><icosahedronGeometry args={[0.7, 1]} /><meshBasicMaterial color="#ffb347" transparent opacity={0.45} /></mesh>
      <mesh scale={2.4 * flick}><icosahedronGeometry args={[0.7, 1]} /><meshBasicMaterial color="#ff6a00" transparent opacity={0.18} /></mesh>
      <group quaternion={q}>
        <mesh position={[0, 4.2, 0]}><coneGeometry args={[1.0, 8, 10, 1, true]} /><meshBasicMaterial color="#ffcf70" transparent opacity={0.55} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 6.5, 0]}><coneGeometry args={[1.5, 13, 10, 1, true]} /><meshBasicMaterial color="#ff7a1a" transparent opacity={0.22} side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  );
};

// ---------- cast ----------
const inRanges = (t: number, r: [number, number][]) => r.some(([a, b]) => t >= a && t <= b);

const Actor: React.FC<{ c: LpCast; t: number; f: number; speaking: boolean; i: number }> = ({ c, t, f, speaking, i }) => {
  const look = LOOKS[c.who ?? "pepe"];
  const talking = Array.isArray(c.talk) ? inRanges(t, c.talk) : c.talk ? speaking : false;
  const mouth = talking ? Math.abs(Math.sin(f / 2.6 + i)) * 0.8 : 0;
  const start = c.pos ?? [0, 0];
  const k = c.to ? ease(t, c.move?.[0] ?? 0, c.move?.[1] ?? 2) : 0;
  const walking = c.to && t > (c.move?.[0] ?? 0) && t < (c.move?.[1] ?? 2);
  const x = start[0] + ((c.to?.[0] ?? start[0]) - start[0]) * k;
  const z = start[1] + ((c.to?.[1] ?? start[1]) - start[1]) * k;
  const rot = c.rot ?? (walking ? Math.atan2((c.to![0] - start[0]), (c.to![1] - start[1])) : 0);
  const wave = c.wave ? ease(t, c.wave[0], c.wave[0] + 0.3) * (1 - ease(t, c.wave[1] - 0.3, c.wave[1])) : 0;
  const jumpY = c.jump !== undefined && t > c.jump && t < c.jump + 0.6 ? Math.sin(((t - c.jump) / 0.6) * Math.PI) * 0.8 : 0;
  const scared = c.scared !== undefined && t > c.scared;
  const scaredK = scared ? Math.min(1, (t - c.scared!) * 5) : 0;
  const lookV: [number, number] = c.look ?? (talking ? [Math.sin(f / 30 + i) * 0.3, 0] : [Math.sin(f / 22 + i * 2) * 0.6, 0]);
  const p = (
    <Person {...look} shirt={c.color ?? look.shirt} blink={blinkAt(f, 50 + i * 13, i * 17)} look={lookV}
      brows={scared ? 1 : c.brows ?? 0.2} mouth={scared ? 0.9 : mouth} walk={walking ? t * 9 : undefined}
      wave={wave} headYaw={talking ? Math.sin(f / 14) * 0.12 : 0} bodyless={!!c.lie} />
  );
  if (c.lie) {
    const sx = c.lie === "left" ? -0.52 : 0.52;
    return (
      <group position={[sx, 1.2, -1.0]} rotation={[-1.0, 0, 0]}>
        <group position={[0, -1.95, 0]}>{p}</group>
      </group>
    );
  }
  return (
    <group position={[x, jumpY, z - scaredK * 0.5]} rotation={[scaredK * -0.15, rot, 0]} scale={c.scale ?? 1}>
      {p}
    </group>
  );
};

// ---------- 2D overlays ----------
const Counter: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at * fps, fps, config: { damping: 11 } });
  return (
    <div style={{ position: "absolute", top: 230, left: 0, right: 0, textAlign: "center", transform: `scale(${s})` }}>
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 150, color: "#fff", background: "#111", padding: "0 40px", borderRadius: 24, border: "8px solid #ffd60a" }}>{text}</span>
    </div>
  );
};

const Choice: React.FC<{ a: string; b: string; at: number; pick?: "a" | "b"; pickAt?: number }> = ({ a, b, at, pick, pickAt }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at * fps, fps, config: { damping: 10 } });
  const picked = pick && pickAt !== undefined && f >= pickAt * fps;
  const btn = (txt: string, k: "a" | "b") => (
    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 110, color: "#fff", padding: "6px 50px", borderRadius: 26,
      background: picked && pick === k ? "#2a9d8f" : "#d62828", border: "7px solid #111", boxShadow: "0 10px 0 #111",
      transform: picked && pick === k ? "scale(1.15)" : picked ? "scale(0.85)" : "none", opacity: picked && pick !== k ? 0.5 : 1 }}>{txt}</div>
  );
  if (f < at * fps) return null;
  return (
    <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 60, transform: `scale(${s})` }}>
      {btn(a, "a")}{btn(b, "b")}
    </div>
  );
};

const Overlays: React.FC<{ list: LpOverlay[] }> = ({ list }) => {
  const { fps } = useVideoConfig();
  // Badge/Gauge/Stamp count frames; convert seconds → frames here.
  return (
    <>
      {list.map((o, i) => {
        switch (o.kind) {
          case "badge": return <Badge key={i} text={o.text} at={Math.round(o.at * fps)} y={o.y ?? 360} color={o.color} />;
          case "label": return <Badge key={i} text={o.text} at={Math.round(o.at * fps)} y={o.y ?? 1180} color="#fff" />;
          case "gauge": return <Gauge key={i} from={o.from} to={o.to} start={Math.round(o.at * fps)} end={Math.round(o.end * fps)} unit={o.unit} y={o.y ?? 1100} />;
          case "stamp": return <Stamp key={i} text={o.text} at={Math.round(o.at * fps)} />;
          case "counter": return <Counter key={i} text={o.text} at={o.at ?? 0} />;
          case "choice": return <Choice key={i} {...o} />;
          default: return null;
        }
      })}
    </>
  );
};

// ---------- scene ----------
const DEFAULT_CAM: Record<string, { from: V3; look: V3; fov?: number }> = {
  bed: { from: [0, 4.1, 4.3], look: [0, 1.15, -0.9], fov: 34 },
  room: { from: [0, 2.4, 7], look: [0, 1.5, 0] },
  office: { from: [0, 2.4, 7], look: [0, 1.5, 0] },
  kitchen: { from: [0, 2.4, 7], look: [0, 1.5, 0] },
  tracks: { from: [0.4, 1.1, 8], look: [0, 2.2, -30], fov: 55 },
  space: { from: [0, 2, 8], look: [0, 1.5, 0] },
};

export const LpSceneView: React.FC<{ spec: LpSpec; words?: { w: string; t: number }[] }> = ({ spec, words }) => {
  const f = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const t = f / fps;
  const set = spec.set ?? "field";
  const dc = DEFAULT_CAM[set] ?? { from: [0.8, 2.0, 6.5] as V3, look: [0, 1.4, 0] as V3 };
  const from = spec.cam?.from ?? dc.from;
  const to = spec.cam?.to ?? (spec.cam?.from ? spec.cam.from : ([from[0] * 0.8, from[1], from[2] * 0.72] as V3));
  const pos = lerp3(from, to, ease(t, 0, durationInFrames / fps));
  const sh = spec.cam?.shake;
  const amp = sh && t > sh[0] && t < sh[1] ? sh[2] : 0;
  const shk: V3 = [Math.sin(f * 2.1) * amp, Math.cos(f * 2.7) * amp, 0];
  const speaking = !words?.length || words.some((w, i) => t >= w.t && t < (words[i + 1]?.t ?? w.t + 0.4) && t < w.t + 0.55);
  return (
    <AbsoluteFill style={{ background: SKY[set] ?? "#3b2a22" }}>
      <ThreeCanvas width={width} height={height}>
        <Cam pos={[pos[0] + shk[0], pos[1] + shk[1], pos[2]]} target={spec.cam?.look ?? dc.look} fov={spec.cam?.fov ?? dc.fov ?? 45} />
        {set === "bed" || set === "room" || set === "office" || set === "kitchen" ? (
          <><ambientLight intensity={0.65} /><directionalLight position={[2, 8, 5]} intensity={1.8} color="#fff1dc" /></>
        ) : set === "space" || set === "night" ? (
          <><ambientLight intensity={0.5} /><directionalLight position={[5, 6, 5]} intensity={1.6} color="#cfd8ff" /></>
        ) : <Lights />}
        <Set set={set} moon={spec.moon} />
        {(spec.objects ?? []).map((o, i) => <Obj key={i} o={o} t={t} />)}
        {(spec.cast ?? []).map((c, i) => <Actor key={i} c={c} t={t} f={f} speaking={speaking} i={i} />)}
      </ThreeCanvas>
      <Overlays list={spec.overlays ?? []} />
    </AbsoluteFill>
  );
};
