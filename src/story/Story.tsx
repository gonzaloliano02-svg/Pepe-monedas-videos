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
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO, loadFonts } from "../theme";
import { Landscape, type Env } from "./Landscape";
import { MapScene, type MapMarker, type MapRoute, type MapView } from "./MapScene";
import { emojiUrl } from "./emoji";

export type Prop = {
  emoji: string;
  x: number; // % of width (centre)
  y: number; // % of height (bottom of the prop)
  size?: number; // px
  anim?: "float" | "pop" | "walk" | "shake" | "fall" | "rise" | "spin";
  to?: [number, number]; // for walk: destination in %
  delay?: number; // seconds
  flip?: boolean;
};

export type StoryScene = {
  type: "title" | "landscape" | "map" | "stat" | "quote" | "compare" | "timeline" | "footage";
  narration: string;
  audio?: string;
  durationInFrames?: number;
  env?: Env;
  seed?: string;
  text?: string; // headline (landscape/footage); *word* = highlight
  kicker?: string; // small label above headline / chapter number
  props?: Prop[];
  // map
  from?: MapView;
  to?: MapView;
  highlight?: string[];
  markers?: MapMarker[];
  routes?: MapRoute[];
  // stat
  value?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  emoji?: string;
  label?: string;
  // quote
  author?: string;
  // compare
  items?: { emoji: string; label: string; value: number; display: string }[];
  // timeline
  points?: { year: string; label: string; emoji?: string }[];
  // footage
  src?: string;
  startFrom?: number;
  fit?: "cover" | "contain";
};

export type StoryEpisode = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  scenes: StoryScene[];
  music?: string;
  thumbnail?: { text: string; emoji: string; env: Env; kicker?: string };
};

const Rich: React.FC<{ text: string; color?: string; hi?: string }> = ({ text, color = "#fff", hi = C.accent }) => {
  let inHi = false;
  return (
    <>
      {text.split(" ").map((w, i) => {
        if (w.startsWith("*")) inHi = true;
        const on = inHi;
        if (w.replace(/[?!.,:;]+$/, "").endsWith("*")) inHi = false;
        return (
          <React.Fragment key={i}>
            <span style={{ color: on ? hi : color }}>{w.replace(/\*/g, "")}</span>{" "}
          </React.Fragment>
        );
      })}
    </>
  );
};

const PropView: React.FC<{ p: Prop }> = ({ p }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const f = frame - (p.delay ?? 0) * fps;
  const size = (p.size ?? 180) * 1.55; // illustrations read better big on 16:9
  const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 120 } });
  let x = p.x;
  let y = p.y;
  let rot = 0;
  let scale = s;
  switch (p.anim ?? "float") {
    case "float":
      y += Math.sin(frame / 18 + p.x) * 0.8;
      break;
    case "walk": {
      const k = interpolate(f, [0, durationInFrames - (p.delay ?? 0) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      x = p.x + ((p.to?.[0] ?? p.x + 30) - p.x) * k;
      y = p.y + ((p.to?.[1] ?? p.y) - p.y) * k + Math.abs(Math.sin(frame / 4)) * -0.6;
      scale = 1;
      break;
    }
    case "shake":
      rot = Math.sin(frame / 2) * 6;
      break;
    case "fall": {
      const k = interpolate(f, [0, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
      y = -20 + (p.y + 20) * k;
      scale = 1;
      break;
    }
    case "rise":
      y = p.y + (1 - s) * 30;
      break;
    case "spin":
      rot = frame * 2;
      break;
  }
  return (
    <img
      src={emojiUrl(p.emoji)}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        transform: `translate(-50%, -100%) scale(${scale}) rotate(${rot}deg) scaleX(${p.flip ? -1 : 1})`,
        filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.45))",
        opacity: f < 0 ? 0 : 1,
      }}
    />
  );
};

