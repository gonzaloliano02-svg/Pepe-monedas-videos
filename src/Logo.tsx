import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { C, FONT_DISPLAY, loadFonts } from "./theme";

// Channel logos for YouTube/TikTok avatars (circular crop).
// A: yellow badge, stacked wordmark, ruler ticks, tiny person for scale.
// B: black badge, hazard-tape ring, big "EB" monogram over a ruler.

const Person: React.FC<{ h: number; color: string }> = ({ h, color }) => (
  <svg width={h * 0.42} height={h} viewBox="0 0 42 100">
    <circle cx="21" cy="11" r="10" fill={color} />
    <rect x="9" y="24" width="24" height="38" rx="11" fill={color} />
    <rect x="11" y="56" width="8" height="44" rx="4" fill={color} />
    <rect x="23" y="56" width="8" height="44" rx="4" fill={color} />
  </svg>
);

const Ruler: React.FC<{ len: number; color: string; vertical?: boolean; count?: number }> = ({
  len,
  color,
  vertical,
  count = 20,
}) => (
  <div
    style={{
      position: "relative",
      width: vertical ? 60 : len,
      height: vertical ? len : 60,
    }}
  >
    {Array.from({ length: count + 1 }).map((_, i) => {
      const major = i % 5 === 0;
      const t = (i / count) * len;
      const size = major ? 56 : 28;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            background: color,
            borderRadius: 3,
            ...(vertical
              ? { top: t - 4, left: 0, width: size, height: 8 }
              : { left: t - 4, top: 0, width: 8, height: size }),
          }}
        />
      );
    })}
  </div>
);

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loadFonts().then(() => continueRender(h));
  }, [h]);
};

export const LogoA: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: C.accent, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, marginLeft: -10, transform: "scale(1.12)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <Ruler len={470} color={C.bg} vertical />
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            color: C.bg,
            fontSize: 150,
            lineHeight: 0.86,
            letterSpacing: -6,
            textTransform: "uppercase",
          }}
        >
          <div>Escala</div>
          <div style={{ fontSize: 172 }}>Brutal</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 26 }}>
            <Person h={78} color={C.bg} />
            <div style={{ height: 10, width: 330, background: C.bg, borderRadius: 5, marginBottom: 4 }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const LogoB: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: "center", alignItems: "center" }}>
      {/* hazard-tape ring */}
      <div
        style={{
          position: "absolute",
          inset: 40,
          borderRadius: "50%",
          background: `repeating-linear-gradient(-45deg, ${C.accent} 0 46px, ${C.bg} 46px 92px)`,
        }}
      />
      <div style={{ position: "absolute", inset: 118, borderRadius: "50%", background: C.bg }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            color: C.accent,
            fontSize: 380,
            lineHeight: 0.85,
            letterSpacing: -4,
          }}
        >
          EB
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 22, marginTop: 30 }}>
          <Person h={92} color={C.accent} />
          <Ruler len={360} color={C.ink} count={16} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
