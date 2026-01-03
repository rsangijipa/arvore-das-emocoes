import { useState } from 'react';
import { EmotionForest } from './components/3d/EmotionForest';
import { LeafViewerModal } from './components/ui/LeafViewerModal';
import { useEmotionData } from './hooks/useEmotionData';
import type { EmotionData } from './types';
import './App.css';

function App() {
  const [activeEmotion, setActiveEmotion] = useState<EmotionData | null>(null);
  const emotions = useEmotionData(150);

  // The layout is handled inside EmotionForest to ensure full coverage
  return (
    <>
      <EmotionForest
        emotions={emotions}
        onLeafClick={setActiveEmotion}
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