const Headline: React.FC<{ text?: string; kicker?: string; position?: "top" | "center" | "bottom" }> = ({ text, kicker, position = "top" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!text && !kicker) return null;
  const s = spring({ frame: frame - 6, fps, config: { damping: 16 } });
  const top = position === "top" ? 70 : position === "center" ? 360 : 820;
  return (
    <>
    {position === "top" ? (
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 380, background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))", opacity: s }} />
    ) : null}
    <div
      style={{
        position: "absolute",
        top,
        left: 120,
        right: 120,
        textAlign: "center",
        opacity: s,
        transform: `translateY(${(1 - s) * 30}px)`,
      }}
    >
      {kicker ? (
        <div style={{ fontFamily: FONT_MONO, fontSize: 30, letterSpacing: 8, color: C.accent, marginBottom: 14, textShadow: "0 3px 10px rgba(0,0,0,0.7)" }}>
          {kicker.toUpperCase()}
        </div>
      ) : null}
      {text ? (
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 84,
            lineHeight: 1.05,
            letterSpacing: -2,
            wordSpacing: "0.1em",
            textShadow: "0 6px 26px rgba(0,0,0,0.75), 0 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          <Rich text={text} />
        </div>
      ) : null}
    </div>
    </>
  );
};

const Slow: React.FC<{ children: React.ReactNode; amount?: number }> = ({ children, amount = 0.06 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const z = 1 + amount * (frame / durationInFrames);
  return <AbsoluteFill style={{ transform: `scale(${z})` }}>{children}</AbsoluteFill>;
};

const TitleScene: React.FC<{ s: StoryScene }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = (s.text ?? "").split(" ");
  return (
    <AbsoluteFill>
      <Slow amount={0.08}>
        <AbsoluteFill style={{ filter: "blur(6px) brightness(0.55)" }}>
          <Landscape env={s.env ?? "mountains"} seed={s.seed} />
        </AbsoluteFill>
      </Slow>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 160px" }}>
        {s.kicker ? (
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 40,
              letterSpacing: 14,
              color: C.accent,
              opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
              marginBottom: 30,
            }}
          >
            {s.kicker.toUpperCase()}
          </div>
        ) : null}
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 128, lineHeight: 1.02, letterSpacing: -3, textAlign: "center", textShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
          {words.map((w, i) => {
            const sp = spring({ frame: frame - 8 - i * 4, fps, config: { damping: 14 } });
            const hi = w.startsWith("*") || w.endsWith("*");
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: "0.25em",
                  opacity: sp,
                  transform: `translateY(${(1 - sp) * 50}px)`,
                  color: hi ? C.accent : "#fff",
                }}
              >
                {w.replace(/\*/g, "")}
              </span>
            );
          })}
        </div>
        {s.emoji ? (
          <img
            src={emojiUrl(s.emoji)}
            style={{ width: 170, height: 170, marginTop: 40, filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.5))", transform: `scale(${spring({ frame: frame - 20, fps })})` }}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const LandscapeScene: React.FC<{ s: StoryScene }> = ({ s }) => (
  <AbsoluteFill>
    <Slow>
      <Landscape env={s.env ?? "mountains"} seed={s.seed} />
      {(s.props ?? []).map((p, i) => (
        <PropView key={i} p={p} />
      ))}
    </Slow>
    <Headline text={s.text} kicker={s.kicker} />
  </AbsoluteFill>
);

const fmt = (v: number, d: number) => v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });

