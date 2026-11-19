import React, { useId, useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { C, FONT_BODY, FONT_DISPLAY } from "../theme";
import { emojiUrl } from "./emoji";
import { Landscape, type Env } from "./Landscape";

// Animated "cartoon" layer for the long-form videos (owner request 2026-11-18:
// "más animación, monigotes, escenas guays, incluso épicas").
// Everything is drawn in SVG and driven by the frame, so it renders fast and
// deterministically: articulated stick figures with poses and faces, an epic
// black hole with a spinning accretion disk, stars, warp tunnel, chalkboard,
// Earth, clocks, gravitational-wave ripples, arrows, speech bubbles, plus a
// camera (zoom / pan / shake) and effects (flash, red shift, speed lines).

export type Pose =
  | "idle" | "wave" | "walk" | "run" | "point" | "scared" | "think" | "cheer"
  | "float" | "fall" | "shrug" | "look" | "stretch" | "push" | "facepalm";
export type Expr = "happy" | "wow" | "scared" | "sad" | "cool" | "dizzy" | "calm" | "angry" | "sleepy";

export type Actor = {
  kind: "stick" | "bh" | "star" | "clock" | "emoji" | "ripple" | "arrow" | "bubble" | "tag" | "beam";
  x: number; // % of width
  y: number; // % of height (stick: feet; others: centre)
  to?: [number, number]; // move target (%)
  move?: [number, number]; // seconds [start, end] of the move (default: whole scene)
  ease?: "inout" | "in" | "out" | "linear";
  size?: number; // px (stick: height; bh: shadow radius; others: width)
  scaleTo?: number; // size multiplier reached at the end of the move
  delay?: number; // seconds before it appears
  vanish?: number; // second at which it shrinks away
  spin?: number; // degrees per second
  rot?: number; // static rotation
  flip?: boolean;
  // stick
  pose?: Pose;
  pose2?: Pose; // switch to this pose at poseAt
  poseAt?: number;
  expr?: Expr;
  expr2?: Expr;
  helmet?: boolean;
  color?: string; // scarf / accent colour
  stretch?: [number, number]; // spaghettification 0..1 (start, end of move)
  name?: string; // small label above the head
  sweat?: boolean; // drops falling from the head
  // emoji
  emoji?: string;
  anim?: "float" | "pop" | "shake" | "pulse";
  // bubble / tag / arrow
  text?: string;
  // star
  mode?: "pulse" | "collapse";
  at?: number; // seconds (collapse time / merge time)
  // clock
  speed?: number; // turns of the minute hand per second
  slow?: boolean; // clock slows down over time
  // ripple
  merge?: boolean; // two black holes spiralling in
  opacity?: number;
};

export type CartoonBg = "space" | "blackhole" | "warp" | "chalk" | "earth" | "void" | "room" | "room-day" | `land:${Env}`;

export type CartoonScene = {
  bg?: CartoonBg;
  seed?: string;
  actors?: Actor[];
  camera?: { zoom?: [number, number]; focus?: [number, number]; pan?: [number, number]; shake?: number; shakeAt?: number };
  fx?: ("flash" | "redshift" | "speedlines" | "einstein" | "glitch" | "heat" | "snow")[];
  flashAt?: number;
  chalk?: string[];
  bh?: { x: number; y: number; size: number; tilt?: number }; // background black hole (bg "blackhole")
};

/* ---------------- helpers ---------------- */

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const rng = (seed: string) => {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const EASE = {
  inout: Easing.inOut(Easing.cubic),
  in: Easing.in(Easing.quad),
  out: Easing.out(Easing.cubic),
  linear: (v: number) => v,
};
const OUT = "#0b0d1a";

/* ---------------- backgrounds ---------------- */

const Stars: React.FC<{ seed: string; n: number; t: number; drift: number; size: number }> = ({ seed, n, t, drift, size }) => {
  const { width: W, height: H } = useVideoConfig();
  const stars = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, s: (0.4 + r()) * size, p: r() * 6.28, f: 0.8 + r() * 2.5, c: r() }));
  }, [seed, n, size, W, H]);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {stars.map((s, i) => {
        const x = (((s.x - t * drift) % W) + W) % W;
        const o = 0.45 + 0.55 * Math.abs(Math.sin(t * s.f + s.p));
        const col = s.c < 0.15 ? "#ffd9a8" : s.c < 0.3 ? "#a8d4ff" : "#ffffff";
        return <circle key={i} cx={x} cy={s.y} r={s.s} fill={col} opacity={o} />;
      })}
    </svg>
  );
};

const Nebula: React.FC<{ seed: string; t: number }> = ({ seed, t }) => {
  const r = rng(seed + "neb");
  const blobs = [0, 1, 2, 3].map((i) => ({
    x: r() * 100,
    y: r() * 100,
    w: 45 + r() * 40,
    c: ["#5b2a86", "#1d4e89", "#14706e", "#7a1f4a"][(i + Math.floor(r() * 4)) % 4],
  }));
  return (
    <>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${b.x + Math.sin(t * 0.05 + i) * 2}%`,
            top: `${b.y}%`,
            width: `${b.w}%`,
            height: `${b.w * 1.1}%`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(ellipse at center, ${b.c}88 0%, ${b.c}33 40%, transparent 70%)`,
            filter: "blur(30px)",
          }}
        />
      ))}
    </>
  );
};

const SpaceBg: React.FC<{ seed: string; t: number }> = ({ seed, t }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #0e1238 0%, #060818 55%, #010208 100%)" }}>
    <Nebula seed={seed} t={t} />
    <Stars seed={seed + "a"} n={260} t={t} drift={4} size={1.1} />
    <Stars seed={seed + "b"} n={90} t={t} drift={10} size={2} />
    <Stars seed={seed + "c"} n={25} t={t} drift={22} size={3.2} />
  </AbsoluteFill>
);

