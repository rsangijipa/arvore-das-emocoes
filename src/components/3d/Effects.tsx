import React from 'react';
import { EffectComposer, Bloom, DepthOfField, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

interface EffectsProps {
    quality: string;
    isCinematic?: boolean;
}

export const Effects: React.FC<EffectsProps> = ({ quality, isCinematic }) => {
    if (quality === 'Low') {
        return (
            <EffectComposer>
                <Bloom intensity={0.5} luminanceThreshold={0.8} />
            </EffectComposer>
        );
    }

    return (
        <EffectComposer>
            {isCinematic ? (
                <DepthOfField
                    focusDistance={0.02} // Adjusted for cinematic modal view
                    focalLength={0.4}
                    bokehScale={quality === 'High' ? 4 : 2}
                />
            ) : <></>}

            <Bloom
                intensity={isCinematic ? 1.4 : (quality === 'High' ? 1.0 : 0.7)}
                luminanceThreshold={isCinematic ? 0.2 : 0.5}
                mipmapBlur
            />

            <Noise
                opacity={0.01}
                blendFunction={BlendFunction.OVERLAY}
            />
        </EffectComposer>
    );
};
