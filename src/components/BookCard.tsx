import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme/colors';
import { Book } from '../types';

type Props = {
  book: Book;
  onPress: () => void;
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const BookCard = ({ book, onPress }: Props) => {
  const sourceBadge = book.sourceType === 'upload' ? '📁' : '🌐';
  const lastOpened = book.lastOpenedAt ? `Opened ${formatDate(book.lastOpenedAt)}` : '';

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <Image
        source={{ uri: book.coverUrl || 'https://placehold.co/240x360/13131A/E8C547/png?text=BookDrive' }}
        style={styles.cover}
      />
      <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.author} numberOfLines={1}>{book.author}</Text>

      <View style={styles.meta}>
        <Text style={styles.sourceBadge}>{sourceBadge}</Text>
        <Text style={styles.status}>{book.status}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(book.progress * 100)}%` }]} />
      </View>

      {lastOpened !== '' && <Text style={styles.lastOpened}>{lastOpened}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 12,
    marginBottom: 16,
    borderColor: colors.border,
    borderWidth: 1,
  },
  cover: { width: '100%', aspectRatio: 0.68, borderRadius: 16, backgroundColor: colors.cardElevated },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 17, marginTop: 10 },
  author: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sourceBadge: { fontSize: 14 },
  status: { color: colors.accent, textTransform: 'uppercase', fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  progressTrack: { height: 4, backgroundColor: colors.cardElevated, borderRadius: 99, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  lastOpened: { color: colors.textMuted, fontSize: 10, marginTop: 6 },
});
