import * as THREE from 'three';
import { resourceManager } from './ResourceManager';
import { TREE_CONSTANTS } from '../constants/3d';

export class MaterialFactory {
    // Shared textures can be passed in or loaded here, but usually passed from components
    // for now we focus on material creation logic

    static createBranchMaterial(): THREE.MeshStandardMaterial {
        const key = 'mat_branch_standard';
        let mat = resourceManager.getMaterials(key) as THREE.MeshStandardMaterial;

        if (!mat) {
            mat = new THREE.MeshStandardMaterial({
                color: TREE_CONSTANTS.BRANCH.COLOR,
                roughness: TREE_CONSTANTS.BRANCH.ROUGHNESS,
                // Fix Z-fighting/Black artifacts on trunk
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            });
            resourceManager.registerMaterial(key, mat);
        } else {
            resourceManager.retainMaterial(key);
        }
        return mat;
    }

    static createSimpleLeafMaterial(): THREE.MeshStandardMaterial {
        const key = 'mat_leaf_simple';
        let mat = resourceManager.getMaterials(key) as THREE.MeshStandardMaterial;

        if (!mat) {
            mat = new THREE.MeshStandardMaterial({
                color: TREE_CONSTANTS.LEAF.COLOR_SIMPLE,
                roughness: TREE_CONSTANTS.LEAF.ROUGHNESS_SIMPLE,
                side: THREE.DoubleSide,
                shadowSide: THREE.DoubleSide,
                transparent: true,
                alphaTest: 0.5,
                depthWrite: false, // Prevents "square" artifacts
            });
            resourceManager.registerMaterial(key, mat);
        } else {
            resourceManager.retainMaterial(key);
        }
        return mat;
    }

    // Message leaves are unique because they have different textures.
    // We can't easily cache them by a single key unless we cache by texture ID.
    static createMessageLeafMaterial(texture: THREE.Texture, index: number): THREE.MeshStandardMaterial {
        const key = `mat_leaf_message_${index}`;
        let mat = resourceManager.getMaterials(key) as THREE.MeshStandardMaterial;

        if (!mat) {
            mat = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.5, // Clean cutout
                side: THREE.DoubleSide,
                shadowSide: THREE.DoubleSide,
                // Avoid "plate" look
                depthWrite: false,
                roughness: TREE_CONSTANTS.LEAF.ROUGHNESS_MESSAGE,
                color: TREE_CONSTANTS.LEAF.COLOR_MESSAGE,
                // Prevent black aliasing
                premultipliedAlpha: true
            });
            resourceManager.registerMaterial(key, mat);
        } else {
            resourceManager.retainMaterial(key);
        }
        return mat;
    }
}
