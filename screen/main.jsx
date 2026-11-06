import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import IPhonePreview from './components/IPhonePreview.jsx';
import PhoneScreen from './components/PhoneScreen.jsx';
import { clearDogStore } from './state/dogStore.jsx';

// Preview app. Restart (in the preview panel, outside the Dog UI) clears the saved shop state and
// starts the screen again from scratch: 3000 stars, nothing bought, only the free hat, Original Dog.
function App() {
  const [run, setRun] = useState(0);
  const restart = () => { clearDogStore(); setRun(r => r + 1); };
  return (
    <IPhonePreview onRestart={restart}>
      <PhoneScreen key={run} />
    </IPhonePreview>
  );
}

createRoot(document.getElementById('root')).render(<App />);
