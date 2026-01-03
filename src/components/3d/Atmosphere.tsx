import React from 'react';
import { Environment, SoftShadows } from '@react-three/drei';

export const Atmosphere: React.FC = () => {
    return (
        <>
            {/* Cinematic Background & Reflection Environment */}
            <Environment preset="forest" background={false} blur={0.8} />

            {/* Advanced Shadow System */}
            <SoftShadows size={25} samples={16} focus={0.5} />

            {/* Key Light - Warm Sunlight */}
            <directionalLight
                position={[10, 20, 10]}
                intensity={2.5}
                castShadow
                shadow-bias={-0.0001}
                shadow-mapSize={[2048, 2048]}
                color="#fff0dd"
            />

            {/* Fill Light - Cool Skylight */}
            <ambientLight intensity={0.5} color="#cceeff" />

            {/* Rim Light for depth */}
            <spotLight
                position={[-10, 10, -5]}
                intensity={1.5}
                color="#b3d9ff"
                angle={0.5}
            />

            {/* Gentle Fog for depth cueing */}
            <fog attach="fog" args={['#d9e7ff', 30, 90]} />
        </>
    );
};
