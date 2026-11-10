import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Series,
  continueRender,
  delayRender,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { C, FONT_BODY, FONT_MONO, loadFonts } from "./theme";
import type { Episode, Scene } from "./types";
import { CompareScene, HookScene, OutroScene, StatScene } from "./scenes";

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const dots = new Array(40).fill(0).map((_, i) => ({
    x: random(`x${i}`) * width,
    y: (random(`y${i}`) * height + frame * (0.3 + random(`s${i}`))) % height,
    r: 1 + random(`r${i}`) * 3,
  }));
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 35%, ${C.bg2} 0%, ${C.bg} 70%)`,
      }}
    >
      {/* measuring grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.ink}0A 2px, transparent 2px), linear-gradient(90deg, ${C.ink}0A 2px, transparent 2px)`,
          backgroundSize: "90px 90px",
        }}
      />
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y,
            width: d.r * 2,
            height: d.r * 2,
            borderRadius: "50%",
            background: C.ink,
            opacity: 0.18,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const Brand: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 110,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: 34,
        letterSpacing: 6,
        color: C.bg,
        padding: "10px 26px",
        background: `repeating-linear-gradient(-45deg, ${C.accent} 0 22px, #E8C200 22px 44px)`,
        borderRadius: 8,
      }}
    >
      ESCALA BRUTAL
    </div>
  </div>
);

// Word-by-word captions, timed proportionally to word length.
const Captions: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const words = text.replace(/\*/g, "").split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const speechEnd = durationInFrames * 0.92;
  let acc = 0;
  const starts = weights.map((w) => {
    const s = (acc / total) * speechEnd;
    acc += w;
    return s;
  });
  let current = 0;
  for (let i = 0; i < words.length; i++) if (frame >= starts[i]) current = i;
  const chunk = 4;
  const chunkStart = Math.floor(current / chunk) * chunk;
  const shown = words.slice(chunkStart, chunkStart + chunk);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 250,
        left: 60,
        right: 60,
        textAlign: "center",
        fontFamily: FONT_BODY,
        fontSize: 58,
        lineHeight: 1.2,
        textShadow: "0 4px 20px #000, 0 0 4px #000",
      }}
    >
      {shown.map((w, i) => (
        <span
          key={chunkStart + i}
          style={{
            color: chunkStart + i === current ? C.accent : C.ink,
            marginRight: 16,
          }}
        >
          {w}
        </span>
      ))}
    </div>
  );
};

const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 6, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const body =
    scene.type === "hook" ? (
      <HookScene scene={scene} />
    ) : scene.type === "compare" ? (
      <CompareScene scene={scene} />
    ) : scene.type === "stat" ? (
      <StatScene scene={scene} />
    ) : (
      <OutroScene scene={scene} />
    );
  const showCaptions = scene.type === "compare" || scene.type === "stat";
  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {body}
      {showCaptions ? <Captions text={scene.narration} /> : null}
      {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
    </AbsoluteFill>
  );
};

export const Short: React.FC<Episode> = (ep) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loadFonts().then(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill style={{ background: C.bg, color: C.ink }}>
      <Background />
      <Series>
        {ep.scenes.map((s, i) => (
          <Series.Sequence key={i} durationInFrames={s.durationInFrames ?? 90}>
            <SceneView scene={s} />
          </Series.Sequence>
        ))}
      </Series>
      <Brand />
      {ep.music ? <Audio src={staticFile(ep.music)} volume={0.13} /> : null}
    </AbsoluteFill>
  );
};
