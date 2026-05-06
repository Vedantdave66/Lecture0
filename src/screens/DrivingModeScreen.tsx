import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DrivingControls } from '../components/DrivingControls';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, typography } from '../theme/colors';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DrivingMode'>;

export const DrivingModeScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((state) => state.getBookById(route.params.bookId));
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const toggle = usePlayerStore((state) => state.toggle);
  const skipBack = usePlayerStore((state) => state.skipBack);
  const skipForward = usePlayerStore((state) => state.skipForward);

  return (
    <Pressable style={styles.screen} onPress={() => navigation.goBack()}>
      <View style={styles.grain} pointerEvents="none" />
      <View style={styles.header}>
        <Text style={styles.now}>Driving Mode</Text>
        <Text style={styles.title} numberOfLines={2}>{book?.title ?? 'No book selected'}</Text>
        <Text style={styles.chapter}>Chapter / chunk {(book?.currentChunkIndex ?? 0) + 1}</Text>
      </View>
      <Pressable onPress={(event) => event.stopPropagation()} style={styles.controlsShell}>
        <DrivingControls isPlaying={isPlaying} onToggle={() => void toggle()} onSkipBack={() => void skipBack(30)} onSkipForward={() => void skipForward(30)} />
      </Pressable>
      <Text style={styles.exit}>Tap empty space to exit</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020204', padding: 28, justifyContent: 'space-between' },
  grain: { ...StyleSheet.absoluteFillObject, opacity: 0.08, backgroundColor: colors.accent },
  header: { marginTop: 40 },
  now: { color: colors.accent, fontSize: 18, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '800' },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 42, marginTop: 16, lineHeight: 48 },
  chapter: { color: colors.textMuted, fontSize: 24, marginTop: 10 },
  controlsShell: { width: '100%' },
  exit: { color: colors.textMuted, textAlign: 'center', fontSize: 18, marginBottom: 22 }
});