const WarpBg: React.FC<{ seed: string; t: number; cx: number; cy: number }> = ({ seed, t, cx, cy }) => {
  const { width: W, height: H } = useVideoConfig();
  const lines = useMemo(() => {
    const r = rng(seed + "warp");
    return Array.from({ length: 220 }, () => ({ a: r() * Math.PI * 2, z: r(), c: r() }));
  }, [seed]);
  const X = (cx / 100) * W;
  const Y = (cy / 100) * H;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at " + cx + "% " + cy + "%, #1b1440 0%, #07061a 45%, #000 100%)" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {lines.map((l, i) => {
          const z = (l.z + t * 0.55) % 1;
          const rr = (k: number) => 20 / Math.max(0.02, 1 - k * 0.985);
          const r1 = rr(z);
          const r2 = rr(Math.max(0, z - 0.06));
          const col = l.c < 0.3 ? "#9fd3ff" : l.c < 0.45 ? "#ffcf8a" : "#ffffff";
          return (
            <line
              key={i}
              x1={X + Math.cos(l.a) * r2}
              y1={Y + Math.sin(l.a) * r2}
              x2={X + Math.cos(l.a) * r1}
              y2={Y + Math.sin(l.a) * r1}
              stroke={col}
              strokeWidth={0.6 + z * 4}
              strokeLinecap="round"
              opacity={clamp01(z * 1.6)}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const ChalkBg: React.FC<{ t: number; lines?: string[] }> = ({ t, lines = [] }) => {
  const total = lines.join("").length;
  const shown = Math.floor(t * 22);
  let used = 0;
  return (
    <AbsoluteFill style={{ background: "#3a2617" }}>
      <div
        style={{
          position: "absolute",
          inset: 36,
          borderRadius: 10,
          background: "radial-gradient(ellipse at 40% 35%, #2f5240 0%, #1f3a2e 60%, #142a20 100%)",
          boxShadow: "inset 0 0 120px rgba(0,0,0,0.6), 0 0 0 10px #5a3a22",
        }}
      />
      <div style={{ position: "absolute", left: 140, right: 140, top: 300, fontFamily: FONT_BODY, color: "rgba(240,245,235,0.85)", fontSize: 56, lineHeight: 1.6, fontStyle: "italic", textShadow: "0 0 6px rgba(255,255,255,0.25)" }}>
        {lines.map((ln, i) => {
          const start = used;
          used += ln.length;
          const k = Math.max(0, Math.min(ln.length, shown - start));
          return (
            <div key={i} style={{ textAlign: i % 2 ? "right" : "left", opacity: total ? 1 : 0 }}>
              {ln.slice(0, k)}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 60, background: "linear-gradient(#6b4528, #3a2617)" }} />
    </AbsoluteFill>
  );
};

const EarthBg: React.FC<{ seed: string; t: number }> = ({ seed, t }) => {
  const id = useId().replace(/:/g, "");
  const { width: W, height: H } = useVideoConfig();
  const ER = W < H ? 1100 : 1250;
  const ECX = W / 2;
  const top = H * 0.74;
  const ECY = top + ER;
  return (
    <AbsoluteFill>
      <SpaceBg seed={seed} t={t} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id={`e${id}`} cx="40%" cy="20%" r="80%">
            <stop offset="0%" stopColor="#4aa3ff" />
            <stop offset="55%" stopColor="#1557b0" />
            <stop offset="100%" stopColor="#06204a" />
          </radialGradient>
          <clipPath id={`c${id}`}>
            <circle cx={ECX} cy={ECY} r={ER} />
          </clipPath>
          <filter id={`b${id}`}>
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <circle cx={ECX} cy={ECY} r={ER + 35} fill="#7cc4ff" opacity={0.45} filter={`url(#b${id})`} />
        <circle cx={ECX} cy={ECY} r={ER} fill={`url(#e${id})`} />
        <g clipPath={`url(#c${id})`}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = ((i * 520 - t * 18) % 3200) - 400;
            return <ellipse key={i} cx={x} cy={top + 100 + (i % 3) * 40} rx={170 + (i % 2) * 90} ry={60} fill="#3f9a5a" opacity={0.85} />;
          })}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const x = ((i * 430 - t * 30) % 3200) - 300;
            return <ellipse key={i} cx={x} cy={top + 60 + (i % 4) * 35} rx={220} ry={22} fill="#fff" opacity={0.35} />;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const RoomBg: React.FC<{ t: number; day: boolean; seed: string }> = ({ t, day, seed }) => {
  const { width: W, height: H } = useVideoConfig();
  const V = H > W;
  const ww = V ? W * 0.5 : W * 0.24;
  const wh = V ? H * 0.2 : H * 0.36;
  const wx = V ? W * 0.08 : W * 0.08;
  const wy = V ? H * 0.22 : H * 0.14;
  return (
    <AbsoluteFill style={{ background: day ? "linear-gradient(#f3e6c9, #e6d2a8)" : "linear-gradient(#262b4a, #1a1e36)" }}>
      <div style={{ position: "absolute", left: wx, top: wy, width: ww, height: wh, borderRadius: 10, overflow: "hidden", border: `14px solid ${day ? "#fff" : "#3b4166"}`, boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
        <AbsoluteFill style={{ background: day ? "linear-gradient(#8fd0ff, #d8f0ff)" : "linear-gradient(#0b1030, #1f2a5c)" }}>
          {!day ? <Stars seed={seed + "room"} n={30} t={t} drift={2} size={1.6} /> : null}
          <div style={{ position: "absolute", right: "18%", top: "18%", width: wh * 0.32, height: wh * 0.32, borderRadius: "50%", background: day ? "#ffd84a" : "#f4f1d0", boxShadow: day ? "0 0 40px #ffd84a" : "0 0 30px rgba(244,241,208,0.6)" }} />
        </AbsoluteFill>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 10, marginLeft: -5, background: day ? "#fff" : "#3b4166" }} />
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 10, marginTop: -5, background: day ? "#fff" : "#3b4166" }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", background: day ? "linear-gradient(#b98552, #8c5f36)" : "linear-gradient(#4a3423, #2c1f15)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "22%", height: 16, background: day ? "#fff4dc" : "#3b4166" }} />
      {!day ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(255,214,120,0.12), transparent 60%)" }} /> : null}
    </AbsoluteFill>
  );
};

/* ---------------- black hole ---------------- */

const ellPath = (rx: number, ry: number) => `M ${-rx},0 a ${rx},${ry} 0 1,0 ${2 * rx},0 a ${rx},${ry} 0 1,0 ${-2 * rx},0 Z`;

export const BlackHole: React.FC<{ R: number; t: number; tilt?: number }> = ({ R, t, tilt = -10 }) => {
  const id = useId().replace(/:/g, "");
  const flick = 1 + noise2D("bh", t * 0.8, 0) * 0.08;
  const disk = (half: "top" | "bottom") => (
    <g clipPath={`url(#${half}${id})`}>
      <path d={ellPath(2.8 * R, 0.5 * R) + " " + ellPath(1.25 * R, 0.2 * R)} fill={`url(#dg${id})`} fillRule="evenodd" opacity={0.95} />
      {[1.4, 1.65, 1.9, 2.15, 2.4, 2.65].map((k, i) => {
        const rx = k * R;
        const ry = rx * 0.18;
        const circ = Math.PI * (rx + ry) * 1.1;
        return (
          <ellipse
            key={i}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={i % 2 ? "#fff3d0" : "#ffb347"}
            strokeWidth={Math.max(2, R * 0.025)}
            strokeDasharray={`${circ * 0.18} ${circ * 0.1}`}
            strokeDashoffset={-t * (900 / k)}
            opacity={0.45}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
  return (
    <svg width={8 * R} height={8 * R} viewBox={`${-4 * R} ${-4 * R} ${8 * R} ${8 * R}`} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`gl${id}`}>
          <stop offset="0%" stopColor="#ffb347" stopOpacity={0.55} />
          <stop offset="45%" stopColor="#ff6a1a" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#ff6a1a" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`dg${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#fffbe8" />
          <stop offset="30%" stopColor="#ffd27a" />
          <stop offset="70%" stopColor="#ff8a2a" />
          <stop offset="100%" stopColor="#a8300c" />
        </linearGradient>
        <clipPath id={`top${id}`}>
          <rect x={-4 * R} y={-4 * R} width={8 * R} height={4 * R + 2} />
        </clipPath>
        <clipPath id={`bottom${id}`}>
          <rect x={-4 * R} y={0} width={8 * R} height={4 * R} />
        </clipPath>
        <filter id={`bl${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={R * 0.06} />
        </filter>
      </defs>
      <g transform={`rotate(${tilt})`}>
        <circle r={3.6 * R} fill={`url(#gl${id})`} opacity={flick} />
        {disk("top")}
        <ellipse rx={1.36 * R} ry={1.3 * R} fill="none" stroke={`url(#dg${id})`} strokeWidth={0.42 * R} filter={`url(#bl${id})`} opacity={0.9 * flick} />
        <circle r={1.04 * R} fill="none" stroke="#fff6d6" strokeWidth={0.05 * R} opacity={0.95} />
        <circle r={R} fill="#000" />
        {disk("bottom")}
      </g>
    </svg>
  );
};

/* ---------------- stick figure ---------------- */

type Limb = [number, number];
type PoseData = { lean: number; bob: number; la: Limb; ra: Limb; ll: Limb; rl: Limb; tilt: number };

const S = Math.sin;
const poseAt = (p: Pose, t: number): PoseData => {
  const base: PoseData = { lean: 0, bob: 0, la: [-14, 8], ra: [14, -8], ll: [-8, 0], rl: [8, 0], tilt: 0 };
  switch (p) {
    case "idle": {
      const b = S(t * 2.2);
      return { ...base, bob: b * 1.5, la: [-22 + b * 3, 14], ra: [22 - b * 3, -14], tilt: S(t * 0.9) * 4 };
    }
    case "wave": {
      const w = S(t * 9);
      return { ...base, ra: [100 + w * 8, 60 + w * 25], tilt: 6 };
    }
    case "walk": {
      const q = t * 7;
      return { ...base, lean: 4, bob: -Math.abs(S(q)) * 5, ll: [S(q) * 28, -Math.max(0, S(q + 1.6)) * 45], rl: [-S(q) * 28, -Math.max(0, -S(q + 1.6)) * 45], la: [-S(q) * 28, 20], ra: [S(q) * 28, 20] };
    }
    case "run": {
      const q = t * 12;
      return { ...base, lean: 14, bob: -Math.abs(S(q)) * 10, ll: [S(q) * 45, -Math.max(0, S(q + 1.6)) * 85], rl: [-S(q) * 45, -Math.max(0, -S(q + 1.6)) * 85], la: [-S(q) * 55, 75], ra: [S(q) * 55, 75] };
    }
    case "point":
      return { ...base, lean: -3, ra: [95, -4], la: [-16, 10], tilt: S(t * 1.2) * 3 };
    case "scared": {
      const sh = S(t * 40) * 5;
      return { ...base, bob: sh * 0.4, la: [-120 + sh, -45], ra: [120 - sh, 45], ll: [-16, 12], rl: [16, -12], tilt: sh };
    }
    case "think":
      return { ...base, ra: [35, 125], la: [-25, 105], tilt: 10 + S(t * 1.5) * 3 };
    case "cheer": {
      const j = Math.abs(S(t * 6));
      return { ...base, bob: -j * 16, la: [-128 - j * 10, -22], ra: [128 + j * 10, 22], ll: [-10 - j * 8, 0], rl: [10 + j * 8, 0] };
    }
    case "float":
      return { ...base, bob: S(t * 1.5) * 6, la: [-65 + S(t * 1.3) * 20, 30], ra: [70 + S(t * 1.1 + 1) * 20, -30], ll: [-20 + S(t) * 10, 20], rl: [25 + S(t + 2) * 10, -18], tilt: S(t) * 6 };
    case "fall":
      return { ...base, la: [-125 + S(t * 14) * 35, -20 + S(t * 11) * 40], ra: [125 + S(t * 13 + 1) * 35, 20 + S(t * 12) * 40], ll: [-30 + S(t * 12) * 30, 30], rl: [30 + S(t * 10 + 2) * 30, -30], tilt: S(t * 9) * 10 };
    case "shrug":
      return { ...base, la: [-40, -105], ra: [40, 105], tilt: S(t * 2) * 7 };
    case "look":
      return { ...base, lean: 6, ra: [115, 115], la: [-16, 10], tilt: -5 + S(t * 1.4) * 6 };
    case "stretch":
      return { ...base, la: [-150, -12], ra: [150, 12], ll: [-3, 0], rl: [3, 0], tilt: S(t * 3) * 3 };
    case "push": {
      const q = t * 3;
      return { ...base, lean: 18, la: [80, 8], ra: [95, -8], ll: [S(q) * 20 - 8, -Math.max(0, S(q + 1.6)) * 30], rl: [-S(q) * 20 - 8, -Math.max(0, -S(q + 1.6)) * 30] };
    }
    case "facepalm":
      return { ...base, ra: [105, 150], la: [-16, 10], tilt: 14, bob: 2 };
  }
  return base;
};

const seg = (x: number, y: number, a: number, L: number): [number, number] => {
  const r = (a * Math.PI) / 180;
  return [x + L * Math.sin(r), y + L * Math.cos(r)];
};

const Face: React.FC<{ expr: Expr; t: number; look: number }> = ({ expr, t, look }) => {
  const blink = t % 3.3 < 0.11;
  const ex = look * 4;
  const big = expr === "wow" || expr === "scared";
  const eye = (cx: number) =>
    expr === "dizzy" ? (
      <g key={cx} stroke={OUT} strokeWidth={3.5} strokeLinecap="round">
        <line x1={cx - 5} y1={-9} x2={cx + 5} y2={1} />
        <line x1={cx + 5} y1={-9} x2={cx - 5} y2={1} />
      </g>
    ) : expr === "sleepy" ? (
      <g key={cx}>
        <path d={`M ${cx - 7} -4 A 7 6 0 0 0 ${cx + 7} -4 Z`} fill={OUT} />
        <line x1={cx - 8} y1={-4} x2={cx + 8} y2={-4} stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />
      </g>
    ) : blink ? (
      <line key={cx} x1={cx - 5} y1={-4} x2={cx + 5} y2={-4} stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />
    ) : (
      <g key={cx}>
        <circle cx={cx} cy={-4} r={big ? 7.5 : 5} fill={OUT} />
        <circle cx={cx + 1.8} cy={-6} r={big ? 2.4 : 1.6} fill="#fff" />
      </g>
    );
  let mouth: React.ReactNode = null;
  switch (expr) {
    case "happy":
      mouth = <path d="M -11 8 Q 0 21 11 8" fill={OUT} />;
      break;
    case "wow":
      mouth = <ellipse cx={0} cy={13} rx={5.5} ry={7.5} fill={OUT} />;
      break;
    case "scared":
      mouth = <path d="M -11 14 q 2.75 -5 5.5 0 t 5.5 0 t 5.5 0 t 5.5 0" fill="none" stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />;
      break;
    case "sad":
      mouth = <path d="M -9 16 Q 0 7 9 16" fill="none" stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />;
      break;
    case "cool":
      mouth = <path d="M -8 11 Q 3 17 11 7" fill="none" stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />;
      break;
    case "dizzy":
      mouth = <path d="M -9 12 q 4.5 -5 9 0 t 9 0" fill="none" stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />;
      break;
    case "sleepy":
      mouth = <ellipse cx={0} cy={13} rx={4} ry={3 + 2.5 * Math.abs(Math.sin(t * 0.9))} fill={OUT} />;
      break;
    case "angry":
      mouth = <path d="M -8 14 L 8 14" stroke={OUT} strokeWidth={4} strokeLinecap="round" />;
      break;
    default:
      mouth = <path d="M -6 11 Q 0 14 6 11" fill="none" stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />;
  }
  return (
    <g transform={`translate(${ex},0)`}>
      {expr === "sad" || expr === "scared" ? (
        <g stroke={OUT} strokeWidth={3} strokeLinecap="round">
          <line x1={-16} y1={-16} x2={-6} y2={-19} />
          <line x1={16} y1={-16} x2={6} y2={-19} />
        </g>
      ) : null}
      {expr === "angry" ? (
        <g stroke={OUT} strokeWidth={3.5} strokeLinecap="round">
          <line x1={-16} y1={-18} x2={-5} y2={-13} />
          <line x1={16} y1={-18} x2={5} y2={-13} />
        </g>
      ) : null}
      {eye(-10)}
      {eye(10)}
      {mouth}
      {expr === "happy" ? (
        <>
          <circle cx={-17} cy={6} r={5} fill="#ff7a9a" opacity={0.45} />
          <circle cx={17} cy={6} r={5} fill="#ff7a9a" opacity={0.45} />
        </>
      ) : null}
    </g>
  );
};

const Stick: React.FC<{ a: Actor; t: number; stretch: number }> = ({ a, t, stretch }) => {
  const pose = a.pose2 && a.poseAt !== undefined && t >= a.poseAt ? a.pose2 : a.pose ?? "idle";
  const expr = a.expr2 && a.poseAt !== undefined && t >= a.poseAt ? a.expr2 : a.expr ?? "happy";
  const P = poseAt(pose, t + (hash(a.name ?? "x") % 100) / 37);
  const hip: [number, number] = [0, -88 + P.bob];
  const neck = seg(hip[0], hip[1], 180 + P.lean, 70);
  const sh = seg(hip[0], hip[1], 180 + P.lean, 56);
  const head = seg(neck[0], neck[1], 180 + P.lean + P.tilt * 0.3, 32);
  const limb = (o: [number, number], l: Limb, L: number, lean: number) => {
    const j = seg(o[0], o[1], l[0] + lean, L);
    const e = seg(j[0], j[1], l[0] + l[1] + lean, L);
    return `M ${o[0]} ${o[1]} L ${j[0]} ${j[1]} L ${e[0]} ${e[1]}`;
  };
  const la = limb(sh, P.la, 40, P.lean * 0.5);
  const ra = limb(sh, P.ra, 40, P.lean * 0.5);
  const ll = limb(hip, P.ll, 44, 0);
  const rl = limb(hip, P.rl, 44, 0);
  const torso = `M ${hip[0]} ${hip[1]} L ${neck[0]} ${neck[1]}`;
  const col = a.color ?? C.accent;
  const sx = 1 / (1 + stretch * 1.2);
  const sy = 1 + stretch * 1.7;
  const wob = stretch > 0 ? S(t * 9) * stretch * 6 : 0;
  const body = (w: number, c: string) => (
    <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d={ll} />
      <path d={rl} />
      <path d={torso} />
      <path d={la} />
      <path d={ra} />
    </g>
  );
  const scarfWave = S(t * 8) * 6;
  const tint = stretch > 0.2 ? `hue-rotate(${-stretch * 30}deg) saturate(${1 + stretch})` : undefined;
  return (
    <g transform={`translate(0, -110) scale(${sx}, ${sy}) translate(0, 110) rotate(${wob})`} style={{ filter: tint }}>
      {a.helmet ? (
        <rect x={sh[0] - 30} y={sh[1] - 4} width={26} height={52} rx={8} fill="#c9d3e0" stroke={OUT} strokeWidth={5} transform={`rotate(${P.lean} ${sh[0]} ${sh[1]})`} />
      ) : null}
      {body(15, OUT)}
      {body(8, "#ffffff")}
      <path
        d={`M ${neck[0] - 4} ${neck[1] + 4} q -18 ${4 + scarfWave} -36 ${scarfWave * 0.6} l 4 12 q 16 -2 34 -6 z`}
        fill={col}
        stroke={OUT}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <g transform={`translate(${head[0]}, ${head[1]}) rotate(${P.tilt})`}>
        <circle r={30} fill="#fff" stroke={OUT} strokeWidth={5} />
        <Face expr={expr} t={t + (hash(a.name ?? "y") % 10) / 7} look={a.flip ? -1 : 1} />
        {a.helmet ? (
          <>
            <circle r={44} fill="rgba(160,220,255,0.16)" stroke="rgba(215,240,255,0.95)" strokeWidth={4.5} />
            <path d="M -30 -20 A 36 36 0 0 1 -6 -38" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
            <circle r={44} fill="none" stroke={OUT} strokeWidth={1.5} opacity={0.6} />
          </>
        ) : null}
      </g>
      {a.sweat
        ? [0, 1, 2].map((k) => {
            const ph = (t * 1.3 + k / 3) % 1;
            const sx2 = head[0] + (k - 1) * 30 + (k === 1 ? 6 : 0);
            const sy2 = head[1] - 20 + ph * 70;
            return <path key={k} d={`M ${sx2} ${sy2 - 9} Q ${sx2 + 6} ${sy2} ${sx2} ${sy2 + 5} Q ${sx2 - 6} ${sy2} ${sx2} ${sy2 - 9} Z`} fill="#7ad7ff" stroke={OUT} strokeWidth={2} opacity={1 - ph} />;
          })
        : null}
    </g>
  );
};

/* ---------------- other actors ---------------- */

const StarObj: React.FC<{ a: Actor; t: number; size: number }> = ({ a, t, size }) => {
  const id = useId().replace(/:/g, "");
  const R = size / 2;
  const at = a.at ?? 2;
  const collapsing = a.mode === "collapse";
  const k = collapsing ? clamp01((t - at) / 0.6) : 0;
  const pulse = 1 + S(t * 3) * 0.04 + (collapsing ? S(t * 25) * 0.04 * clamp01((t - at + 1.5) / 1.5) : 0);
  const r = R * pulse * (1 - k * 0.97);
  const boom = collapsing ? clamp01((t - at - 0.45) / 1.6) : 0;
  return (
    <svg width={size * 4} height={size * 4} viewBox={`${-2 * size} ${-2 * size} ${4 * size} ${4 * size}`} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`s${id}`}>
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#fff1a8" />
          <stop offset="70%" stopColor="#ffa53a" />
          <stop offset="100%" stopColor="#ff5a1a" />
        </radialGradient>
        <radialGradient id={`g${id}`}>
          <stop offset="0%" stopColor="#ffbb55" stopOpacity={0.7} />
          <stop offset="100%" stopColor="#ff5a1a" stopOpacity={0} />
        </radialGradient>
      </defs>
      {r > 1 ? <circle r={r * 2.1} fill={`url(#g${id})`} /> : null}
      {r > 1
        ? Array.from({ length: 14 }, (_, i) => {
            const ang = (i / 14) * Math.PI * 2 + t * 0.4;
            const L = r * (1.25 + 0.15 * S(t * 4 + i));
            return <line key={i} x1={Math.cos(ang) * r * 1.02} y1={Math.sin(ang) * r * 1.02} x2={Math.cos(ang) * L} y2={Math.sin(ang) * L} stroke="#ffd27a" strokeWidth={r * 0.05} strokeLinecap="round" opacity={0.7} />;
          })
        : null}
      {r > 1 ? <circle r={r} fill={`url(#s${id})`} /> : null}
      {boom > 0 ? (
        <>
          <circle r={R * 0.3 + boom * R * 3.2} fill="none" stroke="#fff3c4" strokeWidth={R * 0.25 * (1 - boom)} opacity={1 - boom} />
          <circle r={R * 0.2 + boom * R * 2.2} fill="none" stroke="#7ad7ff" strokeWidth={R * 0.12 * (1 - boom)} opacity={1 - boom} />
        </>
      ) : null}
    </svg>
  );
};

const ClockObj: React.FC<{ a: Actor; t: number; size: number }> = ({ a, t, size }) => {
  const R = size / 2;
  const sp = a.speed ?? 0.25;
  const turns = a.slow ? sp * 2.2 * (1 - Math.exp(-t / 2.2)) : sp * t;
  const m = turns * 360;
  const h = m / 12;
  return (
    <svg width={size} height={size} viewBox={`${-R} ${-R} ${size} ${size}`} style={{ overflow: "visible" }}>
      <circle r={R * 0.96} fill="#fff" stroke={OUT} strokeWidth={R * 0.09} />
      {Array.from({ length: 12 }, (_, i) => {
        const an = (i / 12) * Math.PI * 2;
        return <line key={i} x1={Math.sin(an) * R * 0.7} y1={-Math.cos(an) * R * 0.7} x2={Math.sin(an) * R * 0.82} y2={-Math.cos(an) * R * 0.82} stroke={OUT} strokeWidth={R * 0.06} strokeLinecap="round" />;
      })}
      <line x1={0} y1={0} x2={Math.sin((h * Math.PI) / 180) * R * 0.42} y2={-Math.cos((h * Math.PI) / 180) * R * 0.42} stroke={OUT} strokeWidth={R * 0.09} strokeLinecap="round" />
      <line x1={0} y1={0} x2={Math.sin((m * Math.PI) / 180) * R * 0.66} y2={-Math.cos((m * Math.PI) / 180) * R * 0.66} stroke="#e63946" strokeWidth={R * 0.06} strokeLinecap="round" />
      <circle r={R * 0.07} fill={OUT} />
    </svg>
  );
};

const RippleObj: React.FC<{ a: Actor; t: number; size: number }> = ({ a, t, size }) => {
  const R = size / 2;
  const at = a.at ?? 3;
  const merged = a.merge ? t >= at : true;
  const k = a.merge ? clamp01(t / at) : 1;
  const orbit = R * 0.28 * (1 - k * k) + 2;
  const ang = a.merge ? 18 * (1 - Math.pow(1 - k, 0.35)) * 6.28 * 1.6 : 0;
  const rings = Array.from({ length: 6 }, (_, i) => ((t * 0.7 + i / 6) % 1));
  return (
    <svg width={size} height={size} viewBox={`${-R} ${-R} ${size} ${size}`} style={{ overflow: "visible" }}>
      {rings.map((p, i) => (
        <circle key={i} r={R * 0.1 + p * R * 0.9} fill="none" stroke="#7ad7ff" strokeWidth={R * 0.025 * (1 - p) + 1} opacity={(1 - p) * (a.merge && !merged ? 0.25 + 0.5 * k : 0.8)} />
      ))}
      {a.merge && !merged ? (
        <>
          <circle cx={Math.cos(ang) * orbit} cy={Math.sin(ang) * orbit * 0.5} r={R * 0.07} fill="#000" stroke="#ffb347" strokeWidth={R * 0.02} />
          <circle cx={-Math.cos(ang) * orbit} cy={-Math.sin(ang) * orbit * 0.5} r={R * 0.06} fill="#000" stroke="#ffb347" strokeWidth={R * 0.02} />
        </>
      ) : (
        <circle r={R * 0.1} fill="#000" stroke="#ffd27a" strokeWidth={R * 0.025} />
      )}
      {a.merge ? <circle r={R * clamp01((t - at) / 0.5) * 0.8} fill="#fff" opacity={t >= at ? clamp01(1 - (t - at) / 0.5) * 0.9 : 0} /> : null}
    </svg>
  );
};

const Bubble: React.FC<{ text: string; tag?: boolean }> = ({ text, tag }) => (
  <div
    style={{
      position: "relative",
      padding: tag ? "10px 26px" : "18px 32px",
      background: tag ? C.accent : "#fff",
      color: OUT,
      borderRadius: tag ? 14 : 30,
      border: `5px solid ${OUT}`,
      fontFamily: tag ? FONT_DISPLAY : FONT_DISPLAY,
      fontSize: tag ? 40 : 50,
      lineHeight: 1.1,
      whiteSpace: "nowrap",
      boxShadow: "0 12px 24px rgba(0,0,0,0.45)",
    }}
  >
    {text}
    {!tag ? (
      <div style={{ position: "absolute", left: 40, bottom: -26, width: 0, height: 0, borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderTop: `26px solid ${OUT}` }}>
        <div style={{ position: "absolute", left: -11, top: -33, borderLeft: "11px solid transparent", borderRight: "11px solid transparent", borderTop: "17px solid #fff" }} />
      </div>
    ) : null}
  </div>
);

/* ---------------- actor wrapper ---------------- */

const ActorView: React.FC<{ a: Actor; i: number }> = ({ a, i }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const dur = durationInFrames / fps;
  const delay = a.delay ?? 0;
  const lt = t - delay;
  if (lt < 0) return null;
  const [m0, m1] = a.move ?? [delay, dur];
  const k = EASE[a.ease ?? "inout"](clamp01((t - m0) / Math.max(0.01, m1 - m0)));
  const x = a.to ? a.x + (a.to[0] - a.x) * k : a.x;
  let y = a.to ? a.y + (a.to[1] - a.y) * k : a.y;
  const pop = a.kind === "bh" || a.kind === "beam" ? 1 : spring({ frame: lt * fps, fps, config: { damping: 11, stiffness: 140 } });
  const van = a.vanish !== undefined ? 1 - clamp01((t - a.vanish) / 0.5) : 1;
  let scale = (1 + ((a.scaleTo ?? 1) - 1) * k) * pop * van;
  let rot = (a.rot ?? 0) + (a.spin ?? 0) * lt;
  if (a.anim === "float") y += S(t * 1.6 + i) * 0.9;
  if (a.anim === "shake") rot += S(t * 30) * 7;
  if (a.anim === "pulse") scale *= 1 + S(t * 5) * 0.06;
  const size = a.size ?? (a.kind === "stick" ? 300 : a.kind === "bh" ? 160 : 220);
  let inner: React.ReactNode = null;
  let anchor = "translate(-50%, -50%)";
  switch (a.kind) {
    case "stick": {
      const st = a.stretch ? a.stretch[0] + (a.stretch[1] - a.stretch[0]) * k : 0;
      const sc = size / 230;
      inner = (
        <div style={{ position: "relative" }}>
          {a.name ? (
            <div style={{ position: "absolute", left: "50%", bottom: size + 16, transform: "translateX(-50%)", fontFamily: FONT_DISPLAY, fontSize: Math.max(30, size * 0.12), color: a.color ?? C.accent, whiteSpace: "nowrap", textShadow: "0 3px 10px rgba(0,0,0,0.9)" }}>
              {a.name}
            </div>
          ) : null}
          <svg width={size} height={size} viewBox="-115 -230 230 230" style={{ overflow: "visible", display: "block", filter: "drop-shadow(0 14px 16px rgba(0,0,0,0.45))" }}>
            <g transform={`scale(${a.flip ? -1 : 1}, 1)`}>
              <Stick a={a} t={t} stretch={st} />
            </g>
          </svg>
        </div>
      );
      anchor = "translate(-50%, -100%)";
      void sc;
      break;
    }
    case "bh":
      inner = <BlackHole R={size} t={t} tilt={a.rot ?? -10} />;
      rot = a.spin ? (a.spin ?? 0) * lt : 0;
      break;
    case "star":
      inner = <StarObj a={a} t={lt} size={size} />;
      break;
    case "clock":
      inner = <ClockObj a={a} t={lt} size={size} />;
      break;
    case "ripple":
      inner = <RippleObj a={a} t={lt} size={size} />;
      break;
    case "emoji":
      inner = <img src={emojiUrl(a.emoji ?? "⭐")} style={{ width: size, height: size, display: "block", filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.5))" }} />;
      break;
    case "bubble":
      inner = <Bubble text={a.text ?? ""} />;
      anchor = "translate(-20%, -100%)";
      break;
    case "tag":
      inner = <Bubble text={a.text ?? ""} tag />;
      break;
    case "arrow": {
      const tx = a.to ? ((a.to[0] - a.x) / 100) * W : 200;
      const ty = a.to ? ((a.to[1] - a.y) / 100) * H : 0;
      const g = clamp01(lt / 0.6);
      const L = Math.hypot(tx, ty) * g;
      const ang = (Math.atan2(ty, tx) * 180) / Math.PI;
      const col = a.color ?? "#ff4d6d";
      const th = (a.size ?? 22) as number;
      return (
        <div style={{ position: "absolute", left: `${a.x}%`, top: `${a.y}%`, transform: `rotate(${ang}deg)`, transformOrigin: "0 0", opacity: a.opacity ?? 1 }}>
          <div style={{ position: "absolute", left: 0, top: -th / 2, width: Math.max(0, L - th * 1.6), height: th, background: col, borderRadius: th, boxShadow: "0 6px 14px rgba(0,0,0,0.4)", border: `4px solid ${OUT}` }} />
          <div style={{ position: "absolute", left: Math.max(0, L - th * 2.2), top: -th * 1.5, width: 0, height: 0, borderTop: `${th * 1.5}px solid transparent`, borderBottom: `${th * 1.5}px solid transparent`, borderLeft: `${th * 2.2}px solid ${col}` }} />
          {a.text ? (
            <div style={{ position: "absolute", left: L / 2, top: th + 10, transform: `translateX(-50%) rotate(${-ang}deg)`, fontFamily: FONT_DISPLAY, fontSize: 40, color: col, whiteSpace: "nowrap", textShadow: "0 3px 10px rgba(0,0,0,0.9)", opacity: g }}>
              {a.text}
            </div>
          ) : null}
        </div>
      );
    }
    case "beam": {
      const g = clamp01(lt / 0.8);
      return (
        <div style={{ position: "absolute", left: `${a.x}%`, top: `${a.y}%`, width: (a.size ?? 900) * g, height: 10, transform: `rotate(${a.rot ?? 0}deg)`, transformOrigin: "0 50%", background: `linear-gradient(90deg, ${a.color ?? "#fff6c4"}, transparent)`, boxShadow: `0 0 30px ${a.color ?? "#fff6c4"}`, borderRadius: 10 }} />
      );
    }
  }
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `${anchor} scale(${scale}) rotate(${rot}deg)`,
        transformOrigin: a.kind === "stick" ? "50% 100%" : "50% 50%",
        opacity: a.opacity ?? 1,
      }}
    >
      {inner}
    </div>
  );
};

export const ActorLayer: React.FC<{ actors?: Actor[] }> = ({ actors }) => (
  <>
    {(actors ?? []).map((a, i) => (
      <ActorView key={i} a={a} i={i} />
    ))}
  </>
);

/* ---------------- full scene ---------------- */

export const CartoonBackdrop: React.FC<{ bg?: CartoonBg; seed?: string; chalk?: string[]; bh?: CartoonScene["bh"]; focus?: [number, number] }> = ({ bg = "space", seed = "s", chalk, bh, focus }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (bg.startsWith("land:")) return <Landscape env={bg.slice(5) as Env} seed={seed} />;
  switch (bg) {
    case "warp":
      return <WarpBg seed={seed} t={t} cx={focus?.[0] ?? 50} cy={focus?.[1] ?? 50} />;
    case "chalk":
      return <ChalkBg t={t} lines={chalk} />;
    case "earth":
      return <EarthBg seed={seed} t={t} />;
    case "room":
    case "room-day":
      return <RoomBg t={t} day={bg === "room-day"} seed={seed} />;
    case "void":
      return <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #120a1e, #000 70%)" }} />;
    case "blackhole":
      return (
        <AbsoluteFill>
          <SpaceBg seed={seed} t={t} />
          <div style={{ position: "absolute", left: `${bh?.x ?? 50}%`, top: `${bh?.y ?? 52}%`, transform: "translate(-50%, -50%)" }}>
            <BlackHole R={bh?.size ?? 200} t={t} tilt={bh?.tilt ?? -10} />
          </div>
        </AbsoluteFill>
      );
    default:
      return <SpaceBg seed={seed} t={t} />;
  }
};

export const CartoonFx: React.FC<{ fx?: CartoonScene["fx"]; flashAt?: number; focus?: [number, number] }> = ({ fx = [], flashAt = 1, focus }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const prog = frame / durationInFrames;
  const r = rng("speed" + Math.floor(frame / 2));
  return (
    <>
      {fx.includes("einstein") ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => {
            const cx = ((focus?.[0] ?? 50) / 100) * W;
            const cy = ((focus?.[1] ?? 50) / 100) * H;
            const rr = 260 + i * 55;
            const a0 = t * (0.3 + i * 0.05) + i;
            const len = 0.5 + 0.3 * S(t + i);
            const x1 = cx + Math.cos(a0) * rr;
            const y1 = cy + Math.sin(a0) * rr;
            const x2 = cx + Math.cos(a0 + len) * rr;
            const y2 = cy + Math.sin(a0 + len) * rr;
            return <path key={i} d={`M ${x1} ${y1} A ${rr} ${rr} 0 0 1 ${x2} ${y2}`} stroke={i % 2 ? "#bfe3ff" : "#fff"} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.75} />;
          })}
        </svg>
      ) : null}
      {fx.includes("speedlines") ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
          {Array.from({ length: 40 }, (_, i) => {
            const a = r() * Math.PI * 2;
            const r1 = 520 + r() * 200;
            const cx = ((focus?.[0] ?? 50) / 100) * W;
            const cy = ((focus?.[1] ?? 50) / 100) * H;
            return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * 1500} y2={cy + Math.sin(a) * 1500} stroke="#fff" strokeWidth={2 + r() * 6} />;
          })}
        </svg>
      ) : null}
      {fx.includes("heat") ? (
        <>
          <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(255,120,30,0.38), rgba(255,170,60,0.08) 60%, rgba(255,80,0,0.2))", opacity: 0.8 + 0.2 * S(t * 2) }} />
          <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
            {Array.from({ length: 14 }, (_, i) => {
              const x0 = ((i * 137) % 100) / 100 * W;
              const ph = (t * 0.25 + i / 14) % 1;
              const y0 = H * (1.05 - ph * 0.9);
              return <path key={i} d={`M ${x0} ${y0} q 20 -40 0 -80 t 0 -80 t 0 -80`} fill="none" stroke="#fff3d0" strokeWidth={5} strokeLinecap="round" opacity={Math.sin(ph * Math.PI)} />;
            })}
          </svg>
        </>
      ) : null}
      {fx.includes("snow") ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 90 }, (_, i) => {
            const rr = rng("snow" + i);
            const x0 = rr() * W;
            const sp = 60 + rr() * 120;
            const y0 = ((rr() * H + t * sp) % (H + 40)) - 20;
            return <circle key={i} cx={x0 + S(t + i) * 20} cy={y0} r={2 + rr() * 5} fill="#fff" opacity={0.8} />;
          })}
        </svg>
      ) : null}
      {fx.includes("redshift") ? (
        <AbsoluteFill style={{ background: "#ff1e00", mixBlendMode: "multiply", opacity: prog * 0.55 }} />
      ) : null}
      {fx.includes("flash") ? (
        <AbsoluteFill style={{ background: "#fff", opacity: interpolate(t, [flashAt - 0.08, flashAt, flashAt + 0.5], [0, 0.95, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      ) : null}
      {fx.includes("glitch") && frame % 23 < 2 ? (
        <AbsoluteFill style={{ background: "rgba(122,215,255,0.12)", transform: `translateX(${(r() - 0.5) * 30}px)` }} />
      ) : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
    </>
  );
};

export const Camera: React.FC<{ cam?: CartoonScene["camera"]; children: React.ReactNode }> = ({ cam, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const k = Easing.inOut(Easing.cubic)(clamp01(frame / durationInFrames));
  const z = cam?.zoom ? cam.zoom[0] + (cam.zoom[1] - cam.zoom[0]) * k : 1 + 0.05 * k;
  const f = cam?.focus ?? [50, 50];
  const pan = cam?.pan ? [cam.pan[0] * k, cam.pan[1] * k] : [0, 0];
  const shOn = cam?.shake ? (cam.shakeAt === undefined ? 1 : clamp01((t - cam.shakeAt) * 3)) : 0;
  const sh = (cam?.shake ?? 0) * shOn;
  const dx = noise2D("cx", t * 6, 0) * sh;
  const dy = noise2D("cy", 0, t * 6) * sh;
  return (
    <AbsoluteFill style={{ transform: `translate(${dx - pan[0]}px, ${dy - pan[1]}px) scale(${z})`, transformOrigin: `${f[0]}% ${f[1]}%` }}>
      {children}
    </AbsoluteFill>
  );
};

export const Cartoon: React.FC<{ s: CartoonScene }> = ({ s }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <Camera cam={s.camera}>
      <CartoonBackdrop bg={s.bg} seed={s.seed} chalk={s.chalk} bh={s.bh} focus={s.camera?.focus} />
      <ActorLayer actors={s.actors} />
    </Camera>
    <CartoonFx fx={s.fx} flashAt={s.flashAt} focus={s.camera?.focus ?? (s.bh ? [s.bh.x, s.bh.y] : undefined)} />
  </AbsoluteFill>
);
