import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';

import { AppNavigator } from './src/navigation/AppNavigator';
import { audioService } from './src/services/audioService';
import { getOpenAIKey } from './src/services/ttsService';
import { ApiKeyScreen } from './src/screens/ApiKeyScreen';
import { useLibraryStore } from './src/store/libraryStore';
import { colors } from './src/theme/colors';

export default function App() {
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);

  const refreshKeyState = async () => {
    const key = await getOpenAIKey();
    setHasOpenAIKey(Boolean(key));
    setIsCheckingKey(false);
  };

  useEffect(() => {
    void hydrateLibrary();
    void audioService.setup();
    void refreshKeyState();
  }, [hydrateLibrary]);

  if (isCheckingKey) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      {hasOpenAIKey ? <AppNavigator /> : <ApiKeyScreen onSaved={() => void refreshKeyState()} />}
    </>
  );
}
