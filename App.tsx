import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { audioService } from './src/services/audioService';
import { useLibraryStore } from './src/store/libraryStore';
import { RootStackParamList } from './src/types';

const OPENAI_KEY_STORAGE = 'bookdrive:openai_key';

export default function App() {
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    const init = async () => {
      await hydrateLibrary();
      await audioService.setup();

      // Navigate to API key screen if the user hasn't set one yet
      const key = await AsyncStorage.getItem(OPENAI_KEY_STORAGE);
      if (!key) {
        // Use a small delay to let the navigator mount
        setTimeout(() => {
          navRef.current?.navigate('ApiKey');
        }, 100);
      }
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
