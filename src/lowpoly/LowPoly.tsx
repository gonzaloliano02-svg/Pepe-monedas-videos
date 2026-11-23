import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";

// Low-poly 3D style (owner references 2026-11-23: "Tu Novia Dice…", "Deadlockeando"):
// simple geometric characters that blink, look, talk and walk; moving objects; moving camera.
// Everything is procedural, so it is free and always anatomically correct.

const flat = { flatShading: true, roughness: 0.85 } as const;

export type PersonProps = {
  skin?: string;
  shirt?: string;
  pants?: string;
  glasses?: boolean;
  hair?: string | null; // null = bald
  blink?: number; // 0 open .. 1 closed
  look?: [number, number]; // eye offset x,y (-1..1)
  brows?: number; // -1 angry .. 1 surprised
  mouth?: number; // 0 closed .. 1 open
  headYaw?: number;
  walk?: number; // phase in radians; arms/legs swing when set
  wave?: number; // 0..1 right arm raised
  bodyless?: boolean;
};

export const Person: React.FC<PersonProps> = ({
  skin = "#e9b48f", shirt = "#2f7fd6", pants = "#2b2f3a", glasses = true, hair = null,
  blink = 0, look = [0, 0], brows = 0, mouth = 0, headYaw = 0, walk, wave = 0, bodyless = false,
}) => {
  const sw = walk === undefined ? 0 : Math.sin(walk) * 0.6;
  const eyeY = 0.08 + look[1] * 0.04;
  const eyeX = look[0] * 0.05;
  return (
    <group>
      {/* head */}
      <group position={[0, 1.95, 0]} rotation={[0, headYaw, 0]}>
        <mesh>
          <icosahedronGeometry args={[0.42, 2]} />
          <meshStandardMaterial color={skin} {...flat} />
        </mesh>
        {hair && (
          <mesh position={[0, 0.08, -0.04]} scale={[1.07, 1.0, 1.08]}>
            <sphereGeometry args={[0.42, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshStandardMaterial color={hair} {...flat} />
          </mesh>
        )}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.15 + eyeX, eyeY, 0.38]} scale={[1, Math.max(0.08, 1 - blink), 0.5]}>
              <sphereGeometry args={[0.065, 10, 8]} />
              <meshStandardMaterial color="#141414" roughness={0.3} />
            </mesh>
            <mesh position={[s * 0.15, 0.25 + brows * 0.04, 0.37]} rotation={[0, 0, -s * brows * 0.35]}>
              <boxGeometry args={[0.17, 0.035, 0.03]} />
              <meshStandardMaterial color="#2a1d14" />
            </mesh>
            {glasses && (
              <mesh position={[s * 0.15, 0.08, 0.41]}>
                <torusGeometry args={[0.11, 0.018, 6, 18]} />
                <meshStandardMaterial color="#111" />
              </mesh>
            )}
          </group>
        ))}
        {glasses && (
          <mesh position={[0, 0.1, 0.42]}>
            <boxGeometry args={[0.09, 0.02, 0.02]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        )}
        <mesh position={[0, -0.17, 0.39]} scale={[1, 0.25 + mouth * 1.2, 0.4]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color="#5a1f1f" />
        </mesh>
      </group>
      {!bodyless && (
        <>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[0.72, 0.85, 0.42]} />
            <meshStandardMaterial color={shirt} {...flat} />
          </mesh>
          {[-1, 1].map((s) => {
            const armRot = s === 1 && wave ? -wave * 2.6 + Math.sin(wave * 20) * 0.15 * wave : s * sw;
            return (
              <group key={s} position={[s * 0.47, 1.55, 0]} rotation={[armRot, 0, s * 0.08 + (s === 1 ? wave * 0.3 : 0)]}>
                <mesh position={[0, -0.36, 0]}>
                  <boxGeometry args={[0.2, 0.72, 0.22]} />
                  <meshStandardMaterial color={skin} {...flat} />
                </mesh>
              </group>
            );
          })}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.18, 0.78, 0]} rotation={[-s * sw, 0, 0]}>
              <mesh position={[0, -0.38, 0]}>
                <boxGeometry args={[0.26, 0.78, 0.3]} />
                <meshStandardMaterial color={pants} {...flat} />
              </mesh>
              <mesh position={[0, -0.78, 0.06]}>
                <boxGeometry args={[0.28, 0.1, 0.42]} />
                <meshStandardMaterial color="#f2f2f2" {...flat} />
              </mesh>
            </group>
          ))}
        </>
      )}
    </group>
  );
};

const Cam: React.FC<{ pos: [number, number, number]; target: [number, number, number]; fov?: number }> = ({ pos, target, fov = 45 }) => {
  const { camera } = useThree();
  camera.position.set(...pos);
  (camera as any).fov = fov;
  camera.lookAt(...target);
  camera.updateProjectionMatrix();
  return null;
};

