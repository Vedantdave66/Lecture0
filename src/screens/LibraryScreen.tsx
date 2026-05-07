import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BookCard } from '../components/BookCard';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { RootStackParamList } from '../types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export const LibraryScreen = () => {
  const navigation = useNavigation<Navigation>();
  const books = useLibraryStore((s) => s.books);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Bluetooth-ready audiobooks</Text>
        <Text style={styles.title}>BookDrive</Text>
      </View>
      <FlatList
        data={books}
        keyExtractor={(b) => b.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>Your library is empty</Text>
            <Text style={styles.empty}>
              Tap the <Text style={styles.accentText}>+</Text> button to add a book.{'\n'}
              You can upload a <Text style={styles.accentText}>.txt</Text> or{' '}
              <Text style={styles.accentText}>.epub</Text> file, or search{' '}
              <Text style={styles.accentText}>Project Gutenberg</Text> for free public-domain titles.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookCard
            book={item}
            onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
          />
        )}
      />
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AddBook')}
        accessibilityRole="button"
        accessibilityLabel="Add a book"
      >
        <Ionicons name="add" size={34} color={colors.background} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  eyebrow: { color: colors.accent, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 12 },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 42, marginTop: 4 },
  content: { padding: 16, paddingBottom: 120 },
  gridRow: { justifyContent: 'space-between' },
  emptyState: { alignItems: 'center', marginTop: 72, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: colors.text, fontFamily: typography.titleFont, fontSize: 26, marginBottom: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 24 },
  accentText: { color: colors.accent, fontWeight: '700' },
  fab: { position: 'absolute', right: 22, bottom: 30, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
});
