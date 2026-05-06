import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlayerStore } from '../store/playerStore';
import { colors, radii, shadows, spacing } from '../theme/colors';
import { Book } from '../types';

type Props = {
  book: Book;
  onPress?: () => void;
};

const getStatusColor = (status: Book['status']): string => {
  if (status === 'completed') return colors.success;
  if (status === 'generated') return colors.primary;
  if (status === 'listening') return colors.warning;
  return colors.textMuted;
};

export const BookCard = ({ book, onPress }: Props) => {
  const loadBook = usePlayerStore((state) => state.loadBook);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: book.coverUrl ?? 'https://placehold.co/240x360/111827/D6A84F/png?text=BookDrive' }} style={styles.cover} />
      <View style={styles.copy}>
        <View style={styles.rowBetween}>
          <Text style={[styles.status, { color: getStatusColor(book.status) }]}>{book.status}</Text>
          <Text style={styles.time}>{book.estimatedListeningTime}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
        <View style={styles.bottomRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(book.progress * 100)}%` }]} />
          </View>
          <Pressable style={[styles.playButton, !book.audioUrl && styles.disabledButton]} onPress={() => void loadBook(book, true)} disabled={!book.audioUrl}>
            <Text style={styles.playIcon}>▶</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    ...shadows.card
  },
  cover: { width: 86, height: 122, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  copy: { flex: 1, marginLeft: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { textTransform: 'uppercase', fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  time: { color: colors.textSubtle, fontSize: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: spacing.sm, lineHeight: 23 },
  author: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 'auto' },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  playButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.35 },
  playIcon: { color: colors.background, fontSize: 16, fontWeight: '900' }
});
