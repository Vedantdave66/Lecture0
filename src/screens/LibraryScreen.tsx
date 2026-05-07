import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BookCard } from '../components/BookCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const LibraryScreen = () => {
  const navigation = useNavigation<Nav>();
  const books = useLibraryStore((s) => s.books);

  return (
    <View style={styles.screen}>
      <FlatList
        data={books}
        keyExtractor={(b) => b.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Your collection</Text>
            <Text style={styles.heading}>My Library</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No books yet</Text>
            <Text style={styles.emptyBody}>
              Upload a TXT or EPUB file, or search Project Gutenberg to start listening.
            </Text>
            <PrimaryButton
              label="Add Your First Book"
              onPress={() => navigation.navigate('AddBook')}
            />
          </View>
        }
        renderItem={({ item }) => (
          <BookCard
            book={item}
            onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
          />
        )}
      />

      {/* FAB */}
      {books.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.fab, cardShadows.accent, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('AddBook')}
          accessibilityRole="button"
          accessibilityLabel="Add a book"
        >
          <Ionicons name="add" size={32} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 24, paddingBottom: 16 },
  eyebrow: { fontSize: 12, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 1.4 },
  heading: { fontFamily: typography.titleFont, fontSize: 38, fontWeight: '800', color: colors.text, marginTop: 4 },
  content: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  row: { justifyContent: 'space-between' },
  empty: { alignItems: 'center', marginTop: 64, paddingHorizontal: 24, gap: 12 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontFamily: typography.titleFont, fontSize: 26, fontWeight: '800', color: colors.text },
  emptyBody: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 30,
    width: 62,
    height: 62,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
