import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { audioService } from './src/services/audioService';
import { useLibraryStore } from './src/store/libraryStore';
import { RootStackParamList } from './src/types';

export default function App() {
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    const init = async () => {
      await hydrateLibrary();
      await audioService.setup();
      // ApiKey screen is optional — accessed from within the Player for Premium Voice.
      // Do NOT redirect on launch. Standard Voice works without any API key.
    };

    void init();
  }, [hydrateLibrary]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator navRef={navRef} />
    </SafeAreaProvider>
  );
}
