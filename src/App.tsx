import { useState } from 'react';
import { EmotionForest } from './components/3d/EmotionForest';
import { LeafViewerModal } from './components/ui/LeafViewerModal';
import { useEmotionData } from './hooks/useEmotionData';
import type { EmotionData } from './types';
import './App.css';

function App() {
  const initialEmotions = useEmotionData(150);
  const [emotions, setEmotions] = useState<EmotionData[]>([]);
  const [activeEmotion, setActiveEmotion] = useState<EmotionData | null>(null);

  // Sync initial emotions
  useState(() => {
    setEmotions(initialEmotions);
  });

  // The layout is handled inside EmotionForest to ensure full coverage
  return (
    <>
      <EmotionForest
        emotions={emotions}
        onLeafClick={setActiveEmotion}
        onEmotionsUpdate={setEmotions}
      />

      {/* Modal is global */}
      <LeafViewerModal
        emotion={activeEmotion}
        onClose={() => setActiveEmotion(null)}
      />
    </>
  );
}

export default App;