const StatScene: React.FC<{ s: StoryScene }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = interpolate(frame, [6, fps * 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const pop = spring({ frame, fps, config: { damping: 10 } });
  return (
    <AbsoluteFill>
      <Slow>
        <AbsoluteFill style={{ filter: "brightness(0.45) blur(3px)" }}>
          <Landscape env={s.env ?? "night"} seed={s.seed} />
        </AbsoluteFill>
      </Slow>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {s.emoji ? <img src={emojiUrl(s.emoji)} style={{ width: 200, height: 200, transform: `scale(${pop})`, marginBottom: 20 }} /> : null}
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 230, color: C.accent, letterSpacing: -8, lineHeight: 1, textShadow: "0 12px 40px rgba(0,0,0,0.6)", fontVariantNumeric: "tabular-nums" }}>
          {s.prefix ?? ""}
          {fmt((s.value ?? 0) * k, s.decimals ?? 0)}
          {s.suffix ?? ""}
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 70, marginTop: 20, textAlign: "center", maxWidth: 1500, opacity: k }}>
          <Rich text={s.label ?? ""} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const QuoteScene: React.FC<{ s: StoryScene }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const words = (s.text ?? "").split(" ");
  const shown = Math.ceil(interpolate(frame, [6, durationInFrames * 0.7], [0, words.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill>
      <Slow>
        <AbsoluteFill style={{ filter: "brightness(0.4) blur(4px)" }}>
          <Landscape env={s.env ?? "storm"} seed={s.seed} />
        </AbsoluteFill>
      </Slow>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 220px" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 260, color: C.accent, lineHeight: 0.6, height: 120 }}>“</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 76, lineHeight: 1.15, textAlign: "center" }}>
          {words.map((w, i) => (
            <span key={i} style={{ opacity: i < shown ? 1 : 0.12 }}>
              {w.replace(/\*/g, "")}{" "}
            </span>
          ))}
        </div>
        {s.author ? (
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 20, fontFamily: FONT_BODY, fontSize: 40, color: "#d9d9d9", opacity: spring({ frame: frame - fps, fps }) }}>
            {s.emoji ? <img src={emojiUrl(s.emoji)} style={{ width: 80, height: 80 }} /> : null}— {s.author}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const CompareScene: React.FC<{ s: StoryScene }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = s.items ?? [];
  const maxV = Math.max(...items.map((i) => i.value), 1e-9);
  return (
    <AbsoluteFill>
      <Slow>
        <Landscape env={s.env ?? "mountains"} seed={s.seed} />
      </Slow>
      <Headline text={s.text} kicker={s.kicker} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 120 }}>
        {items.map((it, i) => {
          const sp = spring({ frame: frame - 10 - i * 18, fps, config: { damping: 12 } });
          const size = 60 + 560 * Math.sqrt(it.value / maxV);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              <img src={emojiUrl(it.emoji)} style={{ width: size, height: size, transform: `scale(${sp})`, transformOrigin: "bottom", filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.45))" }} />
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 52, color: C.accent, opacity: sp, textShadow: "0 4px 14px rgba(0,0,0,0.7)" }}>{it.display}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 38, opacity: sp, textShadow: "0 4px 14px rgba(0,0,0,0.7)" }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const TimelineScene: React.FC<{ s: StoryScene }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pts = s.points ?? [];
  const gap = 520;
  const total = (pts.length - 1) * gap;
  const pan = interpolate(frame, [fps * 0.5, durationInFrames - fps * 0.5], [0, Math.max(total - 0, 0)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: "brightness(0.5)" }}>
        <Landscape env={s.env ?? "night"} seed={s.seed} drift={0.4} />
      </AbsoluteFill>
      <Headline text={s.text} kicker={s.kicker} />
      <div style={{ position: "absolute", top: 600, left: 960 - pan, height: 8, width: total + 2000, marginLeft: -1000, background: "rgba(255,255,255,0.35)", borderRadius: 4 }} />
      {pts.map((p, i) => {
        const x = 960 + i * gap - pan;
        const near = Math.max(0, 1 - Math.abs(x - 960) / 700);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 600, transform: `translate(-50%, -50%) scale(${0.8 + near * 0.4})`, display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.35 + near * 0.65 }}>
            {p.emoji ? <img src={emojiUrl(p.emoji)} style={{ width: 150, height: 150, marginBottom: 20 }} /> : null}
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.accent, border: "6px solid #fff" }} />
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 72, color: C.accent, marginTop: 18 }}>{p.year}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 38, maxWidth: 420, textAlign: "center" }}>{p.label}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const FootageScene: React.FC<{ s: StoryScene }> = ({ s }) => {
  const { fps } = useVideoConfig();
  const start = Math.round((s.startFrom ?? 0) * fps);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Slow amount={0.08}>
        {s.fit === "contain" ? (
          <>
            <OffthreadVideo src={staticFile(s.src!)} muted startFrom={start} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.5)" }} />
            <OffthreadVideo src={staticFile(s.src!)} muted startFrom={start} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "contain" }} />
          </>
        ) : (
          <OffthreadVideo src={staticFile(s.src!)} muted startFrom={start} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.08) saturate(1.1)" }} />
        )}
      </Slow>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%), linear-gradient(rgba(0,0,0,0.4), transparent 30%)" }} />
      <Headline text={s.text} kicker={s.kicker} />
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ s: StoryScene }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fade = Math.min(
    interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp" }),
  );
  let body: React.ReactNode;
  switch (s.type) {
    case "title":
      body = <TitleScene s={s} />;
      break;
    case "map":
      body = (
        <>
          <MapScene from={s.from!} to={s.to} highlight={s.highlight} markers={s.markers} routes={s.routes} />
          <Headline text={s.text} kicker={s.kicker} />
        </>
      );
      break;
    case "stat":
      body = <StatScene s={s} />;
      break;
    case "quote":
      body = <QuoteScene s={s} />;
      break;
    case "compare":
      body = <CompareScene s={s} />;
      break;
    case "timeline":
      body = <TimelineScene s={s} />;
      break;
    case "footage":
      body = <FootageScene s={s} />;
      break;
    default:
      body = <LandscapeScene s={s} />;
  }
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: fade }}>{body}</AbsoluteFill>
      {s.audio ? <Audio src={staticFile(s.audio)} /> : null}
    </AbsoluteFill>
  );
};

