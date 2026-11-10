import { staticFile } from "remotion";

export const C = {
  bg: "#07090F",
  bg2: "#111827",
  ink: "#F5F7FA",
  muted: "#8A94A6",
  accent: "#FFD60A",
  palette: ["#3DDCFF", "#FF4D6D", "#7CFF6B", "#B387FF", "#FF9F1C"],
};

export const FONT_DISPLAY = "EBDisplay";
export const FONT_BODY = "EBBody";
export const FONT_MONO = "EBMono";

let loading: Promise<unknown> | null = null;
export const loadFonts = () => {
  if (loading) return loading;
  const faces: [string, string][] = [
    [FONT_DISPLAY, "fonts/InterDisplay-Black.otf"],
    [FONT_BODY, "fonts/Inter-Bold.otf"],
    [FONT_MONO, "fonts/JetBrainsMono-ExtraBold.ttf"],
  ];
  loading = Promise.all(
    faces.map(([name, file]) => {
      const f = new FontFace(name, `url(${staticFile(file)})`);
      document.fonts.add(f);
      return f.load();
    }),
  );
  return loading;
};
