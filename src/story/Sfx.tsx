import React from "react";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { lightningTimes, type Actor, type CartoonScene } from "./Cartoon";

// Automatic sound effects (owner request 2026-11-18: "añade también efectos de sonido").
// Every scene gets its SFX from what happens on screen, so nothing has to be timed by hand:
// whoosh on cuts, hit on titles, count+ding on stats, pop/blip when things appear,
// riser+boom on collapses and black-hole mergers, boom on flashes, rumble on camera shake,
// hum near black holes, wind in the warp tunnel, tick-tock for clocks, sparkle for ✨.
// Sounds are synthesised by scripts/make_sfx.py (public/sfx). Voice stays on top:
// one-shots ≤ 0.45, loops ≤ 0.2. A scene may add `sfx: [{at, name, vol}]` or set `noSfx`.

export type SfxEvent = { at: number; name: string; vol?: number; dur?: number };

type SceneLike = CartoonScene & {
  type: string;
  durationInFrames?: number;
  sfx?: SfxEvent[];
  noSfx?: boolean;
};

const Shot: React.FC<SfxEvent> = ({ at, name, vol = 0.35, dur }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.max(0, Math.round(at * fps))} durationInFrames={dur ? Math.round(dur * fps) : undefined} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
    </Sequence>
  );
};

const actorEvents = (a: Actor, ev: SfxEvent[]) => {
  const d = a.delay ?? 0;
  switch (a.kind) {
    case "stick":
      if (d > 0.05) ev.push({ at: d, name: "pop", vol: 0.3 });
      if (a.poseAt !== undefined && (a.pose2 || a.expr2)) {
        const scared = a.pose2 === "scared" || a.expr2 === "scared" || a.expr2 === "wow";
        ev.push({ at: a.poseAt, name: scared ? "boing" : "blip", vol: scared ? 0.3 : 0.22 });
      }
      if (a.stretch && a.stretch[1] > 0.5) ev.push({ at: a.move?.[0] ?? d, name: "riser", vol: 0.18 });
      break;
    case "bubble":
    case "tag":
      ev.push({ at: d, name: "blip", vol: 0.3 });
      break;
    case "emoji":
      ev.push({ at: d, name: a.emoji === "✨" ? "sparkle" : "pop", vol: 0.28 });
      if (a.to) ev.push({ at: a.move?.[0] ?? d, name: "swoosh", vol: 0.25 });
      break;
    case "arrow":
      ev.push({ at: d, name: "swoosh", vol: 0.32 });
      break;
    case "bh":
      if (d > 0.05) ev.push({ at: d, name: "hit", vol: 0.35 });
      break;
    case "star":
      if (a.mode === "collapse") {
        const at = a.at ?? 2;
        ev.push({ at: Math.max(0, d + at - 2.0), name: "riser", vol: 0.3 });
        ev.push({ at: d + at + 0.35, name: "boom", vol: 0.5 });
      }
      break;
    case "ripple":
      if (a.merge) {
        const at = a.at ?? 3;
        ev.push({ at: Math.max(0, d + at - 2.2), name: "riser", vol: 0.3 });
        ev.push({ at: d + at, name: "boom", vol: 0.5 });
      }
      break;
    case "clock":
      ev.push({ at: d, name: "ticktock", vol: 0.16 });
      break;
  }
  if (a.vanish !== undefined) ev.push({ at: a.vanish, name: "whoosh", vol: 0.25 });
};

export const SceneSfx: React.FC<{ s: SceneLike }> = ({ s }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (s.noSfx) return null;
  const dur = durationInFrames / fps;
  const ev: SfxEvent[] = [];
  if (s.type === "title") ev.push({ at: 0.1, name: "hit", vol: 0.42 });
  else ev.push({ at: 0, name: "whoosh", vol: 0.2 });
  if (s.type === "stat") {
    ev.push({ at: 0.25, name: "count", vol: 0.22 });
    ev.push({ at: 2.0, name: "ding", vol: 0.28 });
  }
  if (s.type === "compare" || s.type === "timeline") ev.push({ at: 0.4, name: "pop", vol: 0.25 });
  // ambience
  if (s.bg === "blackhole" || (s.actors ?? []).some((a) => a.kind === "bh" && (a.size ?? 0) >= 120)) ev.push({ at: 0, name: "hum", vol: 0.16 });
  if (s.bg === "warp" || s.fx?.includes("speedlines") || s.fx?.includes("wind")) ev.push({ at: 0, name: "wind", vol: 0.18 });
  if (s.camera?.shake) ev.push({ at: s.camera.shakeAt ?? 0, name: "rumble", vol: Math.min(0.32, 0.1 + s.camera.shake / 60) });
  if (s.fx?.includes("flash") && !(s.actors ?? []).some((a) => (a.kind === "star" && a.mode === "collapse") || (a.kind === "ripple" && a.merge)))
    ev.push({ at: s.flashAt ?? 1, name: "boom", vol: 0.45 });
  if (s.fx?.includes("lightning")) for (const at of lightningTimes(dur)) ev.push({ at: at + 0.05, name: "boom", vol: 0.3, dur: 1.6 });
  if (s.bg === "ocean") ev.push({ at: 0, name: "hum", vol: (s.depth?.[1] ?? 0) > 800 ? 0.13 : 0.08 });
  if (s.fx?.includes("bubbles")) ev.push({ at: 0.2, name: "pop", vol: 0.15 }, { at: 0.9, name: "blip", vol: 0.12 });
  if (s.fx?.includes("einstein")) ev.push({ at: 0.5, name: "sparkle", vol: 0.2 });
  for (const a of s.actors ?? []) actorEvents(a, ev);
  for (const e of s.sfx ?? []) ev.push(e);
  return (
    <>
      {ev
        .filter((e) => e.at < dur - 0.1)
        .map((e, i) => (
          <Shot key={i} {...e} />
        ))}
    </>
  );
};
