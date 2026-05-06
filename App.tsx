import { useEffect } from 'react';
import { StatusBar } from 'react-native';

import { AppNavigator } from './src/navigation/AppNavigator';
import { audioService } from './src/services/audioService';
import { useLibraryStore } from './src/store/libraryStore';

export default function App() {
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateLibrary();
    void audioService.setup();
  }, [hydrateLibrary]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <AppNavigator />
    </>
  );
}
