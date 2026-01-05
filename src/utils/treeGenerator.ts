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

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const generateProceduralTree = (seed: number): TreeData => {
    const branches: BranchData[] = [];
    const leafAnchors: THREE.Matrix4[] = [];

    // Seeded RNG
    const rng = createRng(seed);

    // DYNAMIC FRACTAL PARAMETERS (Determined by Seed)
    // This creates "Different Species" for every seed

    // 1. Structure Style
    // 0 = Strict Bifurcation (2)
    // 1 = Mixed (2 or 3)
    // 2 = Unbalanced (Main + Side)
    const style = Math.floor(rng() * 3);

    // 2. Geometry Parameters
    // Angle: Narrow (0.3) to Wide (0.9)
    const SPLIT_ANGLE = 0.3 + (rng() * 0.5);

    // Decay: Fast (0.75) to Slow (0.85 - Tall tree)
    const LENGTH_DECAY = 0.75 + (rng() * 0.12);

    // Trunk: Short (2.5) to Tall (5.0)
    const TRUNK_LENGTH = 2.5 + (rng() * 2.5);

    // Depth: 5
    const MAX_DEPTH = 5;

    // Trifurcated Chance (for Mixed style)
    const TRIFURCATION_CHANCE = style === 1 ? (0.2 + rng() * 0.6) : 0;

    // Constant parameter not derived from RNG
    const THICKNESS_DECAY = 0.75; // Retain original value as it's not in the dynamic list

    const growFractal = (
        start: THREE.Vector3,
        direction: THREE.Vector3,
        length: number,
        thickness: number,
        depth: number,
        currentOrder: number
    ) => {
        const end = start.clone().add(direction.clone().multiplyScalar(length));

        branches.push({
            start,
            end,
            thickness,
            order: currentOrder
        });

        // LEAF GENERATION
        // Only on tips or high order branches
        if (depth <= 2) {
            const isTip = depth === 0;
            const baseCount = isTip ? 4 : 1;
            const count = Math.floor(baseCount + rng() * 2);

            for (let k = 0; k < count; k++) {
                const anchorMatrix = new THREE.Matrix4();

                const spread = isTip ? 1.0 : 0.3;
                const leafPos = end.clone().add(new THREE.Vector3(
                    (rng() - 0.5) * spread,
                    (rng() - 0.5) * spread,
                    (rng() - 0.5) * spread
                ));

                const rot = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    direction
                );
                rot.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(
                    (rng() - 0.5) * 2, rng() * Math.PI * 2, (rng() - 0.5) * 2
                )));

                anchorMatrix.compose(leafPos, rot, new THREE.Vector3(1, 1, 1));
                leafAnchors.push(anchorMatrix);
            }
        }

        // RECURSION
        if (depth > 0) {
            const up = new THREE.Vector3(0, 1, 0);
            let right = new THREE.Vector3().crossVectors(direction, up).normalize();
            if (right.lengthSq() < 0.001) right = new THREE.Vector3(1, 0, 0);
            const forward = new THREE.Vector3().crossVectors(right, direction).normalize();

            // Rotate bifurcation plane
            const planeRotation = GOLDEN_ANGLE * (MAX_DEPTH - depth); // Consistent Spiral
            right.applyAxisAngle(direction, planeRotation);
            forward.applyAxisAngle(direction, planeRotation);

            // Determine Branch Count
            let branchCount = 2;
            if (style === 1 && rng() < TRIFURCATION_CHANCE) branchCount = 3;

            for (let i = 0; i < branchCount; i++) {
                let angle = 0;
                let lenMult = 1.0;

                // Angle Logic per Style
                if (branchCount === 3) {
                    // -Angle, 0, +Angle
                    angle = (i - 1) * SPLIT_ANGLE;
                    if (i === 1) lenMult = 1.1; // Center longer
                }
                else {
                    // Bi-furcation
                    const sign = i === 0 ? 1 : -1;
                    angle = SPLIT_ANGLE * sign;

                    if (style === 2) {
                        // Unbalanced: One shoots straightish, one shoots out
                        if (i === 0) { angle *= 0.2; lenMult = 1.2; } // Main leader
                        else { angle *= 1.5; lenMult = 0.8; } // Side branch
                    }
                }

                const newDir = direction.clone()
                    .applyAxisAngle(forward, angle)
                    .normalize();

                growFractal(
                    end,
                    newDir,
                    length * LENGTH_DECAY * lenMult,
                    thickness * THICKNESS_DECAY,
                    depth - 1,
                    currentOrder + 1
                );
            }
        }
    };

    // Initial Trunk
    growFractal(
        new THREE.Vector3(0, -2, 0),
        new THREE.Vector3(0, 1, 0),
        TRUNK_LENGTH,
        2.2,
        MAX_DEPTH,
        0
    );

    // Sort leaves
    leafAnchors.sort((a, b) => {
        const posA = new THREE.Vector3(); a.decompose(posA, new THREE.Quaternion(), new THREE.Vector3());
        const posB = new THREE.Vector3(); b.decompose(posB, new THREE.Quaternion(), new THREE.Vector3());
        return posB.y - posA.y;
    });

    return { branches, leafAnchors };
};
