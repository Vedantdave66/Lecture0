// FindBookScreen.tsx
// Consumer-facing "Find a Free Book" screen.
// Dad-friendly: no mention of Gutenberg, TXT, EPUB, formats, or providers.
// User searches → sees results with "Listen" button → app handles everything.

import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GutenbergBook, searchGutenberg } from '../services/gutenbergService';
import { resolveBook } from '../services/bookResolverService';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'FindBook'>;

type BookState = 'idle' | 'listening' | 'error';
type BusyMap = Record<string, { state: BookState; status: string }>;

export const FindBookScreen = ({ navigation }: Props) => {
  const addBook = useLibraryStore((s) => s.addBook);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GutenbergBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [busy, setBusy] = useState<BusyMap>({});
  const inputRef = useRef<TextInput>(null);

  const setBookBusy = (id: string, state: BookState, status: string) =>
    setBusy((prev) => ({ ...prev, [id]: { state, status } }));

  const clearBookBusy = (id: string) =>
    setBusy((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  // ── Search ─────────────────────────────────────────────────────────────────
  const runSearch = async () => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setSearchError('');
    setResults([]);
    setSearching(true);
    try {
      const r = await searchGutenberg(query.trim());
      setResults(r);
      if (r.length === 0) setSearchError('No free books found. Try a different title or author.');
    } catch {
      setSearchError('Search unavailable. Check your connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  // ── Listen ─────────────────────────────────────────────────────────────────
  const onListen = async (book: GutenbergBook) => {
    if (busy[book.id]) return;

    setBookBusy(book.id, 'listening', 'Finding book…');
    try {
      const resolved = await resolveBook(book, (msg) =>
        setBookBusy(book.id, 'listening', msg)
      );

      const saved = await addBook({
        result: {
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          description: '',
        },
        sourceType: 'gutenberg',
        textUrl: resolved.resolvedUrl,
        textCacheUri: resolved.textCacheUri,
        sections: resolved.sections,
        sectionType: resolved.sectionType,
      });

      clearBookBusy(book.id);
      navigation.navigate('Player', { bookId: saved.id });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'No free readable version was found. Try another title.';
      setBookBusy(book.id, 'error', msg);
      // Auto-clear error after 4 seconds
      setTimeout(() => clearBookBusy(book.id), 4000);
    }
  };

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: GutenbergBook }) => {
    const state = busy[item.id];
    const isLoading = state?.state === 'listening';
    const isError = state?.state === 'error';
    const canListen = !!(item.textUrl || item.htmlUrl);

    return (
      <View style={[styles.card, cardShadows.soft]}>
        {/* Cover */}
        <Image
          source={{
            uri: item.coverUrl || 'https://placehold.co/60x90/FFC107/FFFFFF/png?text=📚',
          }}
          style={styles.cover}
          resizeMode="cover"
        />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>

          {/* Status text */}
          {isLoading && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.statusText}>{state.status}</Text>
            </View>
          )}
          {isError && (
            <Text style={styles.errorText} numberOfLines={2}>{state.status}</Text>
          )}
        </View>

        {/* Listen button */}
        {!isLoading && !isError && (
          <Pressable
            style={({ pressed }) => [
              styles.listenBtn,
              !canListen && styles.listenBtnDisabled,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => void onListen(item)}
            disabled={!canListen}
            accessibilityLabel={`Listen to ${item.title}`}
          >
            <Ionicons name="play" size={16} color={canListen ? colors.white : colors.textMuted} />
            <Text style={[styles.listenText, !canListen && styles.listenTextDisabled]}>
              {canListen ? 'Listen' : 'Unavailable'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Search bar */}
      <View style={styles.searchArea}>
        <View style={[styles.inputRow, cardShadows.soft]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search a book title…"
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults([]); setSearchError(''); }}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.8 }]}
          onPress={() => void runSearch()}
        >
          {searching
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Text style={styles.searchBtnText}>Search</Text>
          }
        </Pressable>
      </View>

      {/* Error */}
      {searchError !== '' && (
        <View style={styles.searchErrorBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.searchErrorText}>{searchError}</Text>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !searching && results.length === 0 && !searchError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyTitle}>Find a Free Book</Text>
              <Text style={styles.emptyBody}>
                Search for any classic title — Shakespeare, Austen, Dickens, and thousands more are available free.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  searchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 10,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderColor: colors.border,
    borderWidth: 1.5,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  input: { flex: 1, fontSize: 16, color: colors.text },
  searchBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },

  searchErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.md,
    marginBottom: 4,
  },
  searchErrorText: { color: colors.textMuted, fontSize: 13, flex: 1 },

  list: { paddingHorizontal: spacing.md, paddingBottom: 80, paddingTop: 4 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: 10,
    padding: 12,
    gap: 12,
    borderColor: colors.border,
    borderWidth: 1,
  },
  cover: { width: 52, height: 78, borderRadius: radius.sm, backgroundColor: colors.cardElevated },
  info: { flex: 1, gap: 3 },
  bookTitle: { fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: typography.titleFont },
  bookAuthor: { fontSize: 12, color: colors.textMuted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  errorText: { fontSize: 11, color: colors.danger, marginTop: 2 },

  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...cardShadows.accent,
  },
  listenBtnDisabled: { backgroundColor: colors.cardElevated, shadowOpacity: 0, elevation: 0 },
  listenText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  listenTextDisabled: { color: colors.textMuted },

  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontFamily: typography.titleFont, fontSize: 24, fontWeight: '800', color: colors.text },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
