import { Composition } from "remotion";
import { Scale3D } from "./three/Scale3D";
import { Avatar } from "./three/Avatar";
import { LogoA, LogoB } from "./Logo";
import { Short } from "./Short";
import { Doc, type DocEpisode } from "./Doc";
import type { Episode } from "./types";
import sample from "../episodes/sample.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition id="LogoA" component={LogoA} width={1080} height={1080} fps={30} durationInFrames={1} />
    <Composition id="LogoB" component={LogoB} width={1080} height={1080} fps={30} durationInFrames={1} />
    <Composition id="Avatar" component={Avatar} width={1080} height={1080} fps={30} durationInFrames={1} />
    <Composition
      id="Test3D"
      component={Scale3D}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={150}
      defaultProps={{ subject: "sperm-whale" as const, size: 16, env: "ocean" as const }}
    />
    <Composition
      id="Doc"
      component={Doc}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={300}
      defaultProps={{ id: "x", title: "", description: "", tags: [], scenes: [] } as DocEpisode}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          30,
          props.scenes.reduce((a, s) => a + (s.durationInFrames ?? 90), 0),
        ),
      })}
    />
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
    </>
  );
};
