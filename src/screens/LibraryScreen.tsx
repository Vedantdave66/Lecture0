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
  const books = useLibraryStore((state) => state.books);
  const seedDemoLibrary = useLibraryStore((state) => state.seedDemoLibrary);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Bluetooth-ready audiobooks</Text>
        <Text style={styles.title}>BookDrive</Text>
      </View>
      <FlatList
        data={books}
        keyExtractor={(book) => book.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.empty}>Add a book to start building your drive-time library, or load a realistic local demo with public-domain titles.</Text>
            <Pressable style={styles.demoButton} onPress={() => void seedDemoLibrary()}>
              <Text style={styles.demoButtonText}>Load demo library</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <BookCard book={item} onPress={() => navigation.navigate('BookDetail', { bookId: item.id })} />}
      />
      <Pressable style={styles.fab} onPress={() => navigation.navigate('AddBook')}>
        <Text style={styles.fabIcon}>＋</Text>
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
  emptyState: { alignItems: 'center', marginTop: 92, paddingHorizontal: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', fontSize: 16, lineHeight: 24 },
  demoButton: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 999, marginTop: 18 },
  demoButtonText: { color: colors.background, fontWeight: '900' },
  fab: { position: 'absolute', right: 22, bottom: 30, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  fabIcon: { color: colors.background, fontSize: 38, lineHeight: 42, fontWeight: '800' }
});
