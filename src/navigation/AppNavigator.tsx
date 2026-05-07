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
import { FindBookScreen } from '../screens/FindBookScreen';
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 }}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>🎧</Text>
      <Text style={{ fontFamily: 'Georgia', fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
        {book?.title ?? 'Nothing playing'}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted }}>
        {book ? 'Open the Player to continue.' : 'Go to your library to start listening.'}
      </Text>
    </View>
  );
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: 82,
        paddingBottom: 18,
        paddingTop: 10,
      },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarIcon: ({ color, size }) => (
        <Ionicons name={route.name === 'LibraryTab' ? 'library' : 'headset'} color={color} size={size} />
      ),
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
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'Georgia', fontWeight: '700', color: colors.text },
        headerShadowVisible: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ApiKey" component={ApiKeyScreen} options={{ title: 'Premium Voice Setup' }} />
      <Stack.Screen name="FindBook" component={FindBookScreen} options={{ title: 'Find a Free Book' }} />
      <Stack.Screen name="AddBook" component={AddBookScreen} options={{ title: 'Upload a File' }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="Player" component={PlayerScreen} options={{ title: 'Player' }} />
      <Stack.Screen name="DrivingMode" component={DrivingModeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  </NavigationContainer>
);
