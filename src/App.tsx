import { useEffect, Suspense, lazy } from 'react';
import { useStore } from './store/useStore';
import { useEmotionData } from './hooks/useEmotionData';
import './App.css';

// Lazy load heavy 3D components for code splitting
const EmotionForest = lazy(() => import('./components/3d/EmotionForest').then(module => ({ default: module.EmotionForest })));

// Loading fallback with improved visuals
const LoadingFallback = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#22190c] z-[9999]">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-[#cea86c]/30 border-t-[#cea86c] rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-[#cea86c] rounded-full animate-pulse"></div>
      </div>
    </div>
    <div className="mt-4 text-[#cea86c] text-sm font-serif tracking-widest uppercase animate-pulse">
      Gerando Floresta...
    </div>
  </div>
);

function App() {
  const { seed, setEmotions } = useStore();
  const initialEmotions = useEmotionData(10, seed);

  // Sync initial emotions
  useEffect(() => {
    setEmotions(initialEmotions);
  }, [initialEmotions, setEmotions]);

  // The layout is handled inside EmotionForest to ensure full coverage
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EmotionForest />
      {/* Modal is handled within EmotionForest for 3D cinematic effect */}
    </Suspense>
  );
}

export default App;
