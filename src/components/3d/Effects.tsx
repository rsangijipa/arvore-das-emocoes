import React from 'react';
import { EffectComposer, Bloom, DepthOfField, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export const Effects: React.FC = () => {
    return (
        <EffectComposer>
            <DepthOfField
                focusDistance={0.02} // Focus on tree (approx 20-50 units away mapped to 0-1 range)
                focalLength={0.15}   // 150mm lens feel
                bokehScale={2}
                height={480}
            />
            <Bloom
                intensity={1.0}
                luminanceThreshold={0.5}
                luminanceSmoothing={0.9}
                mipmapBlur
            />
            <Noise
                opacity={0.02}
                blendFunction={BlendFunction.OVERLAY}
            />
        </EffectComposer>
    );
};