const blinkAt = (f: number, every = 70, off = 0) => {
  const t = (f + off) % every;
  return t < 3 ? [0.6, 1, 0.6][t] : 0;
};

const Lights: React.FC = () => (
  <>
    <ambientLight intensity={0.55} />
    <hemisphereLight args={["#dff1ff", "#c8b48a", 0.8]} />
    <directionalLight position={[4, 9, 6]} intensity={2.2} />
  </>
);

const Ground: React.FC<{ color?: string }> = ({ color = "#d9c99a" }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -40]}>
    <planeGeometry args={[400, 400]} />
    <meshStandardMaterial color={color} {...flat} />
  </mesh>
);

const Trees: React.FC = () => (
  <>
    {Array.from({ length: 18 }).map((_, i) => {
      const r = (k: number) => Math.abs(Math.sin(i * 73.1 + k * 19.7));
      const x = (i % 2 ? 1 : -1) * (8 + r(1) * 30);
      const z = -10 - r(2) * 90;
      return (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.15, 0.2, 1.2, 5]} /><meshStandardMaterial color="#7a5a3a" {...flat} /></mesh>
          <mesh position={[0, 1.8, 0]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#5f9c4a" {...flat} /></mesh>
        </group>
      );
    })}
    {Array.from({ length: 6 }).map((_, i) => (
      <mesh key={i} position={[-60 + i * 25, 0, -150]}>
        <coneGeometry args={[14, 12, 4]} />
        <meshStandardMaterial color="#9bbf7a" {...flat} />
      </mesh>
    ))}
  </>
);

const Track: React.FC = () => (
  <>
    {Array.from({ length: 70 }).map((_, i) => (
      <mesh key={i} position={[0, 0.06, 4 - i * 1.6]}>
        <boxGeometry args={[3.2, 0.12, 0.45]} />
        <meshStandardMaterial color="#9a9184" {...flat} />
      </mesh>
    ))}
    {[-0.75, 0.75].map((x) => (
      <mesh key={x} position={[x, 0.2, -50]}>
        <boxGeometry args={[0.12, 0.16, 120]} />
        <meshStandardMaterial color="#6f6f78" metalness={0.6} roughness={0.4} />
      </mesh>
    ))}
    <mesh position={[0, 0.03, -50]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.2, 120]} />
      <meshStandardMaterial color="#b9ad99" {...flat} />
    </mesh>
    {Array.from({ length: 8 }).map((_, i) => (
      <group key={i} position={[2.8, 0, 2 - i * 15]}>
        <mesh position={[0, 3, 0]}><boxGeometry args={[0.18, 6, 0.18]} /><meshStandardMaterial color="#7d7d85" /></mesh>
        <mesh position={[-1.4, 5.6, 0]}><boxGeometry args={[2.8, 0.1, 0.1]} /><meshStandardMaterial color="#7d7d85" /></mesh>
      </group>
    ))}
    <mesh position={[0, 5.5, -50]}><boxGeometry args={[0.03, 0.03, 120]} /><meshStandardMaterial color="#333" /></mesh>
  </>
);

const Train: React.FC<{ z: number }> = ({ z }) => (
  <group position={[0, 0.3, z]}>
    {Array.from({ length: 4 }).map((_, i) => (
      <group key={i} position={[0, 0, -i * 9.4]}>
        <mesh position={[0, 1.7, 0]}><boxGeometry args={[2.9, 3.0, 9]} /><meshStandardMaterial color="#f4f4f4" {...flat} /></mesh>
        <mesh position={[0, 2.1, 0]}><boxGeometry args={[2.95, 0.6, 8.2]} /><meshStandardMaterial color="#1c2f74" /></mesh>
        <mesh position={[0, 0.95, 0]}><boxGeometry args={[2.95, 0.18, 9]} /><meshStandardMaterial color="#f2c230" /></mesh>
      </group>
    ))}
    {/* nose */}
    <mesh position={[0, 1.35, 6.2]} rotation={[0.42, 0, 0]}><boxGeometry args={[2.9, 1.6, 3.8]} /><meshStandardMaterial color="#f4f4f4" {...flat} /></mesh>
    <mesh position={[0, 2.15, 5.6]} rotation={[0.5, 0, 0]}><boxGeometry args={[2.2, 0.7, 0.1]} /><meshStandardMaterial color="#14213d" /></mesh>
    {[-0.9, 0.9].map((x) => (
      <mesh key={x} position={[x, 0.75, 7.9]}><boxGeometry args={[0.45, 0.18, 0.1]} /><meshStandardMaterial color="#fff6c8" emissive="#fff2a0" emissiveIntensity={1.5} /></mesh>
    ))}
  </group>
);

