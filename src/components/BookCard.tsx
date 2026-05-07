import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { Book } from '../types';

type Props = { book: Book; onPress: () => void };

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

const sourceLabel: Record<string, string> = { gutenberg: 'Gutenberg', upload: 'Uploaded', demo: 'Demo' };

export const BookCard = ({ book, onPress }: Props) => {
  const pct = Math.round(book.progress * 100);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, cardShadows.soft, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: book.coverUrl || 'https://placehold.co/160x240/FFC107/FFFFFF/png?text=📚' }}
        style={styles.cover}
        resizeMode="cover"
      />

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{book.author}</Text>

        <View style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{sourceLabel[book.sourceType] ?? book.sourceType}</Text>
          </View>
          <Text style={styles.pct}>{pct}%</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>

        {book.lastOpenedAt
          ? <Text style={styles.date}>Opened {formatDate(book.lastOpenedAt)}</Text>
          : null
        }
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  cover: { width: '100%', aspectRatio: 0.68, backgroundColor: colors.cardElevated },
  body: { padding: spacing.sm + 2 },
  title: { fontFamily: typography.titleFont, fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  author: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  badge: { backgroundColor: colors.accentLight, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '700', color: colors.accentDark, textTransform: 'uppercase', letterSpacing: 0.5 },
  pct: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  track: { height: 3, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', backgroundColor: colors.accent },
  date: { fontSize: 10, color: colors.textLight, marginTop: 4 },
});
