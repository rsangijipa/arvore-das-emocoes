import * as THREE from 'three';
import { createRng } from '../../../utils/random';

export interface TreeSkeleton {
    segments: TreeSegment[];
    leafPoints: LeafPoint[];
}

export interface TreeSegment {
    start: THREE.Vector3;
    end: THREE.Vector3;
    radiusBottom: number;
    radiusTop: number;
    level: number;
}

export interface LeafPoint {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    scale: number;
    type: 'decorative' | 'message';
}

export class FractalTreeGenerator {
    private rng: () => number;

    constructor(seed: number) {
        this.rng = createRng(seed);
    }

    generate(maxDepth: number = 6): TreeSkeleton {
        const segments: TreeSegment[] = [];
        const leafPoints: LeafPoint[] = [];

        const rootStart = new THREE.Vector3(0, 0, 0);
        const rootDir = new THREE.Vector3(0, 1, 0);
        const rootLen = 4.5;
        const rootThick = 1.2;

        this.growBranch(
            rootStart,
            rootDir,
            rootLen,
            rootThick,
            0,
            maxDepth,
            segments,
            leafPoints
        );

        // Post-processing: Identify Message Leaves (top 15)
        // Score = y * 0.7 + distXZ * 0.3
        const potentialMessages = leafPoints.map((l, i) => ({
            index: i,
            score: l.position.y * 0.7 + new THREE.Vector2(l.position.x, l.position.z).length() * 0.3,
            leaf: l
        }));

        // Sort descending
        potentialMessages.sort((a, b) => b.score - a.score);

        // Pick top 15 and mark them
        const maxMessages = 15;
        const topCandidates = potentialMessages.slice(0, 40); // larger pool

        // Shuffle the pool for variety
        for (let i = topCandidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [topCandidates[i], topCandidates[j]] = [topCandidates[j], topCandidates[i]];
        }

        const selectedIndices = new Set(topCandidates.slice(0, maxMessages).map(c => c.index));

        leafPoints.forEach((l, i) => {
            if (selectedIndices.has(i)) {
                l.type = 'message';
                l.scale = 1.5; // Bigger base scale
            } else {
                l.type = 'decorative';
                l.scale = 0.8 + this.rng() * 0.4;
            }
        });

        return { segments, leafPoints };
    }

    private growBranch(
        start: THREE.Vector3,
        dir: THREE.Vector3,
        length: number,
        radius: number,
        depth: number,
        maxDepth: number,
        segments: TreeSegment[],
        leafPoints: LeafPoint[]
    ) {
        const end = start.clone().add(dir.clone().multiplyScalar(length));

        // Tapering radius
        const radiusTop = radius * 0.7; // Significant taper to avoid tubes

        segments.push({
            start,
            end,
            radiusBottom: radius,
            radiusTop: radiusTop,
            level: depth
        });

        if (depth >= maxDepth) {
            // Leaf Cluster at tip
            this.addLeaves(end, depth, leafPoints);
            return;
        }

        // Branching logic
        // Deterministic split count
        const splitChance = this.rng();
        let branchCount = 2;
        if (splitChance > 0.6) branchCount = 3;
        if (depth === 0) branchCount = 3; // Trunk usually splits well

        // Vectors
        const up = new THREE.Vector3(0, 1, 0);
        let right = new THREE.Vector3().crossVectors(dir, up).normalize();
        if (right.lengthSq() < 0.001) right = new THREE.Vector3(1, 0, 0);

        // Rotate 'right' randomly around 'dir' to get a consistent axis base
        const axisBaseRot = new THREE.Quaternion().setFromAxisAngle(dir, this.rng() * Math.PI * 2);
        right.applyQuaternion(axisBaseRot);

        const lengthDecay = 0.8 + this.rng() * 0.1;
        const radiusDecay = 0.7;

        for (let i = 0; i < branchCount; i++) {
            // Angle
            const angleOut = 0.5 + this.rng() * 0.5; // 0.5 to 1.0 rad
            const angleAround = (i / branchCount) * Math.PI * 2 + (this.rng() * 0.5);

            const rot1 = new THREE.Quaternion().setFromAxisAngle(dir, angleAround);
            const rot2 = new THREE.Quaternion().setFromAxisAngle(right, angleOut);

            // Compose rotation: Twist around axis, then bend out? 
            // Better: Dir -> Rotate around arbitrary axis perpendicular?
            // Simple approach:

            const newDir = dir.clone().applyQuaternion(rot2).applyQuaternion(rot1).normalize();

            // Gravity/Light bias
            if (depth > 2) {
                newDir.y += 0.2; // Grow up
                newDir.normalize();
            }

            this.growBranch(
                end,
                newDir,
                length * lengthDecay,
                radiusTop * radiusDecay,
                depth + 1,
                maxDepth,
                segments,
                leafPoints
            );
        }

        // Side leaves on branches (optional, for fullness)
        if (depth > 2 && this.rng() > 0.5) {
            this.addLeaves(end.clone().lerp(start, 0.5), depth, leafPoints, 1);
        }
    }

    private addLeaves(pos: THREE.Vector3, depth: number, points: LeafPoint[], countOverride?: number) {
        const count = countOverride || (2 + Math.floor(this.rng() * 3));
        for (let i = 0; i < count; i++) {
            const offset = new THREE.Vector3(
                (this.rng() - 0.5) * 0.5,
                (this.rng() - 0.5) * 0.5,
                (this.rng() - 0.5) * 0.5
            );

            // Orientation
            const dir = new THREE.Vector3(this.rng() - 0.5, this.rng() + 0.2, this.rng() - 0.5).normalize();
            const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

            points.push({
                position: pos.clone().add(offset),
                rotation: quat,
                scale: 1,
                type: 'decorative' // Default
            });
        }
    }
}