// ---------- 2D overlays ----------
import { FONT_DISPLAY, loadFonts } from "../theme";
const font = FONT_DISPLAY;

const Badge: React.FC<{ text: string; at: number; y?: number; color?: string }> = ({ text, at, y = 1250, color = "#ffd60a" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 9 } });
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: `scale(${s}) rotate(-4deg)`, background: color, color: "#111", fontFamily: font, fontSize: 92,
        padding: "8px 34px", borderRadius: 60, border: "6px solid #111", boxShadow: "0 10px 0 #111" }}>{text}</div>
    </div>
  );
};

const Gauge: React.FC<{ from: number; to: number; start: number; end: number; unit: string; y?: number }> = ({ from, to, start, end, unit, y = 1180 }) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [start, end], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const a = interpolate(v, [0, Math.max(to, 1)], [-120, 120]);
  const pop = spring({ frame: f - start + 8, fps: 30, config: { damping: 10 } });
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${pop})` }}>
      <svg width={520} height={340} viewBox="-130 -130 260 170">
        <path d="M -115 0 A 115 115 0 0 1 115 0" fill="#141b2e" stroke="#ffd60a" strokeWidth={10} />
        {Array.from({ length: 9 }).map((_, i) => {
          const r = ((-120 + i * 30) * Math.PI) / 180;
          return <line key={i} x1={Math.sin(r) * 95} y1={-Math.cos(r) * 95} x2={Math.sin(r) * 108} y2={-Math.cos(r) * 108} stroke="#fff" strokeWidth={5} />;
        })}
        <line x1={0} y1={0} x2={Math.sin((a * Math.PI) / 180) * 88} y2={-Math.cos((a * Math.PI) / 180) * 88} stroke="#e63946" strokeWidth={8} strokeLinecap="round" />
        <circle r={12} fill="#ffd60a" />
        <text y={30} textAnchor="middle" fontFamily={font} fontSize={46} fill="#fff" stroke="#111" strokeWidth={2}>{Math.round(v)} {unit}</text>
      </svg>
    </div>
  );
};

const Stamp: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = interpolate(f - at, [0, 6], [2.4, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 380, right: 110, transform: `scale(${s}) rotate(-12deg)`, opacity: Math.min(1, (f - at) / 3),
      border: "10px solid #d62828", color: "#d62828", fontFamily: font, fontSize: 130, padding: "0 26px", borderRadius: 14, background: "rgba(255,255,255,0.15)" }}>{text}</div>
  );
};

const Caption: React.FC<{ words: [string, number][]; y?: number }> = ({ words, y = 1500 }) => {
  const f = useCurrentFrame();
  const shown = words.filter(([, t]) => t <= f).slice(-2);
  if (!shown.length) return null;
  return (
    <div style={{ position: "absolute", top: y, left: 40, right: 40, textAlign: "center", fontFamily: font, fontSize: 118, lineHeight: 1,
      color: "#fff", WebkitTextStroke: "8px #111", paintOrder: "stroke", textTransform: "uppercase" }}>
      {shown.map(([w], i) => <span key={i} style={{ color: i === shown.length - 1 ? "#ffd60a" : "#fff", marginRight: 26 }}>{w}</span>)}
    </div>
  );
};

// ---------- shots ----------
const ShotPepe: React.FC = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 150], [6.2, 3.6]);
  const wave = interpolate(f, [30, 45, 95, 110], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#8fcfff, #e7f5ff 70%)" }}>
      <ThreeCanvas width={1080} height={1920}>
        <Cam pos={[0.9, 1.9, z]} target={[0, 1.45, 0]} />
        <Lights />
        <Ground />
        <Trees />
        <group position={[-4, 0, -6]}><Track /></group>
        <Person blink={blinkAt(f, 55)} look={[Math.sin(f / 18) * 0.6, 0]} mouth={Math.abs(Math.sin(f / 3)) * (f > 20 && f < 120 ? 0.7 : 0)} wave={wave} brows={0.4} />
        {/* height ruler */}
        <group position={[-0.85, 0, 0.3]}>
          <mesh position={[0, 1.18, 0]}><boxGeometry args={[0.12, 2.36, 0.04]} /><meshStandardMaterial color="#f2c230" /></mesh>
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={i} position={[0.05, 0.2 * i, 0.03]}><boxGeometry args={[0.08, 0.02, 0.01]} /><meshStandardMaterial color="#111" /></mesh>
          ))}
        </group>
      </ThreeCanvas>
      <Badge text="1,74 m EXACTOS" at={40} y={1180} />
      <Caption words={[["Mides", 8], ["1,74", 22], ["y", 40], ["estás", 48], ["en", 56], ["la", 60], ["vía", 66], ["del", 80], ["AVE", 88]]} />
    </AbsoluteFill>
  );
};

const ShotTrain: React.FC = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 170], [-70, 3], { easing: (t) => Math.pow(t, 1.6) });
  const shake = f > 120 ? Math.sin(f * 2.3) * 0.06 * ((f - 120) / 50) : 0;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#8fcfff, #eef8ff 70%)" }}>
      <ThreeCanvas width={1080} height={1920}>
        <Cam pos={[0.4 + shake, 1.1 + shake, 8]} target={[0, 2.2, -30]} fov={55} />
        <Lights />
        <Ground />
        <Trees />
        <Track />
        <Train z={z} />
      </ThreeCanvas>
      <Gauge from={0} to={300} start={10} end={110} unit="km/h" y={1150} />
      <Badge text="425 TONELADAS" at={120} y={360} />
      <Caption words={[["Un", 4], ["tren", 10], ["de", 22], ["425", 28], ["toneladas", 40], ["a", 60], ["300", 66], ["por", 80], ["hora", 86]]} y={1560} />
    </AbsoluteFill>
  );
};

const ShotBed: React.FC = () => {
  const f = useCurrentFrame();
  const herYaw = interpolate(f, [10, 25], [0, -0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lookP: [number, number] = f < 60 ? [0, 0.3] : f < 90 ? [-0.8, 0] : [Math.sin(f / 4) * 0.9, -0.2];
  return (
    <AbsoluteFill style={{ background: "#3b2a22" }}>
      <ThreeCanvas width={1080} height={1920}>
        <Cam pos={[0, 3.6, 4.1 - f * 0.006]} target={[0, 0.45, -0.5]} fov={34} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 8, 3]} intensity={1.8} color="#fff1dc" />
        {/* headboard + mattress */}
        <mesh position={[0, 0.6, -1.4]}><boxGeometry args={[4.6, 2.2, 0.3]} /><meshStandardMaterial color="#7a4a2a" {...flat} /></mesh>
        <mesh position={[0, -0.2, 0.8]}><boxGeometry args={[4.4, 0.4, 4.6]} /><meshStandardMaterial color="#e8e8f0" {...flat} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.62, 0.1, -0.75]}><boxGeometry args={[1.15, 0.35, 0.9]} /><meshStandardMaterial color="#cfd6e6" {...flat} /></mesh>
        ))}
        {/* blanket with stripes */}
        <mesh position={[0, 0.25, 1.4]}><boxGeometry args={[4.5, 0.3, 3.4]} /><meshStandardMaterial color="#c9d2ea" {...flat} /></mesh>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[0, 0.41, 0.1 + i * 0.5]}><boxGeometry args={[4.52, 0.01, 0.05]} /><meshStandardMaterial color={i % 2 ? "#e07a5f" : "#5b7bd5"} /></mesh>
        ))}
        <group position={[-0.52, 0.6, -0.55]} rotation={[-1.0, 0, 0]}><group position={[0, -1.95, 0]}>
          <Person bodyless glasses blink={blinkAt(f, 48, 10)} look={lookP} brows={f > 60 ? 0.9 : 0} mouth={0} />
        </group></group>
        <group position={[0.52, 0.6, -0.55]} rotation={[-1.0, 0, 0]}><group position={[0, -1.95, 0]}>
          <Person bodyless glasses={false} hair="#5a3420" skin="#f0c09e" headYaw={herYaw} blink={blinkAt(f, 62)}
            look={[-0.7, 0]} brows={-0.3} mouth={f > 25 && f < 75 ? Math.abs(Math.sin(f / 3)) * 0.8 : 0} />
        </group></group>
      </ThreeCanvas>
      <Stamp text="MIENTES" at={110} />
      <Caption words={[["Si", 24], ["me", 30], ["muero,", 36], ["¿te", 48], ["echarías", 54], ["otra?", 64], ["…", 100]]} y={1450} />
    </AbsoluteFill>
  );
};

export const LowPolyPilot: React.FC = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => { loadFonts().then(() => continueRender(h)); }, [h]);
  return (
  <AbsoluteFill style={{ background: "#000" }}>
    <Sequence durationInFrames={150}><ShotPepe /></Sequence>
    <Sequence from={150} durationInFrames={180}><ShotTrain /></Sequence>
    <Sequence from={330} durationInFrames={150}><ShotBed /></Sequence>
    <Sequence from={40}><Audio src={staticFile("sfx/pop.wav")} volume={0.6} /></Sequence>
    <Sequence from={150} durationInFrames={180}><Audio src={staticFile("sfx/rumble.wav")} volume={0.8} /></Sequence>
    <Sequence from={270}><Audio src={staticFile("sfx/hit.wav")} volume={0.7} /></Sequence>
    <Sequence from={440}><Audio src={staticFile("sfx/hit.wav")} volume={0.8} /></Sequence>
  </AbsoluteFill>
);
};
