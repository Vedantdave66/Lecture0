import * as DocumentPicker from 'expo-document-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GutenbergBook, searchGutenberg, validateTextUrl } from '../services/gutenbergService';
import {
  ExtractionError,
  UnsupportedFormatError,
  extractFromFile,
  extractFromUrl,
  saveChunksToCache,
} from '../services/textExtractorService';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddBook'>;
type Tab = 'upload' | 'search';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getMimeType = (asset: DocumentPicker.DocumentPickerAsset): string =>
  asset.mimeType ?? (asset.name?.endsWith('.epub') ? 'application/epub+zip' : 'text/plain');

const getTitleFromFilename = (name: string): string =>
  name.replace(/\.(txt|epub|pdf)$/i, '').replace(/[_-]+/g, ' ');

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export const AddBookScreen = ({ navigation }: Props) => {
  const addBook = useLibraryStore((s) => s.addBook);

  const [tab, setTab] = useState<Tab>('upload');

  // Upload tab state
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Search tab state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GutenbergBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Upload flow
  // ---------------------------------------------------------------------------

  const pickAndImport = async () => {
    setUploadError('');
    setUploadStatus('');

    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'application/epub+zip', 'application/pdf', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const mimeType = getMimeType(asset);

    setIsImporting(true);
    try {
      // PDF guard
      if (mimeType.includes('pdf') || asset.name?.toLowerCase().endsWith('.pdf')) {
        throw new UnsupportedFormatError(
          'PDF text extraction is not supported in this version. Please upload a .txt or .epub file.'
        );
      }

      setUploadStatus('Extracting text…');
      const chunks = await extractFromFile(asset.uri, mimeType);

      if (chunks.length === 0) {
        throw new ExtractionError('No readable text was found in this file. Please try a different file.');
      }

      setUploadStatus(`Saving ${chunks.length} chunks…`);
      const title = getTitleFromFilename(asset.name ?? 'Untitled');
      const bookId = `upload-${Date.now()}`;
      const cacheUri = await saveChunksToCache(bookId, chunks);

      const book = await addBook({
        result: { id: bookId, title, author: 'Unknown', coverUrl: '', description: '' },
        sourceType: 'upload',
        fileUri: asset.uri,
        textCacheUri: cacheUri,
      });

      navigation.navigate('Player', { bookId: book.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
      setUploadError(msg);
      setUploadStatus('');
    } finally {
      setIsImporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Gutenberg search flow
  // ---------------------------------------------------------------------------

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearchError('');
    setSearchResults([]);
    setIsSearching(true);
    try {
      const results = await searchGutenberg(query);
      setSearchResults(results);
      if (results.length === 0) setSearchError('No public-domain results found. Try a different title.');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed. Check your connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const addGutenbergBook = async (gb: GutenbergBook) => {
    if (!gb.textUrl) return;
    setAddingId(gb.id);
    try {
      // Validate URL is reachable
      await validateTextUrl(gb.textUrl);

      // Extract and cache chunks at import time
      const chunks = await extractFromUrl(gb.textUrl);
      if (chunks.length === 0) throw new ExtractionError('This book returned no readable text.');

      const bookId = gb.id;
      const cacheUri = await saveChunksToCache(bookId, chunks);

      const book = await addBook({
        result: { id: bookId, title: gb.title, author: gb.author, coverUrl: gb.coverUrl, description: '' },
        sourceType: 'gutenberg',
        textUrl: gb.textUrl,
        textCacheUri: cacheUri,
      });

      navigation.navigate('Player', { bookId: book.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to import book.';
      setSearchError(msg);
    } finally {
      setAddingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Add a Book</Text>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'upload' && styles.tabActive]}
          onPress={() => setTab('upload')}
          accessibilityRole="tab"
        >
          <Text style={[styles.tabText, tab === 'upload' && styles.tabTextActive]}>📁  Upload File</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'search' && styles.tabActive]}
          onPress={() => setTab('search')}
          accessibilityRole="tab"
        >
          <Text style={[styles.tabText, tab === 'search' && styles.tabTextActive]}>🔍  Gutenberg</Text>
        </Pressable>
      </View>

      {/* ---- UPLOAD TAB ---- */}
      {tab === 'upload' && (
        <View style={styles.tabContent}>
          <Text style={styles.body}>
            Pick a <Text style={styles.accent}>.txt</Text> or <Text style={styles.accent}>.epub</Text> file
            from your device. Text is extracted and saved — no internet needed for playback.
          </Text>
          <Text style={styles.hint}>PDF files are not supported in this version.</Text>

          <Pressable
            style={[styles.primaryButton, isImporting && styles.buttonDisabled]}
            onPress={() => void pickAndImport()}
            disabled={isImporting}
            accessibilityRole="button"
          >
            {isImporting ? (
              <View style={styles.row}>
                <ActivityIndicator color={colors.background} size="small" style={{ marginRight: 10 }} />
                <Text style={styles.primaryText}>{uploadStatus || 'Processing…'}</Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>Choose file…</Text>
            )}
          </Pressable>

          {uploadError !== '' && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{uploadError}</Text>
            </View>
          )}
        </View>
      )}

      {/* ---- SEARCH TAB ---- */}
      {tab === 'search' && (
        <View style={styles.tabContent}>
          <Text style={styles.body}>
            Search Project Gutenberg for public-domain books. Only books with a confirmed plain-text source are shown.
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Title or author…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={() => void runSearch()}
              accessibilityLabel="Search Gutenberg"
            />
            <Pressable
              style={[styles.searchButton, isSearching && styles.buttonDisabled]}
              onPress={() => void runSearch()}
              disabled={isSearching}
              accessibilityRole="button"
            >
              {isSearching
                ? <ActivityIndicator color={colors.accent} size="small" />
                : <Text style={styles.searchButtonText}>Search</Text>
              }
            </Pressable>
          </View>

          {searchError !== '' && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          )}

          {searchResults.length > 0 && searchResults.every((r) => !r.textUrl) && (
            <Text style={styles.noResults}>No readable public-domain version found.</Text>
          )}

          {searchResults.map((book) => (
            <Pressable
              key={book.id}
              style={[styles.resultCard, !book.textUrl && styles.resultCardDisabled]}
              onPress={() => book.textUrl ? void addGutenbergBook(book) : null}
              disabled={!book.textUrl || addingId === book.id}
              accessibilityRole="button"
            >
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={2}>{book.title}</Text>
                <Text style={styles.resultAuthor} numberOfLines={1}>{book.author}</Text>
              </View>
              <View style={styles.resultRight}>
                {book.textUrl ? (
                  addingId === book.id ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>TXT ✓</Text>
                    </View>
                  )
                ) : (
                  <View style={styles.badgeGrey}>
                    <Text style={styles.badgeGreyText}>No text</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 80 },
  heading: { color: colors.text, fontFamily: typography.titleFont, fontSize: 34, marginBottom: 20 },

  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 18, padding: 4, borderColor: colors.border, borderWidth: 1, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  tabActive: { backgroundColor: colors.cardElevated },
  tabText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: colors.accent },

  tabContent: { gap: 14 },
  body: { color: colors.textMuted, lineHeight: 22, fontSize: 14 },
  hint: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  accent: { color: colors.accent, fontWeight: '700' },

  primaryButton: { backgroundColor: colors.accent, padding: 18, borderRadius: 18, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  primaryText: { color: colors.background, fontWeight: '900', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },

  errorCard: { backgroundColor: '#2A0F0F', borderRadius: 14, padding: 14, borderColor: colors.danger, borderWidth: 1 },
  errorText: { color: colors.danger, fontSize: 14, lineHeight: 20 },

  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderColor: colors.border, borderWidth: 1, fontSize: 15 },
  searchButton: { backgroundColor: colors.card, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 18, borderColor: colors.border, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  searchButtonText: { color: colors.accent, fontWeight: '700' },

  noResults: { color: colors.textMuted, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },

  resultCard: { backgroundColor: colors.card, borderRadius: 16, padding: 14, borderColor: colors.border, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  resultCardDisabled: { opacity: 0.5 },
  resultInfo: { flex: 1 },
  resultTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  resultAuthor: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  resultRight: { marginLeft: 12 },
  badge: { backgroundColor: '#1A2A1A', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderColor: colors.success, borderWidth: 1 },
  badgeText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  badgeGrey: { backgroundColor: colors.cardElevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeGreyText: { color: colors.textMuted, fontSize: 12 },
});
