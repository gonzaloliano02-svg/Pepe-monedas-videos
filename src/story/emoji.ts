import { staticFile } from "remotion";

// Twemoji SVGs (CC-BY 4.0, copied to public/twemoji by the build script).
// "🐋" -> twemoji/1f40b.svg ; variation selector FE0F is dropped.
export const emojiCode = (e: string) =>
  Array.from(e)
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((h) => h !== "fe0f")
    .join("-");

export const emojiUrl = (e: string) => staticFile(`twemoji/${emojiCode(e)}.svg`);
