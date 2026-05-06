import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DrivingControls } from '../components/DrivingControls';
import { usePlayerStore } from '../store/playerStore';
import { colors, spacing, typography } from '../theme/colors';

type Props = {
  onExit: () => void;
};

export const DrivingModeScreen = ({ onExit }: Props) => {
  const activeBook = usePlayerStore((state) => state.activeBook);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const toggle = usePlayerStore((state) => state.toggle);
  const seekBy = usePlayerStore((state) => state.seekBy);

  return (
    <Pressable style={styles.screen} onPress={onExit}>
      <View style={styles.header}>
        <Text style={styles.now}>Car Mode</Text>
        <Text style={styles.title} numberOfLines={2}>{activeBook?.title ?? 'No active audiobook'}</Text>
        <Text style={styles.chapter}>{activeBook?.currentChapter ?? 'Start playback from Now Playing'}</Text>
      </View>
      <Pressable onPress={(event) => event.stopPropagation()} style={styles.controlsShell}>
        <DrivingControls isPlaying={isPlaying} onToggle={() => void toggle()} onSkipBack={() => void seekBy(-30000)} onSkipForward={() => void seekBy(30000)} />
      </Pressable>
      <Text style={styles.exit}>Tap empty space to exit</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#03050B', padding: spacing.xl, justifyContent: 'space-between' },
  header: { marginTop: spacing.xxxl },
  now: { color: colors.primary, fontSize: typography.subheading, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '900' },
  title: { color: colors.text, fontSize: 40, marginTop: spacing.lg, lineHeight: 46, fontWeight: '900' },
  chapter: { color: colors.textMuted, fontSize: 22, marginTop: spacing.md },
  controlsShell: { width: '100%' },
  exit: { color: colors.textMuted, textAlign: 'center', fontSize: 16, marginBottom: spacing.lg }
});
