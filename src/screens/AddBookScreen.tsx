import * as DocumentPicker from 'expo-document-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { WarningCard } from '../components/WarningCard';
import { GutenbergBook, searchGutenberg, validateTextUrl } from '../services/gutenbergService';
import {
  ExtractionError, UnsupportedFormatError,
  extractFromFile, extractFromUrl, saveChunksToCache,
} from '../services/textExtractorService';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddBook'>;
type Tab = 'upload' | 'search';

const getMime = (a: DocumentPicker.DocumentPickerAsset) =>
  a.mimeType ?? (a.name?.endsWith('.epub') ? 'application/epub+zip' : 'text/plain');

const titleFromFilename = (name: string) =>
  name.replace(/\.(txt|epub|pdf)$/i, '').replace(/[_-]+/g, ' ');

export const AddBookScreen = ({ navigation }: Props) => {
  const addBook = useLibraryStore((s) => s.addBook);
  const [tab, setTab] = useState<Tab>('upload');
  const [uploadError, setUploadError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GutenbergBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  // ── Upload ────────────────────────────────────────────────────────────────
  const pickFile = async () => {
    setUploadError(''); setUploadStatus('');
    const res = await DocumentPicker.getDocumentAsync({ type: ['*/*'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const asset = res.assets[0];
    const mime = getMime(asset);

    setImporting(true);
    try {
      if (mime.includes('pdf') || asset.name?.toLowerCase().endsWith('.pdf')) {
        throw new UnsupportedFormatError('PDF is not supported yet. Please upload a .txt or .epub file.');
      }
      setUploadStatus('Extracting text…');
      const chunks = await extractFromFile(asset.uri, mime);
      if (!chunks.length) throw new ExtractionError('No readable text found in this file.');

      setUploadStatus(`Saving ${chunks.length} sections…`);
      const id = `upload-${Date.now()}`;
      const cacheUri = await saveChunksToCache(id, chunks);
      const book = await addBook({
        result: { id, title: titleFromFilename(asset.name ?? 'Untitled'), author: 'Unknown', coverUrl: '', description: '' },
        sourceType: 'upload', fileUri: asset.uri, textCacheUri: cacheUri,
      });
      navigation.navigate('Player', { bookId: book.id });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Import failed.');
      setUploadStatus('');
    } finally {
      setImporting(false);
    }
  };

  // ── Gutenberg ─────────────────────────────────────────────────────────────
  const runSearch = async () => {
    if (!query.trim()) return;
    setSearchError(''); setResults([]); setSearching(true);
    try {
      const r = await searchGutenberg(query);
      setResults(r);
      if (!r.length) setSearchError('No public-domain results found.');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const addGutenberg = async (gb: GutenbergBook) => {
    if (!gb.textUrl) return;
    setAddingId(gb.id); setSearchError('');
    try {
      await validateTextUrl(gb.textUrl);
      const chunks = await extractFromUrl(gb.textUrl);
      if (!chunks.length) throw new ExtractionError('This book has no readable text.');
      const cacheUri = await saveChunksToCache(gb.id, chunks);
      const book = await addBook({
        result: { id: gb.id, title: gb.title, author: gb.author, coverUrl: gb.coverUrl, description: '' },
        sourceType: 'gutenberg', textUrl: gb.textUrl, textCacheUri: cacheUri,
      });
      navigation.navigate('Player', { bookId: book.id });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to import.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Add a Book</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['upload', 'search'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'upload' ? '📁  Upload File' : '🔍  Gutenberg'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Upload panel */}
      {tab === 'upload' && (
        <View style={[styles.panel, cardShadows.soft]}>
          <Text style={styles.panelIcon}>📄</Text>
          <Text style={styles.panelTitle}>Upload TXT or EPUB</Text>
          <Text style={styles.panelNote}>PDF support coming soon.</Text>
          {uploadStatus !== '' && <Text style={styles.status}>{uploadStatus}</Text>}
          {uploadError !== '' && <WarningCard message={uploadError} type="error" />}
          <View style={styles.btnWrap}>
            <PrimaryButton label={importing ? uploadStatus || 'Processing…' : 'Choose File'} onPress={() => void pickFile()} loading={importing} />
          </View>
        </View>
      )}

      {/* Gutenberg panel */}
      {tab === 'search' && (
        <View style={[styles.panel, cardShadows.soft]}>
          <Text style={styles.panelTitle}>Search Project Gutenberg</Text>
          <Text style={styles.panelNote}>Free public-domain books with plain-text sources.</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Title or author…"
              placeholderTextColor={colors.textLight}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={() => void runSearch()}
            />
            <PrimaryButton label="Search" onPress={() => void runSearch()} loading={searching} />
          </View>

          {searchError !== '' && <WarningCard message={searchError} type={results.length === 0 ? 'info' : 'warning'} />}

          {results.map((book) => (
            <Pressable
              key={book.id}
              style={({ pressed }) => [styles.result, !book.textUrl && styles.resultDisabled, pressed && { opacity: 0.8 }]}
              onPress={() => book.textUrl ? void addGutenberg(book) : null}
              disabled={!book.textUrl || addingId === book.id}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle} numberOfLines={1}>{book.title}</Text>
                <Text style={styles.resultAuthor} numberOfLines={1}>{book.author}</Text>
              </View>
              {book.textUrl
                ? (addingId === book.id
                    ? <Text style={styles.adding}>Adding…</Text>
                    : <View style={styles.available}><Text style={styles.availableText}>TXT ✓</Text></View>
                  )
                : <View style={styles.unavailable}><Text style={styles.unavailableText}>No text</Text></View>
              }
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 80 },
  heading: { fontFamily: typography.titleFont, fontSize: 34, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.xl, padding: 4, marginBottom: spacing.md, ...cardShadows.soft },
  tab: { flex: 1, paddingVertical: 12, borderRadius: radius.lg, alignItems: 'center' },
  tabActive: { backgroundColor: colors.accent },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  panel: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: 12 },
  panelIcon: { fontSize: 44, textAlign: 'center' },
  panelTitle: { fontFamily: typography.titleFont, fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  panelNote: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  status: { fontSize: 13, color: colors.accent, fontWeight: '600', textAlign: 'center' },
  btnWrap: { marginTop: 4 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, backgroundColor: colors.background, color: colors.text, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, borderColor: colors.border, borderWidth: 1.5, fontSize: 15 },
  result: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.md, padding: 12, borderColor: colors.border, borderWidth: 1 },
  resultDisabled: { opacity: 0.4 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  resultAuthor: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  adding: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  available: { backgroundColor: '#E8F5E9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderColor: '#A5D6A7', borderWidth: 1 },
  availableText: { color: '#2E7D32', fontSize: 11, fontWeight: '700' },
  unavailable: { backgroundColor: colors.cardElevated, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  unavailableText: { color: colors.textMuted, fontSize: 11 },
});
