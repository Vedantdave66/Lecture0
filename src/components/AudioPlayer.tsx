import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlayerStore } from '../store/playerStore';
import { colors, radii, shadows, spacing } from '../theme/colors';

const formatProgress = (position: number, duration: number) => {
  if (duration <= 0) {
    return '0%' as const;
  }
  return `${Math.min(100, Math.round((position / duration) * 100))}%` as const;
};

export const AudioPlayer = () => {
  const activeBook = usePlayerStore((state) => state.activeBook);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const positionMillis = usePlayerStore((state) => state.positionMillis);
  const durationMillis = usePlayerStore((state) => state.durationMillis);
  const toggle = usePlayerStore((state) => state.toggle);

  if (!activeBook) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.caption}>{activeBook.sourceType === 'demo' ? 'Demo audio' : activeBook.status}</Text>
        <Text style={styles.title} numberOfLines={1}>{activeBook.title}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: formatProgress(positionMillis, durationMillis || activeBook.duration * 1000) }]} />
        </View>
      </View>
      <Pressable style={styles.button} onPress={() => void toggle()}>
        <Text style={styles.icon}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 86,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card
  },
  copy: { flex: 1, marginRight: spacing.md },
  caption: { color: colors.primary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1, fontWeight: '700' },
  title: { color: colors.text, fontSize: 15, marginTop: 3, fontWeight: '700' },
  progressTrack: { height: 3, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, overflow: 'hidden', marginTop: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  button: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  icon: { color: colors.background, fontSize: 21, fontWeight: '900' }
});
