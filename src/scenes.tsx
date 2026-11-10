import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO } from "./theme";
import type { Scene } from "./types";

// "*word*" -> highlighted span
const RichText: React.FC<{ text: string; startFrame?: number }> = ({
  text,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  let inHi = false;
  const parsed = words.map((w) => {
    if (w.startsWith("*")) inHi = true;
    const hi = inHi;
    if (w.replace(/[?!.,:;]+$/, "").endsWith("*")) inHi = false;
    return { hi, clean: w.replace(/\*/g, "") };
  });
  return (
    <>
      {parsed.map(({ hi, clean }, i) => {
        const s = spring({
          frame: frame - startFrame - i * 3,
          fps,
          config: { damping: 12, stiffness: 180 },
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.25em",
              transform: `translateY(${(1 - s) * 40}px) scale(${0.6 + 0.4 * s})`,
              opacity: s,
              color: hi ? C.bg : C.ink,
              background: hi ? C.accent : "transparent",
              padding: hi ? "0 0.12em" : 0,
              borderRadius: 10,
            }}
          >
            {clean}
          </span>
        );
      })}
    </>
  );
};

export const HookScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06]);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 80px",
        transform: `scale(${zoom})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 112,
          lineHeight: 1.05,
          textAlign: "center",
          letterSpacing: -2,
        }}
      >
        <RichText text={scene.text ?? ""} />
      </div>
      {scene.sub ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: FONT_BODY,
            fontSize: 48,
            color: C.muted,
            textAlign: "center",
            opacity: interpolate(frame, [15, 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {scene.sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const BASELINE = 1330;
const MAX_H = 900;
const SIDE = 70;

export const CompareScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const items = [...(scene.items ?? [])].sort((a, b) => a.value - b.value);
  const n = Math.max(items.length, 1);
  const gap = 36;
  const barW = (width - SIDE * 2 - gap * (n - 1)) / n;
  const revealSpan = Math.max(durationInFrames * 0.72, n * 12);
  const revealAt = items.map((_, i) => 6 + (i * revealSpan) / n);

  // Camera: the scale follows the biggest item revealed so far,
  // so smaller items shrink as bigger ones appear.
  let scale = MAX_H / Math.max(items[0]?.value ?? 1, 1e-9);
  for (let i = 1; i < items.length; i++) {
    // the camera starts pulling back just before the bigger item grows
    const s = spring({
      frame: frame - revealAt[i] + 6,
      fps,
      config: { damping: 20, stiffness: 110 },
    });
    const prev = MAX_H / items[i - 1].value;
    const next = MAX_H / items[i].value;
    // interpolate in log space for a smooth zoom-out
    if (s > 0) {
      scale = Math.exp(
        Math.log(prev) + (Math.log(next) - Math.log(prev)) * Math.min(s, 1),
      );
    }
  }

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 230,
          left: SIDE,
          right: SIDE,
          fontFamily: FONT_DISPLAY,
          fontSize: 76,
          lineHeight: 1.05,
          textAlign: "center",
          letterSpacing: -1,
        }}
      >
        <RichText text={scene.heading ?? ""} />
      </div>
      {/* baseline */}
      <div
        style={{
          position: "absolute",
          top: BASELINE,
          left: 40,
          right: 40,
          height: 6,
          background: C.ink,
          opacity: 0.25,
          borderRadius: 3,
        }}
      />
      {items.map((it, i) => {
        const appear = spring({
          frame: frame - revealAt[i],
          fps,
          config: { damping: 14, stiffness: 120 },
        });
        const h = Math.min(
          Math.max(it.value * scale * appear, appear > 0 ? 6 : 0),
          MAX_H * 1.08,
        );
        const color = it.color ?? C.palette[i % C.palette.length];
        const left = SIDE + i * (barW + gap);
        const labelTop = Math.max(BASELINE - h - 92, 380);
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left,
                width: barW,
                top: BASELINE - Math.min(h, 2000),
                height: Math.min(h, 2000),
                background: color,
                borderRadius: "18px 18px 4px 4px",
                boxShadow: `0 0 60px ${color}55`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: left - 30,
                width: barW + 60,
                top: labelTop,
                textAlign: "center",
                fontFamily: FONT_MONO,
                fontSize: n > 3 ? 40 : 50,
                color: C.ink,
                opacity: appear,
                textShadow: "0 4px 18px #000",
              }}
            >
              {it.display}
            </div>
            <div
              style={{
                position: "absolute",
                left: left - 20,
                width: barW + 40,
                top: BASELINE + 28,
                textAlign: "center",
                fontFamily: FONT_BODY,
                fontSize: n > 3 ? 34 : 42,
                lineHeight: 1.1,
                color,
                opacity: appear,
              }}
            >
              {it.label}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

const fmt = (v: number, decimals: number) =>
  v.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const StatScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [4, Math.min(durationInFrames * 0.6, 50)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const pop = spring({ frame: frame - 2, fps, config: { damping: 10 } });
  const value = (scene.value ?? 0) * t;
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: "0 60px" }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 190,
          color: C.accent,
          letterSpacing: -6,
          transform: `scale(${0.7 + 0.3 * pop})`,
          textAlign: "center",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {scene.prefix ?? ""}
        {fmt(value, scene.decimals ?? 0)}
        {scene.suffix ?? ""}
      </div>
      <div
        style={{
          marginTop: 40,
          fontFamily: FONT_DISPLAY,
          fontSize: 70,
          lineHeight: 1.1,
          textAlign: "center",
        }}
      >
        <RichText text={scene.label ?? ""} startFrame={10} />
      </div>
    </AbsoluteFill>
  );
};

export const OutroScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 5) * 0.03;
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: "0 80px" }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 100,
          lineHeight: 1.05,
          textAlign: "center",
          transform: `scale(${pulse})`,
        }}
      >
        <RichText text={scene.text ?? "Sigue para más *escalas*"} />
      </div>
    </AbsoluteFill>
  );
};
