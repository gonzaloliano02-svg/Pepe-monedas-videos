import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "world-atlas/countries-50m.json";
import { FONT_BODY, FONT_DISPLAY } from "../theme";
import { emojiUrl } from "./emoji";

// Vintage-style animated map: camera zooms from `from` to `to` view,
// highlighted countries fill in, markers pop, routes draw themselves.
export type MapView = { lon: number; lat: number; zoom: number };
export type MapMarker = { lon: number; lat: number; label?: string; emoji?: string };
export type MapRoute = { from: [number, number]; to: [number, number]; color?: string };

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = feature(topo, topo.objects.countries);
const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);

const OCEAN = "#1f3e4f";
const LAND = "#e9dcbb";
const BORDER = "#b39f74";
const HI = "#e8a33d";

export const MapScene: React.FC<{
  from: MapView;
  to?: MapView;
  highlight?: string[];
  markers?: MapMarker[];
  routes?: MapRoute[];
}> = ({ from, to, highlight = [], markers = [], routes = [] }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const target = to ?? from;
  const t = interpolate(frame, [0, Math.min(durationInFrames * 0.6, fps * 4)], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const lon = from.lon + (target.lon - from.lon) * t;
  const lat = from.lat + (target.lat - from.lat) * t;
  const zoom = Math.exp(Math.log(from.zoom) + (Math.log(target.zoom) - Math.log(from.zoom)) * t);

  const projection = useMemo(() => geoNaturalEarth1(), []);
  projection.rotate([-lon, 0]).center([0, lat]).scale(330 * zoom).translate([960, 540]);
  const path = geoPath(projection);

  const hiSet = new Set(highlight);
  const hiProgress = interpolate(frame, [fps * 0.6, fps * 1.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: OCEAN }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <defs>
          <pattern id="seaLines" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0,20 Q10,14 20,20 T40,20" stroke="#2b5468" strokeWidth="2" fill="none" />
          </pattern>
          <filter id="mgrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.1" />
            </feComponentTransfer>
          </filter>
          <radialGradient id="mvig" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#seaLines)" opacity="0.6" />
        {countries.features.map((f, i) => {
          const name = (f.properties as { name: string }).name;
          const hot = hiSet.has(name);
          return (
            <path
              key={i}
              d={path(f) ?? ""}
              fill={hot ? HI : LAND}
              fillOpacity={hot ? 0.35 + 0.65 * hiProgress : 1}
              stroke={hot ? "#8a4b12" : "none"}
              strokeWidth={hot ? 2 : 0}
            />
          );
        })}
        <path d={path(borders) ?? ""} fill="none" stroke={BORDER} strokeWidth={1.2} />
        {routes.map((r, i) => {
          const a = projection(r.from);
          const b = projection(r.to);
          if (!a || !b) return null;
          const mx = (a[0] + b[0]) / 2;
          const my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.25;
          const d = `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`;
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.3 + 1;
          const p = interpolate(frame, [fps * (1 + i * 0.6), fps * (2.6 + i * 0.6)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={r.color ?? "#c0392b"}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${len}`}
              strokeDashoffset={len * (1 - p)}
            />
          );
        })}
        <rect width="1920" height="1080" filter="url(#mgrain)" />
        <rect width="1920" height="1080" fill="url(#mvig)" />
      </svg>
      {markers.map((m, i) => {
        const pt = projection([m.lon, m.lat]);
        if (!pt) return null;
        const s = spring({ frame: frame - fps * (0.8 + i * 0.35), fps, config: { damping: 11 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pt[0],
              top: pt[1],
              transform: `translate(-50%, -100%) scale(${s})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {m.label ? (
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 38,
                  color: "#1b1b1b",
                  background: "#fff6df",
                  padding: "4px 16px",
                  borderRadius: 10,
                  border: "3px solid #1b1b1b",
                  marginBottom: 8,
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </div>
            ) : null}
            {m.emoji ? (
              <img src={emojiUrl(m.emoji)} style={{ width: 90, height: 90, filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }} />
            ) : (
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#c0392b", border: "5px solid #fff6df" }} />
            )}
          </div>
        );
      })}
      <div style={{ position: "absolute", right: 40, bottom: 30, fontFamily: FONT_BODY, fontSize: 18, color: "#9fb6c2", opacity: 0.6 }}>
        Natural Earth
      </div>
    </AbsoluteFill>
  );
};

// keep staticFile import used for bundlers that tree-shake aggressively
void staticFile;
