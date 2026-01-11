import * as THREE from 'three';

export interface Shader {
    uniforms: { [uniform: string]: THREE.IUniform };
    vertexShader: string;
    fragmentShader: string;
}

/**
 * Patches a standard material shader to add wind animation.
 * Features:
 * - Structural sway (approximate rotation)
 * - Leaf flutter (noise-based offset)
 * - Height-based influence (base is stiffer)
 */
export const windShaderPatch = (shader: Shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWindParams = { value: new THREE.Vector2(0.5, 0.1) }; // speed, strength

    shader.vertexShader = `
        uniform float uTime;
        uniform vec2 uWindParams;
        ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = vec3( position );
        
        float windSpeed = uWindParams.x;
        float windStrength = uWindParams.y;
        
        if (windStrength > 0.001) {
             vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
             
             // Optimized hash for phase (cheaper than sin/cos for noise)
             float phase = dot(instancePos.xz, vec2(12.9898, 78.233));
             
             // 1. Structural Sway (Slow, deep)
             float sway = sin(uTime * 0.5 * windSpeed + phase * 0.1) * 0.2 * windStrength;
             
             // 2. Leaf Flutter (Fast, detailed)
             float flutter = sin(uTime * 3.0 + phase) * 0.05 * windStrength;
             
             // Height influence (stiffer at bottom)
             float heightFactor = smoothstep(0.0, 8.0, instancePos.y); 
             
             // Apply deformations
             transformed.x += sway * heightFactor + flutter;
             transformed.y += flutter * 0.5; // slight bobbing
             transformed.z += flutter * 0.5;
             
             // Simple rotation approximation
             float angle = sway * 0.15 * heightFactor;
             float c = cos(angle);
             float s = sin(angle);
             
             float tx = transformed.x * c - transformed.z * s;
             float tz = transformed.x * s + transformed.z * c;
             transformed.x = tx;
             transformed.z = tz;
        }
        `
    );
};
