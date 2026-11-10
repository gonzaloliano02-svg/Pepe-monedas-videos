export type Item = {
  label: string;
  value: number;
  // Text shown above the bar, e.g. "18 m" or "1,2 millones"
  display: string;
  color?: string;
};

export type Scene = {
  type: "hook" | "compare" | "stat" | "outro";
  narration: string;
  // Filled in by scripts/build_episode.py
  audio?: string;
  durationInFrames?: number;
  // hook / outro: big text. Wrap a word in *asterisks* to highlight it.
  text?: string;
  sub?: string;
  // compare
  heading?: string;
  items?: Item[];
  // stat
  value?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label?: string;
};

export type Episode = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  scenes: Scene[];
  music?: string;
};
