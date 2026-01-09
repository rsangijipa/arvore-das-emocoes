import React from 'react';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';


interface EffectsProps {
    quality: string;
    isCinematic?: boolean;
}

export const Effects: React.FC<EffectsProps> = ({ quality, isCinematic }) => {
    // Aggressive Optimization: No Effects in Low Quality
    if (quality === 'Low') return null;

    // Basic Bloom for all levels to test stability first
    return (
        <EffectComposer>
            {isCinematic ? (
                <DepthOfField
                    focusDistance={0.02}
                    focalLength={0.4}
                    bokehScale={quality === 'High' ? 4 : 2}
                />
            ) : <></>}

            <Bloom
                intensity={isCinematic ? 1.0 : (quality === 'High' ? 0.8 : 0.5)}
                luminanceThreshold={0.5}
            />
        </EffectComposer>
    );
};
