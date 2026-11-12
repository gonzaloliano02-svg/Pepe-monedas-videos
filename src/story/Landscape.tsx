import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

// Procedural illustrated backgrounds for the 2D long-form videos.
// Flat "painted" look: sky gradient, 3-4 silhouette layers with
// atmospheric perspective, parallax drift and a paper-grain overlay.
export type Env =
  | "mountains"
  | "sea"
  | "desert"
  | "city"
  | "forest"
  | "volcano"
  | "ice"
  | "space"
  | "night"
  | "storm";

type Palette = { sky: [string, string]; layers: string[]; sun?: string; sunY?: number };

const PAL: Record<Env, Palette> = {
  mountains: { sky: ["#f6c58b", "#9fc5e0"], layers: ["#8aa1b8", "#6b829b", "#4c6079", "#2f3d52"], sun: "#fff3d1", sunY: 0.32 },
  sea: { sky: ["#ffd29a", "#7fb6d9"], layers: ["#4f8db5", "#3a729a", "#285978", "#1a4058"], sun: "#fff1c8", sunY: 0.38 },
  desert: { sky: ["#ffcf7a", "#f08a4b"], layers: ["#e9a35d", "#d98a47", "#c27238", "#8f4f26"], sun: "#fff4c2", sunY: 0.3 },
  city: { sky: ["#ffb98a", "#5c6fa8"], layers: ["#6c79a8", "#4f5a88", "#353e66", "#1f2544"], sun: "#ffe0b0", sunY: 0.45 },
  forest: { sky: ["#e7f0c8", "#8cc0a6"], layers: ["#6da383", "#4e8566", "#356a4d", "#1f4632"], sun: "#fffbe0", sunY: 0.28 },
  volcano: { sky: ["#ff7a45", "#3b1d2e"], layers: ["#6a3a3f", "#4d2a31", "#341c24", "#1d1016"], sun: "#ffb347", sunY: 0.5 },
  ice: { sky: ["#e9f6ff", "#a8cfe8"], layers: ["#d6e9f5", "#b7d4e8", "#93b9d4", "#6f99b8"], sun: "#ffffff", sunY: 0.25 },
  space: { sky: ["#0b0f2a", "#02030a"], layers: ["#1a2047", "#141936", "#0e1226", "#080b18"], sun: "#9fd3ff", sunY: 0.35 },
  night: { sky: ["#2a3570", "#0b1030"], layers: ["#2b3366", "#20275049", "#171d3c", "#0d1128"], sun: "#f4f1d0", sunY: 0.22 },
  storm: { sky: ["#8a93a3", "#3a4250"], layers: ["#5b6574", "#47505e", "#353d49", "#232a33"], sun: "#c9d2dc", sunY: 0.3 },
};

const ridge = (seed: string, w: number, base: number, amp: number, freq: number, jag: number, off: number) => {
  const pts: string[] = [];
  const step = 20;
  for (let x = -40; x <= w + 40; x += step) {
    const n = noise2D(seed, (x + off) * freq, 0) * 0.75 + noise2D(seed + "j", (x + off) * freq * 4, 1) * jag;
    pts.push(`${x},${base - amp * (0.5 + n * 0.6)}`);
  }
  return `M-40,1200 L${pts.join(" L")} L${w + 40},1200 Z`;
};

const Stars: React.FC<{ n: number; frame: number }> = ({ n, frame }) => {
  const stars = useMemo(
    () =>
      Array.from({ length: n }).map((_, i) => ({
        x: Math.abs(Math.sin(i * 12.9898) * 43758.5) % 1,
        y: Math.abs(Math.sin(i * 78.233) * 12345.6) % 1,
        r: 0.6 + (Math.abs(Math.sin(i * 3.1)) % 1) * 1.8,
      })),
    [n],
  );
  return (
    <>
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x * 1920}
          cy={s.y * 700}
          r={s.r}
          fill="#fff"
          opacity={0.4 + 0.5 * Math.abs(Math.sin(frame / 20 + i))}
        />
      ))}
    </>
  );
};

