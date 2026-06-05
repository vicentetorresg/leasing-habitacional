import React from 'react';
import {Composition} from 'remotion';
import {Reel} from './Reel';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Vertical 9:16 — Reels / Stories */}
      <Composition
        id="LeasingReel"
        component={Reel}
        durationInFrames={441}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Cuadrado 1:1 — Feed */}
      <Composition
        id="LeasingSquare"
        component={Reel}
        durationInFrames={441}
        fps={30}
        width={1080}
        height={1080}
      />
    </>
  );
};
