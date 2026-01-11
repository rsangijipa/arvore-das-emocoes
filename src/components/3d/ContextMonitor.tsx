import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

interface ContextMonitorProps {
    setContextLost: (lost: boolean) => void;
    onContextRestored: () => void;
}

export const ContextMonitor: React.FC<ContextMonitorProps> = ({ setContextLost, onContextRestored }) => {
    const { gl } = useThree();

    useEffect(() => {
        const canvas = gl.domElement;

        const handleContextLost = (event: Event) => {
            event.preventDefault(); // Required to allow restoration
            console.warn('WebGL Context Lost!');
            setContextLost(true);
        };

        const handleContextRestored = () => {
            console.log('WebGL Context Restored!');
            setContextLost(false);
            onContextRestored();
        };

        canvas.addEventListener('webglcontextlost', handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

        return () => {
            canvas.removeEventListener('webglcontextlost', handleContextLost);
            canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        };
    }, [gl, setContextLost, onContextRestored]);

    return null;
};
