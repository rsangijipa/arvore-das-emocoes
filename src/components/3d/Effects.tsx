import React from 'react';
import { EffectComposer, Bloom, DepthOfField, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

interface EffectsProps {
    quality: string;
}

export const Effects: React.FC<EffectsProps> = ({ quality }) => {
    if (quality === 'Low') {
        return (
            <EffectComposer>
                <Bloom
                    intensity={0.5}
                    luminanceThreshold={0.8}
                    mipmapBlur={false}
                />
            </EffectComposer>
        );
    }

    return (
        <EffectComposer>
            <DepthOfField
                focusDistance={0.02}
                focalLength={0.15}
                bokehScale={quality === 'High' ? 3 : 1.5}
                height={quality === 'High' ? 720 : 480}
            />
            <Bloom
                intensity={quality === 'High' ? 1.2 : 0.8}
                luminanceThreshold={0.4}
                luminanceSmoothing={0.9}
                mipmapBlur
            />
            <Noise
                opacity={0.015}
                blendFunction={BlendFunction.OVERLAY}
            />
        </EffectComposer>
    );
};
