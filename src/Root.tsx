import { Composition } from "remotion";
import { Short } from "./Short";
import type { Episode } from "./types";
import sample from "../episodes/sample.json";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Short"
      component={Short}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={300}
      defaultProps={sample as unknown as Episode}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          30,
          props.scenes.reduce((a, s) => a + (s.durationInFrames ?? 90), 0),
        ),
      })}
    />
  );
};
