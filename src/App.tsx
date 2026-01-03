import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { EmotionForest } from './components/3d/EmotionForest';
import { LeafViewerModal } from './components/ui/LeafViewerModal';
import { useEmotionData } from './hooks/useEmotionData';
import './App.css';

function App() {
  const initialEmotions = useEmotionData(150);
  const { focusedEmotion, setEmotions, setFocusedEmotion } = useStore();

  // Sync initial emotions
  useEffect(() => {
    setEmotions(initialEmotions);
  }, [initialEmotions, setEmotions]);

  // The layout is handled inside EmotionForest to ensure full coverage
  return (
    <>
      <EmotionForest />

      {/* Modal is global */}
      <LeafViewerModal
        emotion={focusedEmotion}
        onClose={() => setFocusedEmotion(null)}
      />
    </>
  );
}

export default App;
