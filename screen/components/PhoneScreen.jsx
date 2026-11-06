import { useState } from 'react';
import ProfileScreen, { StatusBar } from './ProfileScreen.jsx';
import AccessoriesSheet from './AccessoriesSheet.jsx';
import { DogStoreProvider } from '../state/dogStore.jsx';

// Everything inside the iPhone screen: the profile (pushed back while a sheet is open),
// the Dog sheet and the system status bar on top. The dog store (balance, bought and worn
// accessories) is shared by the profile and the sheet.
export default function PhoneScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <DogStoreProvider>
    <div className={`phone${sheetOpen ? ' sheet-open' : ''}`}>
      <div className="presenting" aria-hidden={sheetOpen}>
        <ProfileScreen onMascotPress={() => setSheetOpen(true)} />
        <div className="presenting-dim" />
      </div>
      <AccessoriesSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <StatusBar />
    </div>
    </DogStoreProvider>
  );
}
