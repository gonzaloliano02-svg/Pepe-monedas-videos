import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Series,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO, loadFonts } from "./theme";
import { Scale3D } from "./three/Scale3D";
import type { SubjectKind } from "./three/subjects";

export type DocScene = {
  type: "clip" | "scale3d";
  narration: string;
  audio?: string;
  durationInFrames?: number;
  // big headline on screen ("16 METROS"). *word* = highlighted.
  stamp?: string;
  // clip
  src?: string; // file under public/
  startFrom?: number; // seconds into the clip
  fit?: "cover" | "contain"; // contain = whole landscape clip over a blurred fill
  // scale3d
  subject?: SubjectKind;
  size?: number;
  env?: "ocean" | "land" | "space";
  color?: string;
};

export type DocEpisode = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  credits?: string[];
  scenes: DocScene[];
  music?: string;
};

const Clip: React.FC<{ scene: DocScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const p = frame / durationInFrames;
  // slow push-in with a slight 3D tilt
  const scale = 1.08 + p * 0.1;
  const rot = interpolate(p, [0, 1], [-2.5, 2.5]);
  return (
    <AbsoluteFill style={{ perspective: 1400, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) rotateY(${rot}deg) rotateX(${-rot / 2}deg)`,
        }}
      >
        {scene.fit === "contain" ? (
          <>
            <OffthreadVideo
              src={staticFile(scene.src!)}
              muted
              startFrom={Math.round((scene.startFrom ?? 0) * fps)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "blur(40px) brightness(0.55) saturate(1.2)",
                transform: "scale(1.15)",
              }}
            />
            <OffthreadVideo
              src={staticFile(scene.src!)}
              muted
              startFrom={Math.round((scene.startFrom ?? 0) * fps)}
              style={{
                position: "absolute",
                left: 0,
                width: "100%",
                top: "50%",
                transform: "translateY(-50%) scale(1.35)",
                filter: "contrast(1.12) saturate(1.15) brightness(0.92)",
              }}
            />
          </>
        ) : (
        <OffthreadVideo
          src={staticFile(scene.src!)}
          muted
          startFrom={Math.round((scene.startFrom ?? 0) * fps)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.12) saturate(1.15) brightness(0.92)",
          }}
        />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Stamp: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 4, fps, config: { damping: 11, stiffness: 140 } });
  const words = text.split(" ");
  let inHi = false;
  return (
    <div
      style={{
        position: "absolute",
        top: 300,
        left: 60,
        right: 60,
        textAlign: "center",
        fontFamily: FONT_DISPLAY,
        fontSize: Math.min(
          text.length > 22 ? 104 : 140,
          Math.floor(930 / (Math.max(...words.map((w) => w.replace(/\*/g, "").length)) * 0.66)),
        ),
        lineHeight: 1.02,
        letterSpacing: -3,
        wordSpacing: "0.12em",
        textTransform: "uppercase",
        transform: `perspective(900px) rotateX(${(1 - s) * 55}deg) scale(${0.7 + 0.3 * s})`,
        opacity: Math.min(s * 1.4, 1),
        textShadow: "0 10px 40px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.9)",
      }}
    >
      {words.map((w, i) => {
        if (w.startsWith("*")) inHi = true;
        const hi = inHi;
        if (w.replace(/[?!.,:;]+$/, "").endsWith("*")) inHi = false;
        return (
          <React.Fragment key={i}>
            <span style={{ color: hi ? C.accent : C.ink }}>{w.replace(/\*/g, "")}</span>{" "}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// TikTok-style captions: 3 words at a time, active word pops in yellow.
const Captions: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const speechEnd = durationInFrames - Math.round(0.35 * fps);
  let acc = 0;
  const starts = weights.map((w) => {
    const s = (acc / total) * speechEnd;
    acc += w;
    return s;
  });
  let cur = 0;
  for (let i = 0; i < words.length; i++) if (frame >= starts[i]) cur = i;
  const chunk = 3;
  const c0 = Math.floor(cur / chunk) * chunk;
  return (
    <div
      style={{
        position: "absolute",
        top: 1180,
        left: 50,
        right: 50,
        textAlign: "center",
        fontFamily: FONT_DISPLAY,
        fontSize: 78,
        lineHeight: 1.1,
        wordSpacing: "0.2em",
        textTransform: "uppercase",
        WebkitTextStroke: "3px #000",
        paintOrder: "stroke fill",
        textShadow: "0 6px 24px rgba(0,0,0,0.9)",
      }}
    >
      {words.slice(c0, c0 + chunk).map((w, i) => {
        const idx = c0 + i;
        const active = idx === cur;
        const pop = spring({ frame: frame - starts[idx], fps, config: { damping: 12, stiffness: 220 } });
        return (
          <React.Fragment key={idx}>
          <span
            style={{
              display: "inline-block",
              color: active ? C.accent : C.ink,
              transform: `scale(${active ? 0.85 + 0.2 * pop : 1})`,
            }}
          >
            {w}
          </span>{" "}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Grade: React.FC = () => (
  <>
    {/* vignette + top/bottom darkening for legibility */}
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%), linear-gradient(rgba(0,0,0,0.45), transparent 30%, transparent 55%, rgba(0,0,0,0.6))",
      }}
    />
  </>
);

const SceneView: React.FC<{ scene: DocScene; index: number }> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // whip-in: quick zoom/blur at the start of every scene except the first
  const inP = interpolate(frame, [0, 7], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const blur = index === 0 ? 0 : (1 - inP) * 18;
  const zoom = index === 0 ? 1 : 1.25 - 0.25 * inP;
  const out = interpolate(frame, [durationInFrames - 4, durationInFrames], [1, 0.85], {
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill
        style={{ filter: `blur(${blur}px) brightness(${out})`, transform: `scale(${zoom})` }}
      >
        {scene.type === "clip" ? (
          <Clip scene={scene} />
        ) : (
          <Scale3D subject={scene.subject!} size={scene.size!} env={scene.env} color={scene.color} />
        )}
      </AbsoluteFill>
      <Grade />
      {scene.stamp ? <Stamp text={scene.stamp} /> : null}
      <Captions text={scene.narration} />
      {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
    </AbsoluteFill>
  );
};

const Brand: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 130,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: 30,
        letterSpacing: 6,
        color: C.bg,
        padding: "8px 22px",
        background: `repeating-linear-gradient(-45deg, ${C.accent} 0 20px, #E8C200 20px 40px)`,
        borderRadius: 8,
        boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
      }}
    >
      ESCALA BRUTAL
    </div>
  </div>
);

export const Doc: React.FC<DocEpisode> = (ep) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loadFonts().then(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill style={{ background: "#000", color: C.ink, fontFamily: FONT_BODY }}>
      <Series>
        {ep.scenes.map((s, i) => (
          <Series.Sequence key={i} durationInFrames={s.durationInFrames ?? 90}>
            <SceneView scene={s} index={i} />
          </Series.Sequence>
        ))}
      </Series>
      <Brand />
      {ep.music ? <Audio src={staticFile(ep.music)} volume={0.45} /> : null}
    </AbsoluteFill>
  );
};
