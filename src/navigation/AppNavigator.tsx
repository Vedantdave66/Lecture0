import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, NavigationContainerRef, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RefObject } from 'react';
import { Text, View } from 'react-native';

import { AudioPlayer } from '../components/AudioPlayer';
import { TextureOverlay } from '../components/TextureOverlay';
import { AddBookScreen } from '../screens/AddBookScreen';
import { ApiKeyScreen } from '../screens/ApiKeyScreen';
import { BookDetailScreen } from '../screens/BookDetailScreen';
import { DrivingModeScreen } from '../screens/DrivingModeScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors } from '../theme/colors';
import { MainTabParamList, RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent
  }
};

const NowPlayingTab = () => {
  const activeBookId = usePlayerStore((state) => state.activeBookId);
  const book = useLibraryStore((state) => state.books.find((item) => item.id === activeBookId));

  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
      <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 12 }}>Persistent mini player</Text>
      <AudioPlayer title={book?.title} />
    </View>
  );
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 82, paddingBottom: 18, paddingTop: 10 },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarIcon: ({ color, size }) => <Ionicons name={route.name === 'LibraryTab' ? 'library' : 'musical-notes'} color={color} size={size} />
    })}
  >
    <Tab.Screen name="LibraryTab" component={LibraryScreen} options={{ title: 'Library' }} />
    <Tab.Screen name="NowPlayingTab" component={NowPlayingTab} options={{ title: 'Now Playing' }} />
  </Tab.Navigator>
);

type AppNavigatorProps = {
  navRef?: RefObject<NavigationContainerRef<RootStackParamList> | null>;
};

export const AppNavigator = ({ navRef }: AppNavigatorProps) => (
  <NavigationContainer theme={theme} ref={navRef}>
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ApiKey" component={ApiKeyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddBook" component={AddBookScreen} options={{ title: 'Add Book' }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: 'Book Details' }} />
      <Stack.Screen name="Player" component={PlayerScreen} options={{ title: 'Player' }} />
      <Stack.Screen name="DrivingMode" component={DrivingModeScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack.Navigator>
    <TextureOverlay />
    <AudioPlayer />
  </NavigationContainer>
);
