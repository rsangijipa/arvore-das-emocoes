import * as THREE from 'three';
import { createRng } from './random';


export interface TreeData {
    branches: BranchData[];
    leafAnchors: THREE.Matrix4[];
}

interface BranchData {
    start: THREE.Vector3;
    end: THREE.Vector3;
    thickness: number;
    order: number; // Depth/Time for animation
}

export const generateProceduralTree = (seed: number): TreeData => {
    const branches: BranchData[] = [];
    const leafAnchors: THREE.Matrix4[] = [];

    const rng = createRng(seed);

    // Fractal Parameters
    const initialSplitAngle = 0.5; // Base angle
    const lengthDecay = 0.82;
    const thicknessDecay = 0.7;
    const maxDepth = 6;
    const gnarl = 0.2; // Random organic twist

    // Controlled Asymmetry
    const asymmetry = 0.1; // Branch length variation

    const grow = (
        start: THREE.Vector3,
        direction: THREE.Vector3,
        length: number,
        thickness: number,
        depth: number,
        order: number
    ) => {
        // Organic twist
        if (depth < maxDepth && depth > 1) {
            direction.x += (rng() - 0.5) * gnarl;
            direction.z += (rng() - 0.5) * gnarl;
            direction.normalize();
        }

        const end = start.clone().add(direction.clone().multiplyScalar(length));

        branches.push({
            start,
            end,
            thickness,
            order
        });

        if (depth === 0) {
            // Leaf Tip
            const anchor = new THREE.Matrix4();
            // Align Y+ with branch direction
            const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

            // Add random roll for variety
            const roll = new THREE.Quaternion().setFromAxisAngle(direction, rng() * Math.PI * 2);
            rot.multiply(roll);

            anchor.compose(end, rot, new THREE.Vector3(1, 1, 1));
            leafAnchors.push(anchor);
            return;
        }

        // Branching Logic
        const up = new THREE.Vector3(0, 1, 0);
        let axis = new THREE.Vector3().crossVectors(direction, up).normalize();
        if (axis.lengthSq() < 0.001) axis = new THREE.Vector3(1, 0, 0);

        // Rotate axis randomly for 3D fullness
        const axisRot = new THREE.Quaternion().setFromAxisAngle(direction, rng() * Math.PI);
        axis.applyQuaternion(axisRot);

        // Branch 1
        const angle1 = initialSplitAngle + (rng() - 0.5) * 0.2;
        const dir1 = direction.clone().applyAxisAngle(axis, angle1).normalize();
        // Asymmetric growth
        const len1 = length * lengthDecay * (1 + (rng() - 0.5) * asymmetry);
        grow(end, dir1, len1, thickness * thicknessDecay, depth - 1, order + 1);

        // Branch 2
        const angle2 = -(initialSplitAngle + (rng() - 0.5) * 0.2);
        const dir2 = direction.clone().applyAxisAngle(axis, angle2).normalize();
        const len2 = length * lengthDecay * (1 - (rng() - 0.5) * asymmetry);
        grow(end, dir2, len2, thickness * thicknessDecay, depth - 1, order + 1);
    };

    // Initial Trunk
    // Tweak starting position slightly higher for better visibility
    const startPos = new THREE.Vector3(0, -3, 0);
    const startDir = new THREE.Vector3(0, 1, 0);

    grow(
        startPos,
        startDir,
        3.5, // Base Trunk Length
        1.2, // Base Thickness (visual)
        maxDepth,
        0
    );

    return { branches, leafAnchors };
};
