import * as THREE from 'three';

export interface TreeConfig {
    height: number;
    baseRadius: number;
    taper: number;
    levels: number;
    branchesPerNodeMin: number;
    branchesPerNodeMax: number;
    splitAngleMin: number;
    splitAngleMax: number;
}

export interface Branch {
    curve: THREE.CatmullRomCurve3;
    radiusBottom: number;
    radiusTop: number;
    level: number;
    children: Branch[];
}

export interface TreeData {
    branches: Branch[];
    leafPositions: THREE.Vector3[];
    leafQuaternions: THREE.Quaternion[];
    leafScales: number[];
}

export function createTaperedTubeGeometry(
    curve: THREE.Curve<THREE.Vector3>,
    tubularSegments: number,
    radiusBottom: number,
    radiusTop: number,
    radialSegments: number = 8
) {
    const frames = curve.computeFrenetFrames(tubularSegments, false);
    const position = new THREE.BufferAttribute(new Float32Array((tubularSegments + 1) * (radialSegments + 1) * 3), 3);
    const uv = new THREE.BufferAttribute(new Float32Array((tubularSegments + 1) * (radialSegments + 1) * 2), 2);
    const normal = new THREE.BufferAttribute(new Float32Array((tubularSegments + 1) * (radialSegments + 1) * 3), 3);
    const index: number[] = [];

    let vertexIndex = 0;
    for (let i = 0; i <= tubularSegments; i++) {
        const v = i / tubularSegments;
        const currentRadius = radiusBottom * (1 - v) + radiusTop * v;
        const P = curve.getPointAt(v);

        const N = frames.normals[i];
        const B = frames.binormals[i];

        for (let j = 0; j <= radialSegments; j++) {
            const u = j / radialSegments;
            const theta = u * Math.PI * 2;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            const vertexNormal = new THREE.Vector3()
                .copy(N).multiplyScalar(cosTheta)
                .add(new THREE.Vector3().copy(B).multiplyScalar(sinTheta))
                .normalize();

            normal.setXYZ(vertexIndex, vertexNormal.x, vertexNormal.y, vertexNormal.z);

            const pos = new THREE.Vector3().copy(P).add(vertexNormal.clone().multiplyScalar(currentRadius));
            position.setXYZ(vertexIndex, pos.x, pos.y, pos.z);

            uv.setXY(vertexIndex, u, v);
            vertexIndex++;
        }
    }

    for (let j = 1; j <= tubularSegments; j++) {
        for (let i = 1; i <= radialSegments; i++) {
            const a = (radialSegments + 1) * (j - 1) + (i - 1);
            const b = (radialSegments + 1) * j + (i - 1);
            const c = (radialSegments + 1) * j + i;
            const d = (radialSegments + 1) * (j - 1) + i;

            index.push(a, b, d);
            index.push(b, c, d);
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', position);
    geom.setAttribute('normal', normal);
    geom.setAttribute('uv', uv);
    geom.setIndex(index);
    return geom;
}

export function generateTreeData(config: TreeConfig): TreeData {
    const branches: Branch[] = [];
    const leafPositions: THREE.Vector3[] = [];
    const leafQuaternions: THREE.Quaternion[] = [];
    const leafScales: number[] = [];

    const addBranch = (
        parentPos: THREE.Vector3,
        direction: THREE.Vector3,
        radius: number,
        level: number
    ): Branch | null => {
        if (level > config.levels) return null;

        const length = level === 0 ? config.height : config.height * Math.pow(0.7, level);
        const radiusBottom = radius;
        const radiusTop = radiusBottom * config.taper;

        // Create curve points with slight organic noise
        const segments = level === 0 ? 5 : 3;
        const points: THREE.Vector3[] = [parentPos.clone()];
        const currentDir = direction.clone().normalize();
        let currentPos = parentPos.clone();

        for (let i = 1; i <= segments; i++) {
            const stepLength = length / segments;
            // organic sway per segment
            const dx = (Math.random() - 0.5) * 0.4 * (level + 1);
            const dy = (Math.random() - 0.5) * 0.4 * (level + 1);
            const dz = (Math.random() - 0.5) * 0.4 * (level + 1);
            const noiseVec = new THREE.Vector3(dx, dy, dz).multiplyScalar(stepLength * 0.5);

            currentDir.add(noiseVec).normalize();
            // gravity/phototropism: tend slightly upwards unless very high level
            if (level > 0 && level < config.levels - 1) {
                currentDir.y += 0.2;
                currentDir.normalize();
            }

            currentPos = currentPos.clone().add(currentDir.clone().multiplyScalar(stepLength));
            points.push(currentPos.clone());
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const children: Branch[] = [];

        // Create children
        if (level < config.levels) {
            // For level 0 (trunk), we might branch off at multiple points along the top half
            // For other levels, mostly at the top node
            const numBranches = Math.floor(Math.random() * (config.branchesPerNodeMax - config.branchesPerNodeMin + 1)) + config.branchesPerNodeMin;

            for (let i = 0; i < numBranches; i++) {
                // Start node for branching: if trunk, pick points near the top. If branch, from the end.
                const t = level === 0 ? 0.3 + 0.7 * Math.random() : 0.8 + 0.2 * Math.random();
                const startPos = curve.getPointAt(t);
                const tangent = curve.getTangentAt(t).normalize();

                // Create random rotation away from tangent
                const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
                const angle = config.splitAngleMin + Math.random() * (config.splitAngleMax - config.splitAngleMin);

                const newDir = tangent.clone().applyAxisAngle(axis, angle);

                // Ensure newDir points outwards horizontally as well
                if (level > 0) {
                    const outward = new THREE.Vector3(startPos.x, 0, startPos.z).normalize();
                    newDir.add(outward.multiplyScalar(0.3)).normalize();
                }

                const childRadius = radiusBottom * (1 - t) + radiusTop * t;
                const childBranch = addBranch(startPos, newDir, childRadius * 0.7, level + 1);
                if (childBranch) children.push(childBranch);
            }
        } else {
            // Terminal branch, add leaves
            const numLeaves = 4 + Math.floor(Math.random() * 4);
            for (let i = 0; i < numLeaves; i++) {
                const t = 0.5 + 0.5 * Math.random();
                const pos = curve.getPointAt(t);

                // Push slightly outwards from the branch
                const offset = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.5);
                pos.add(offset);

                leafPositions.push(pos);

                // Random orientation for the leaf
                const euler = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                const quat = new THREE.Quaternion().setFromEuler(euler);
                leafQuaternions.push(quat);

                const scale = 0.6 + Math.random() * 0.8;
                leafScales.push(scale);
            }
        }

        return { curve, radiusBottom, radiusTop, level, children };
    };

    const trunk = addBranch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), config.baseRadius, 0);
    if (trunk) branches.push(trunk);

    return { branches, leafPositions, leafQuaternions, leafScales };
}
