import { useEffect, Suspense, lazy } from 'react';
import { useStore } from './store/useStore';
import { useEmotionData } from './hooks/useEmotionData';
import './App.css';

// Lazy load heavy 3D components for code splitting
const EmotionForest = lazy(() => import('./components/3d/EmotionForest').then(module => ({ default: module.EmotionForest })));

// Loading fallback
const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#22190c]">
    <div className="text-white text-sm font-serif">Carregando Floresta...</div>
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
