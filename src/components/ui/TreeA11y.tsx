import React from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import type { TreeGenerationResult } from '../../hooks/useTreeGeneration';
import type { EmotionData } from '../../types';
import { RAW_MESSAGES } from '../../data/messages';

interface TreeA11yProps {
    treeData: TreeGenerationResult;
    emotions: EmotionData[];
    onLeafClick: (emotion: EmotionData) => void;
}

export const TreeA11y: React.FC<TreeA11yProps> = ({ treeData, emotions, onLeafClick }) => {
    const { setFocusedLeaf, setSelectedMessage, setInteractionLock } = useStore();
    const { messageGroups } = treeData;

    // Flatten message leaves into a list of interactables
    const interactables = React.useMemo(() => {
        const list: {
            emotion: EmotionData;
            matrix: THREE.Matrix4;
            textureIndex: number;
            groupIndex: number; // same as textureIndex basically
            instanceId: number; // We need to know which instance it is in the group? 
            // Actually, in useTreeGeneration, messageGroups[i].transforms[j] corresponds to...
            // Wait, useTreeGeneration logic:
            // mGroups[texIdx].transforms.push(matrix)
            // mGroups[texIdx].originalIndices.push(emotionIndex)
            // So transforms[j] matches originalIndices[j]
        }[] = [];

        messageGroups.forEach((group, groupIdx) => {
            group.transforms.forEach((matrix, i) => {
                const emotionIdx = group.originalIndices[i];
                const emotion = emotions[emotionIdx];
                if (emotion) {
                    list.push({
                        emotion,
                        matrix,
                        textureIndex: groupIdx,
                        groupIndex: groupIdx,
                        instanceId: i
                    });
                }
            });
        });

        // Sort by height (y) to give a logical tab order (bottom to top? or top to bottom?)
        // Or maybe angular? Let's do bottom-to-top (y axis)
        const vec = new THREE.Vector3();
        list.sort((a, b) => {
            const yA = vec.setFromMatrixPosition(a.matrix).y;
            const yB = vec.setFromMatrixPosition(b.matrix).y;
            return yA - yB;
        });

        return list;
    }, [messageGroups, emotions]);

    const handleFocus = (_item: typeof interactables[0]) => {
        // Optional: Move camera slightly or just highlight?
        // For now, allow native focus ring on the button.
    };

    const handleClick = (item: typeof interactables[0]) => {
        setInteractionLock(true);
        setTimeout(() => setInteractionLock(false), 1000);

        // 1. Set 3D Focus State
        // We need the world matrix. The matrix in treeData is local to the tree group? 
        // In InstancedTree, the group is at [0, -2, 0].
        // So we need to apply that offset.
        const worldMatrix = item.matrix.clone();
        worldMatrix.premultiply(new THREE.Matrix4().makeTranslation(0, -2, 0)); // Parent Group position

        setFocusedLeaf({
            id: item.emotion.id,
            textureIndex: item.textureIndex,
            instanceId: item.instanceId,
            matrix: worldMatrix
        });

        // 2. Set Message
        const msg = RAW_MESSAGES[Math.floor(Math.random() * RAW_MESSAGES.length)];
        setTimeout(() => setSelectedMessage(msg), 200);

        // 3. Notify Parent
        onLeafClick(item.emotion);
    };

    return (
        <ul className="sr-only" aria-label="Lista de Folhas de Emoções Interativas">
            {interactables.map((item) => (
                <li key={`${item.groupIndex}-${item.instanceId}`}>
                    <button
                        onClick={() => handleClick(item)}
                        onFocus={() => handleFocus(item)}
                        aria-label={`Ver mensagem de ${item.emotion.subcategory || item.emotion.category}`}
                    >
                        {item.emotion.subcategory}
                    </button>
                </li>
            ))}
        </ul>
    );
};
