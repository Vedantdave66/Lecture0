import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BookCard } from '../components/BookCard';
import { useLibraryStore } from '../store/libraryStore';
import { colors, radii, spacing, typography } from '../theme/colors';
import { Book, BookStatus } from '../types';

type Props = {
  onOpenBook: (book: Book) => void;
};

type Filter = 'all' | BookStatus;

const filters: Filter[] = ['all', 'listening', 'reading', 'generated', 'completed'];

export const LibraryScreen = ({ onOpenBook }: Props) => {
  const books = useLibraryStore((state) => state.books);
  const seedDemoLibrary = useLibraryStore((state) => state.seedDemoLibrary);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesQuery = `${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === 'all' || book.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [books, filter, query]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Library</Text>
      <Text style={styles.title}>All audiobooks</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search title or author"
        placeholderTextColor={colors.textSubtle}
        style={styles.search}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => (
          <Pressable key={item} style={[styles.filterChip, filter === item && styles.activeFilter]} onPress={() => setFilter(item)}>
            <Text style={[styles.filterText, filter === item && styles.activeFilterText]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {filteredBooks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No books yet</Text>
          <Text style={styles.emptyText}>Load the demo library to explore the premium listening flow.</Text>
          <Pressable style={styles.demoButton} onPress={() => void seedDemoLibrary()}>
            <Text style={styles.demoText}>Load demo library</Text>
          </Pressable>
        </View>
      ) : filteredBooks.map((book) => <BookCard key={book.id} book={book} onPress={() => onOpenBook(book)} />)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 170 },
  eyebrow: { color: colors.primary, fontSize: typography.caption, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '800' },
  title: { color: colors.text, fontSize: typography.title, fontWeight: '900', marginTop: spacing.xs, marginBottom: spacing.lg },
  search: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, color: colors.text, padding: spacing.lg, fontSize: typography.body },
  filters: { gap: spacing.sm, paddingVertical: spacing.lg },
  filterChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  activeFilter: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, textTransform: 'capitalize', fontWeight: '800' },
  activeFilterText: { color: colors.background },
  emptyState: { alignItems: 'center', marginTop: spacing.xxxl, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radii.xl, borderColor: colors.border, borderWidth: 1 },
  emptyTitle: { color: colors.text, fontSize: typography.heading, fontWeight: '900' },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
  demoButton: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  demoText: { color: colors.background, fontWeight: '900' }
});
