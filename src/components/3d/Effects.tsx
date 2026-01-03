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
                focusDistance={isCinematic ? 0.005 : 0.02} // Closer focus for cinematic
                focalLength={isCinematic ? 0.2 : 0.15}
                bokehScale={isCinematic ? (quality === 'High' ? 5 : 3) : (quality === 'High' ? 3 : 1.5)}
                height={quality === 'High' ? 720 : 480}
            />
            <Bloom
                intensity={isCinematic ? 1.5 : (quality === 'High' ? 1.2 : 0.8)}
                luminanceThreshold={isCinematic ? 0.2 : 0.4} // Glows more easily
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
