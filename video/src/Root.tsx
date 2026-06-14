import { Composition } from "remotion";
import { MobiusPromo } from "./MobiusPromo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MobiusPromo"
      component={MobiusPromo}
      durationInFrames={1020}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
