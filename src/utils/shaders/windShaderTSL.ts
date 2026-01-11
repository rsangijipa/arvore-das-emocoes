import * as THREE from 'three';
// @ts-ignore - TSL is experimental and types might be missing in some setups
import { Fn, float, vec2, vec3, uniform, positionLocal, instanceMeshMatrix, timerLocal, sin, cos, smoothstep, dot } from 'three/tsl';

/**
 * TSL (Three.js Shading Language) implementation of the wind shader.
 * Ready for WebGPU usage.
 */

// Define uniforms
const uWindParams = uniform(new THREE.Vector2(0.5, 0.1)); // speed, strength

export const windOffset = Fn((inputs: any) => {
    const position = inputs; // Inputs is usually the first argument if only one passed? 
    // Actually Fn arguments handling is flexible. 
    // If we call windOffset(positionNode), inputs will be positionNode.
    // If we passed an array, it might be destructurable.
    // Let's assume usage windOffset(positionLocal)

    const windSpeed = uWindParams.x;
    const windStrength = uWindParams.y;

    // Get instance position from matrix (column 3 is position)
    // instanceMeshMatrix is mat4.
    const instancePos = vec3(
        instanceMeshMatrix[3][0],
        instanceMeshMatrix[3][1],
        instanceMeshMatrix[3][2]
    );

    // Optimized hash/phase
    // float phase = dot(instancePos.xz, vec2(12.9898, 78.233));
    const phase = dot(instancePos.xz, vec2(12.9898, 78.233));

    // Time
    const t = timerLocal();

    // 1. Structural Sway
    // float sway = sin(uTime * 0.5 * windSpeed + phase * 0.1) * 0.2 * windStrength;
    const sway = sin(t.mul(0.5).mul(windSpeed).add(phase.mul(0.1))).mul(0.2).mul(windStrength);

    // 2. Leaf Flutter
    // float flutter = sin(uTime * 3.0 + phase) * 0.05 * windStrength;
    const flutter = sin(t.mul(3.0).add(phase)).mul(0.05).mul(windStrength);

    // Height influence
    // float heightFactor = smoothstep(0.0, 8.0, instancePos.y);
    const heightFactor = smoothstep(0.0, 8.0, instancePos.y);

    // Apply deformations
    const newPos = vec3(position);

    // transformed.x += sway * heightFactor + flutter;
    newPos.x.addAssign(sway.mul(heightFactor).add(flutter));

    // transformed.y += flutter * 0.5;
    newPos.y.addAssign(flutter.mul(0.5));

    // transformed.z += flutter * 0.5;
    newPos.z.addAssign(flutter.mul(0.5));

    // Rotation approx
    // float angle = sway * 0.15 * heightFactor;
    const angle = sway.mul(0.15).mul(heightFactor);
    const c = cos(angle);
    const s = sin(angle);

    // Rotation around Y (simplified)
    const tx = newPos.x.mul(c).sub(newPos.z.mul(s));
    const tz = newPos.x.mul(s).add(newPos.z.mul(c));

    newPos.x.assign(tx);
    newPos.z.assign(tz);

    return newPos;
});
