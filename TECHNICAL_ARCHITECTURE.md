# Technical Architecture - Árvore das Emoções 3D

## Overview

This document outlines the architecture of the 3D Emotion Tree, optimizing for performance on mobile devices while delivering high-fidelity visuals on desktop.

## Core Components

### 1. Scene Management (`EmotionForest.tsx`)

- **Canvas Configuration**: Managed via `@react-three/fiber` with adaptive pixel ratio (DPR).
- **Lighting**: Split into `SCENE_CONSTANTS` for easy tuning. Uses Directional (Sun) and Hemisphere (Ambient) lights.
- **Environment**: Uses `Background360` for sky sphere and `Environment` preset for reflections.
- **Context Handling**: Robust `ContextMonitor` detects WebGL context loss and restores the scene automatically.

### 2. Tree System (`InstancedTree.tsx`)

- **Instancing**: Uses `THREE.InstancedMesh` for massive performance gains (1 draw call for branches, 1 for leaves).
- **Logic Separation**:
  - `useTreeGeneration`: Pure math / procedural logic.
  - `ResourceManager`: Geometry/Material lifecycle.
  - Component: Rendering and Interaction.
- **Shaders**: Custom `onBeforeCompile` shader injection for GPU-based wind animation.

### 3. Resource Management (`ResourceManager.ts`)

- **Singleton Pattern**: Centralized control of all heavy assets.
- **Textures**: LRU Cache with hard limit (48 textures) to prevent mobile OOM.
- **Geometries**: Shared references.
- **Disposal**: Automatic garbage collection loop runs every 10s to dispose of unused assets.

## Procedural Generation

### Algorithm (`treeGenerator.ts`)

- **Fractal Growth**: Recursive branching with controlled asymmetry.
- **Organic Variation**:
  - `gnarl`: Random direction changes for twisted branches.
  - `asymmetry`: Varied branch lengths.
- **Output**: Deterministic `Matrix4` arrays for instancing, seeded via PRNG.

## Shader System

### Wind Animation

Instead of CPU animation (expensive), we transform vertices in the Vertex Shader.

- **Uniforms**: `uTime`, `uWindParams` (speed, strength).
- **Technique**:
  - `dot(position.xz, ...)` for performant pseudo-random phase.
  - `sin` waves for sway (low frequency) and flutter (high frequency).
  - `instanceMatrix` used to offset phase per-leaf.

## Performance Strategy

### Mobile Optimization

- **Texture resolution**: 512x512 max.
- **Geometry**: Reduced segments (4 vs 6 for branches).
- **LOD**: Distance-based culling (60m vs 100m).
- **No Suspense**: Custom loader uses placeholders to prevent UI blocking.

### Caching

- **ResourceManager**: Tracks `refCount` for every asset.
- **MaterialFactory**: Reuses materials to minimize state changes.

## Debugging

- **WebGL Loss**: Check `ResourceManager` stats via console if crashes occur.
- **Visual Artifacts**: Verify `SCENE_CONSTANTS` in `src/constants/3d.ts`.
