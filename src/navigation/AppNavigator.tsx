import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AudioPlayer } from '../components/AudioPlayer';
import { AddBookScreen } from '../screens/AddBookScreen';
import { BookDetailScreen } from '../screens/BookDetailScreen';
import { DrivingModeScreen } from '../screens/DrivingModeScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { usePlayerStore } from '../store/playerStore';
import { colors, spacing } from '../theme/colors';
import { Book, MainTab } from '../types';

const tabs: Array<{ key: MainTab; label: string; icon: string }> = [
  { key: 'Home', label: 'Home', icon: '⌂' },
  { key: 'Library', label: 'Library', icon: '▦' },
  { key: 'Add', label: 'Add', icon: '＋' },
  { key: 'Player', label: 'Player', icon: '♪' }
];

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary
  }
};

export const AppNavigator = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('Home');
  const [detailBook, setDetailBook] = useState<Book | null>(null);
  const [isCarMode, setIsCarMode] = useState(false);
  const activeBook = usePlayerStore((state) => state.activeBook);

  const openBook = (book: Book) => setDetailBook(book);

  const renderScreen = () => {
    if (isCarMode) {
      return <DrivingModeScreen onExit={() => setIsCarMode(false)} />;
    }

    if (detailBook) {
      return <BookDetailScreen book={detailBook} onClose={() => setDetailBook(null)} onPlay={() => setActiveTab('Player')} />;
    }

    if (activeTab === 'Home') {
      return <HomeScreen onNavigate={setActiveTab} onOpenBook={openBook} />;
    }
    if (activeTab === 'Library') {
      return <LibraryScreen onOpenBook={openBook} />;
    }
    if (activeTab === 'Add') {
      return <AddBookScreen />;
    }
    return <PlayerScreen />;
  };

  return (
    <NavigationContainer theme={theme}>
      <View style={styles.shell}>
        {renderScreen()}
        {activeBook ? <AudioPlayer /> : null}
        {!isCarMode ? (
          <View style={styles.tabBar}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key && !detailBook;
              return (
                <Pressable key={tab.key} style={styles.tabButton} onPress={() => { setDetailBook(null); setActiveTab(tab.key); }}>
                  <Text style={[styles.tabIcon, isActive && styles.activeTab]}>{tab.icon}</Text>
                  <Text style={[styles.tabLabel, isActive && styles.activeTab]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {activeTab === 'Player' && activeBook ? (
          <Pressable style={styles.carButton} onPress={() => setIsCarMode(true)}>
            <Text style={styles.carButtonText}>Car mode</Text>
          </Pressable>
        ) : null}
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
    height: 66,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  tabButton: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 2 },
  tabIcon: { color: colors.textSubtle, fontSize: 20, fontWeight: '900' },
  tabLabel: { color: colors.textSubtle, fontSize: 11, fontWeight: '800' },
  activeTab: { color: colors.primary },
  carButton: { position: 'absolute', right: spacing.xl, bottom: 166, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999 },
  carButtonText: { color: colors.background, fontWeight: '900' }
});
