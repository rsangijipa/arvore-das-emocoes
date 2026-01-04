/**
 * Visibility culling utilities
 * Determines if objects should be rendered based on camera frustum
 */

import * as THREE from 'three';

/**
 * Check if a bounding box is visible in camera frustum
 */
export const isBoundingBoxVisible = (
    boundingBox: THREE.Box3,
    camera: THREE.Camera,
    frustum: THREE.Frustum
): boolean => {
    // Update frustum from camera
    frustum.setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse
        )
    );
    
    return frustum.intersectsBox(boundingBox);
};

/**
 * Check if a point is within camera frustum
 */
export const isPointVisible = (
    point: THREE.Vector3,
    camera: THREE.Camera,
    frustum: THREE.Frustum
): boolean => {
    frustum.setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse
        )
    );
    
    return frustum.containsPoint(point);
};

/**
 * Get distance-based visibility (objects too far are not visible)
 */
export const isWithinRenderDistance = (
    position: THREE.Vector3,
    camera: THREE.Camera,
    maxDistance: number = 200
): boolean => {
    return camera.position.distanceTo(position) <= maxDistance;
};

