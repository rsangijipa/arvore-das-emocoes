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
    const maxDepth = 6; // Reduced from 7 to avoid "twig nest"
    // Note: Mobile might need 5, but 6 is a good balance for now.

    const initialSplitAngle = 0.65;
    const lengthDecay = 0.83; // Increased to maintain length (was 0.82)
    const thicknessDecay = 0.78; // Increased to keep branches thicker (was 0.72)
    const gnarl = 0.25; // Slightly reduced twist

    const grow = (
        start: THREE.Vector3,
        direction: THREE.Vector3,
        length: number,
        thickness: number,
        depth: number,
        order: number
    ) => {
        // Organic twist (wobble)
        if (depth < maxDepth && depth > 0) {
            const wobble = (rng() - 0.5) * gnarl;
            direction.x += wobble;
            direction.z += wobble;

            // UpBias for upper levels to avoid drooping too much
            // Applied only on higher orders to give "crown" shape
            if (order > 2) {
                direction.y += 0.25;
            }
            direction.normalize();
        }

        const end = start.clone().add(direction.clone().multiplyScalar(length));

        branches.push({
            start,
            end,
            thickness: Math.max(thickness, 0.08), // Clamp minimum thickness
            order
        });

        // LEAF GENERATION (Cluster at terminals)
        // Generate leaves on last 2 levels (0 and 1)
        if (depth <= 1) { // Reduced to last 2 levels effectively (0, 1) to avoid inner clutter
            // Determine count based on thickness/depth
            // More leaves at terminals to create "clumps"
            const leafCount = depth === 0 ? Math.floor(rng() * 4) + 4 : Math.floor(rng() * 3) + 2;

            for (let l = 0; l < leafCount; l++) {
                const anchor = new THREE.Matrix4();

                // Cluster radius
                const clusterRadius = 0.35 + rng() * 0.2; // Wider clusters
                const offset = new THREE.Vector3(
                    (rng() - 0.5) * clusterRadius,
                    (rng() - 0.5) * clusterRadius,
                    (rng() - 0.5) * clusterRadius
                );

                // Random orientation
                const leafDir = new THREE.Vector3(rng() - 0.5, rng() + 0.3, rng() - 0.5).normalize();
                const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), leafDir);
                const roll = new THREE.Quaternion().setFromAxisAngle(leafDir, rng() * Math.PI * 2);
                rot.multiply(roll);

                // Scale variation - handled in hook, but base here
                const scale = 1.0;

                anchor.compose(end.clone().add(offset), rot, new THREE.Vector3(scale, scale, scale));
                leafAnchors.push(anchor);
            }
        }

        if (depth === 0) return;

        // --- ORGANIC BRANCHING logic ---
        // Base children: 2
        // Lower chance for 3rd/4th branch to avoid density
        let branchCount = 2;
        if (rng() < 0.45) branchCount++; // Reduced probability (was 0.55)
        if (rng() < 0.10 && depth > 3) branchCount++; // Strictly limit 4 branches (was 0.20)

        const up = new THREE.Vector3(0, 1, 0);
        let axis = new THREE.Vector3().crossVectors(direction, up).normalize();
        if (axis.lengthSq() < 0.001) axis = new THREE.Vector3(1, 0, 0);

        // Perturb axis slightly
        const axisRot = new THREE.Quaternion().setFromAxisAngle(direction, rng() * Math.PI * 2);
        axis.applyQuaternion(axisRot);

        const goldenAngle = 2.39996; // Golden Angle ~137.5 deg

        // Base Rotation offset for this node
        const nodeOffset = rng() * Math.PI * 2;

        for (let i = 0; i < branchCount; i++) {
            // Spread logic
            const spread = initialSplitAngle * (0.8 + rng() * 0.4);

            // Rotate around the parent branch axis (Golden Angle distribution)
            // i * goldenAngle ensures non-overlapping distribution
            const spiralRot = new THREE.Quaternion().setFromAxisAngle(direction, nodeOffset + i * goldenAngle);

            // Then rotate OUT from parent
            const outRot = new THREE.Quaternion().setFromAxisAngle(axis, spread);
            outRot.premultiply(spiralRot);

            const newDir = direction.clone().applyQuaternion(outRot).normalize();

            // Asymmetry in length
            const lenMult = lengthDecay * (0.88 + rng() * 0.25); // Less shrink, longer branches

            grow(end, newDir, length * lenMult, thickness * thicknessDecay, depth - 1, order + 1);
        }
    };

    // Initial Trunk
    // Updated to start at Origin (0,0,0) so Container can control Y-position
    const startPos = new THREE.Vector3(0, 0, 0);
    const startDir = new THREE.Vector3(0, 1, 0);

    grow(
        startPos,
        startDir,
        4.0, // Base Trunk Length (taller)
        1.4, // Base Thickness (thicker)
        maxDepth,
        0
    );

    return { branches, leafAnchors };
};
