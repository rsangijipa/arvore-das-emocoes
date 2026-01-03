import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { EmotionForest } from './components/3d/EmotionForest';
import { useEmotionData } from './hooks/useEmotionData';
import './App.css';

function App() {
  const { seed, setEmotions } = useStore();
  const initialEmotions = useEmotionData(10, seed);

  // Sync initial emotions
  useEffect(() => {
    setEmotions(initialEmotions);
  }, [initialEmotions, setEmotions]);

  // The layout is handled inside EmotionForest to ensure full coverage
  return (
    <>
      <EmotionForest />
      {/* Modal is handled within EmotionForest for 3D cinematic effect */}
    </>
  );
}

export default App;