const Brand: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 34,
      left: 40,
      fontFamily: FONT_MONO,
      fontSize: 22,
      letterSpacing: 5,
      color: C.bg,
      padding: "6px 16px",
      background: `repeating-linear-gradient(-45deg, ${C.accent} 0 16px, #E8C200 16px 32px)`,
      borderRadius: 6,
      opacity: 0.9,
    }}
  >
    ESCALA BRUTAL
  </div>
);

export const Story: React.FC<StoryEpisode> = (ep) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loadFonts().then(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill style={{ background: "#000", color: "#fff", fontFamily: FONT_BODY }}>
      <Series>
        {ep.scenes.map((s, i) => (
          <Series.Sequence key={i} durationInFrames={s.durationInFrames ?? 120}>
            <SceneView s={s} />
          </Series.Sequence>
        ))}
      </Series>
      <Brand />
      {ep.music ? <Audio src={staticFile(ep.music)} volume={0.22} /> : null}
    </AbsoluteFill>
  );
};

// Thumbnail (1280x720 still): big bold text, emoji hero, illustrated background.
export const StoryThumb: React.FC<StoryEpisode> = (ep) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loadFonts().then(() => continueRender(handle));
  }, [handle]);
  const th = ep.thumbnail ?? { text: ep.title, emoji: "🔥", env: "mountains" as Env };
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: "scale(1.0)" }}>
        <Landscape env={th.env} seed="thumb" />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 55%, transparent 80%)" }} />
      <img src={emojiUrl(th.emoji)} style={{ position: "absolute", right: 90, top: 150, width: 720, height: 720, filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.6))" }} />
      <div style={{ position: "absolute", left: 90, top: 140, width: 1050, fontFamily: FONT_DISPLAY, fontSize: 150, lineHeight: 0.95, letterSpacing: -5, color: "#fff", textTransform: "uppercase", textShadow: "0 10px 30px rgba(0,0,0,0.8)" }}>
        {th.kicker ? <div style={{ fontFamily: FONT_MONO, fontSize: 52, letterSpacing: 10, color: C.accent, marginBottom: 20 }}>{th.kicker}</div> : null}
        <Rich text={th.text} />
      </div>
      <Brand />
    </AbsoluteFill>
  );
};
