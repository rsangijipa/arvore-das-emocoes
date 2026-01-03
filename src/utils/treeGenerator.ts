import * as THREE from 'three';

export interface TreeData {
    branches: BranchData[];
    leafPositions: THREE.Matrix4[];
}

interface BranchData {
    start: THREE.Vector3;
    end: THREE.Vector3;
    thickness: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const generateProceduralTree = (seed: number): TreeData => {
    const branches: BranchData[] = [];
    const leafPositions: THREE.Matrix4[] = [];

    // Pseudo-random based on seed (simple implementation)
    const rng = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const growBranch = (
        start: THREE.Vector3,
        direction: THREE.Vector3,
        length: number,
        thickness: number,
        depth: number
    ) => {
        const end = start.clone().add(direction.clone().multiplyScalar(length));

        branches.push({ start, end, thickness });

        if (depth > 0) {
            // Number of sub-branches
            const subBranches = 2 + Math.floor(rng() * 2); // 2 or 3 branches

            for (let i = 0; i < subBranches; i++) {
                // Golden Angle Rotation
                const offset = (i + 1) * GOLDEN_ANGLE + (rng() - 0.5) * 0.5;

                // Rotate direction
                const newDir = direction.clone()
                    .applyAxisAngle(new THREE.Vector3(0, 1, 0), offset) // Rotate around Y (trunk axis approx)
                    .applyAxisAngle(new THREE.Vector3(1, 0, 0), (rng() - 0.5) * 0.5) // Slight random tilt
                    .normalize();

                // Upward bias
                newDir.y += 0.5;
                newDir.normalize();

                growBranch(
                    end,
                    newDir,
                    length * 0.75, // Decay length
                    thickness * 0.7, // Decay thickness
                    depth - 1
                );
            }
        } else {
            // End of branch -> Place Leaf Cluster
            const clusterSize = 3 + Math.floor(rng() * 4);
            for (let j = 0; j < clusterSize; j++) {
                const matrix = new THREE.Matrix4();
                const pos = end.clone();
                // Random spherical spread at tip
                pos.x += (rng() - 0.5) * 2.5;
                pos.y += (rng() - 0.5) * 2.0;
                pos.z += (rng() - 0.5) * 2.5;

                const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                    rng() * Math.PI, rng() * Math.PI, rng() * Math.PI
                ));

                matrix.compose(pos, rot, new THREE.Vector3(0, 0, 0)); // Scale 0 for animation start
                leafPositions.push(matrix);
            }
        }
    };

    // Start Trunk
    growBranch(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 1, 0),
        12, // Initial Length
        1.5, // Initial Thickness
        4 // Recursion Depth
    );

    return { branches, leafPositions };
};