export const Landscape: React.FC<{ env: Env; seed?: string; drift?: number }> = ({
  env,
  seed = "a",
  drift = 1,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const p = PAL[env];
  const t = frame / Math.max(durationInFrames, 1);
  const layers = p.layers;
  // per-layer: base height, amplitude, frequency, jaggedness, parallax speed
  const spec =
    env === "sea" || env === "storm"
      ? [
          [640, 60, 0.002, 0.05, 20],
          [760, 30, 0.006, 0.1, 50],
          [860, 26, 0.008, 0.12, 90],
          [980, 24, 0.01, 0.15, 140],
        ]
      : env === "desert"
        ? [
            [620, 120, 0.0015, 0.02, 15],
            [740, 140, 0.002, 0.03, 35],
            [860, 120, 0.0025, 0.03, 70],
            [1000, 110, 0.003, 0.04, 120],
          ]
        : env === "city"
          ? [
              [700, 220, 0.004, 0.0, 15],
              [800, 260, 0.004, 0.0, 35],
              [900, 300, 0.004, 0.0, 70],
              [1040, 120, 0.003, 0.05, 120],
            ]
          : [
              [560, 260, 0.0018, 0.18, 15],
              [700, 220, 0.0022, 0.22, 35],
              [840, 180, 0.003, 0.25, 70],
              [1000, 140, 0.004, 0.3, 120],
            ];
  const wave = env === "sea" || env === "storm";
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`sky-${env}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sky[1]} />
            <stop offset="0.75" stopColor={p.sky[0]} />
          </linearGradient>
          <radialGradient id={`sun-${env}`}>
            <stop offset="0" stopColor={p.sun} stopOpacity="1" />
            <stop offset="0.25" stopColor={p.sun} stopOpacity="0.9" />
            <stop offset="1" stopColor={p.sun} stopOpacity="0" />
          </radialGradient>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.08" />
            </feComponentTransfer>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill={`url(#sky-${env})`} />
        {env === "space" || env === "night" ? <Stars n={env === "space" ? 220 : 120} frame={frame} /> : null}
        {p.sun ? (
          <circle
            cx={1250 - t * 60 * drift}
            cy={(p.sunY ?? 0.3) * 1080}
            r={env === "space" ? 160 : 230}
            fill={`url(#sun-${env})`}
          />
        ) : null}
        {["mountains", "sea", "desert", "forest", "ice", "city", "storm"].includes(env) ? (
          // soft drifting clouds + a few birds so the sky never feels empty
          <g opacity={env === "storm" ? 0.9 : 0.75}>
            {Array.from({ length: 6 }).map((_, k) => {
              const cx = ((k * 410 + frame * (0.4 + (k % 3) * 0.25) * drift + Math.abs(noise2D(seed + "c", k, 0)) * 300) % 2400) - 240;
              const cy = 120 + (k % 3) * 90 + noise2D(seed + "cy", k, 1) * 40;
              const sc = 0.8 + (k % 3) * 0.35;
              const col = env === "storm" ? "#59616d" : env === "desert" ? "#ffe6c2" : "#ffffff";
              return (
                <g key={k} transform={`translate(${cx},${cy}) scale(${sc})`} opacity={0.55 + (k % 2) * 0.25}>
                  <ellipse cx="0" cy="0" rx="120" ry="34" fill={col} />
                  <ellipse cx="-50" cy="-18" rx="60" ry="40" fill={col} />
                  <ellipse cx="35" cy="-26" rx="72" ry="48" fill={col} />
                </g>
              );
            })}
            {env !== "storm" && env !== "ice"
              ? Array.from({ length: 5 }).map((_, k) => {
                  const bx = ((k * 260 + frame * 2.2) % 2300) - 200;
                  const by = 260 + k * 22 + Math.sin(frame / 10 + k) * 8;
                  const flap = Math.sin(frame / 3 + k) * 8;
                  return (
                    <path key={"b" + k} d={`M${bx - 14},${by + flap} Q${bx - 6},${by - 6} ${bx},${by} Q${bx + 6},${by - 6} ${bx + 14},${by + flap}`} stroke="#2b2b2b" strokeWidth="3" fill="none" opacity="0.55" />
                  );
                })
              : null}
          </g>
        ) : null}
        {env === "volcano" ? (
          <>
            {/* volcano cone + glow + smoke */}
            <path d="M560,760 L860,330 L990,330 L1300,760 Z" fill="#2a161c" />
            <ellipse cx="925" cy="330" rx="80" ry="18" fill="#ff7a2e" opacity={0.8 + 0.2 * Math.sin(frame / 6)} />
            {Array.from({ length: 10 }).map((_, i) => {
              const k = ((frame * 0.6 + i * 40) % 400) / 400;
              return (
                <circle
                  key={i}
                  cx={925 + Math.sin(i * 2 + frame / 30) * 60 * k + k * 120}
                  cy={320 - k * 330}
                  r={40 + k * 110}
                  fill="#3b2a30"
                  opacity={0.55 * (1 - k)}
                />
              );
            })}
          </>
        ) : null}
        {layers.map((c, i) => {
          const [base, amp, freq, jag, speed] = spec[i];
          const off = t * speed * drift * 6;
          if (env === "city" && i < 3) {
            // skyline blocks
            const n = 26 - i * 4;
            const bw = 1920 / n;
            return (
              <g key={i} transform={`translate(${-off % bw},0)`}>
                {Array.from({ length: n + 2 }).map((_, k) => {
                  const hh = amp * (0.35 + Math.abs(noise2D(seed + i, k * 0.7, i)) * 1.3);
                  return (
                    <g key={k}>
                      <rect x={k * bw} y={base - hh} width={bw * 0.86} height={hh + 400} fill={c} />
                      {i === 2
                        ? Array.from({ length: Math.floor(hh / 34) }).map((__, r) => (
                            <rect
                              key={r}
                              x={k * bw + 10}
                              y={base - hh + 14 + r * 34}
                              width={bw * 0.86 - 20}
                              height={8}
                              fill="#ffd27a"
                              opacity={noise2D(seed + "w", k, r) > 0.1 ? 0.55 : 0.08}
                            />
                          ))
                        : null}
                    </g>
                  );
                })}
              </g>
            );
          }
          const d = wave
            ? (() => {
                const pts: string[] = [];
                for (let x = -40; x <= 1960; x += 20) {
                  const y = base - amp * Math.sin((x + off * 3) * freq * 6 + frame * 0.05 * (i + 1)) - amp * 0.5 * noise2D(seed + i, x * freq, frame * 0.01);
                  pts.push(`${x},${y}`);
                }
                return `M-40,1200 L${pts.join(" L")} L1960,1200 Z`;
              })()
            : ridge(seed + i, 1920, base, amp, freq, jag, off);
          return <path key={i} d={d} fill={c} />;
        })}
        {env === "forest"
          ? Array.from({ length: 22 }).map((_, k) => {
              const x = ((k * 97 - t * 140 * drift) % 2100) - 90;
              const s = 0.7 + Math.abs(noise2D(seed + "t", k, 0)) * 0.8;
              return (
                <g key={k} transform={`translate(${x},${1000}) scale(${s})`}>
                  <rect x="-8" y="-40" width="16" height="60" fill="#3b2a1e" />
                  <path d="M0,-260 L70,-40 L-70,-40 Z" fill="#183a28" />
                  <path d="M0,-320 L55,-150 L-55,-150 Z" fill="#1f4a33" />
                </g>
              );
            })
          : null}
        {env === "ice"
          ? Array.from({ length: 40 }).map((_, k) => {
              const y = ((frame * (1 + (k % 3)) + k * 61) % 1100) - 20;
              return <circle key={k} cx={(k * 173) % 1920} cy={y} r={2 + (k % 3)} fill="#fff" opacity={0.8} />;
            })
          : null}
        {env === "storm"
          ? Array.from({ length: 70 }).map((_, k) => {
              const y = ((frame * 22 + k * 97) % 1200) - 100;
              const x = (k * 137 + frame * 4) % 1980;
              return <line key={k} x1={x} y1={y} x2={x - 10} y2={y + 40} stroke="#dfe7f2" strokeWidth="2" opacity="0.5" />;
            })
          : null}
        <rect width="1920" height="1080" filter="url(#grain)" />
        {/* vignette */}
        <rect width="1920" height="1080" fill="url(#vig)" />
        <defs>
          <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.45" />
          </radialGradient>
        </defs>
      </svg>
    </AbsoluteFill>
  );
};
