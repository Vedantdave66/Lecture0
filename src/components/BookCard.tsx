import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme/colors';
import { Book } from '../types';

type Props = {
  book: Book;
  onPress: () => void;
};

export const BookCard = ({ book, onPress }: Props) => (
  <Pressable style={styles.card} onPress={onPress}>
    <Image source={{ uri: book.coverUrl || 'https://placehold.co/240x360/13131A/E8C547/png?text=BookDrive' }} style={styles.cover} />
    <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
    <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.round(book.progress * 100)}%` }]} />
    </View>
    <Text style={styles.status}>{book.status}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 12,
    marginBottom: 16,
    borderColor: colors.border,
    borderWidth: 1
  },
  cover: { width: '100%', aspectRatio: 0.68, borderRadius: 16, backgroundColor: colors.cardElevated },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 18, marginTop: 10 },
  author: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  progressTrack: { height: 5, backgroundColor: colors.cardElevated, borderRadius: 99, overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  status: { color: colors.accent, textTransform: 'uppercase', fontSize: 10, marginTop: 8, letterSpacing: 1 }
});
