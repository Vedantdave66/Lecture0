import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
