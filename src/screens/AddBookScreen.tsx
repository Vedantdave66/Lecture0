import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { findPDF } from '../services/pdfFinderService';
import { searchByImage, searchByQuery } from '../services/googleBooksService';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { BookSearchResult, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddBook'>;

export const AddBookScreen = ({ navigation }: Props) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const addBook = useLibraryStore((state) => state.addBook);
  const setBookPDF = useLibraryStore((state) => state.setBookPDF);

  const runSearch = async () => {
    if (!query.trim()) {
      return;
    }
    setIsSearching(true);
    try {
      setResults(await searchByQuery(query));
    } finally {
      setIsSearching(false);
    }
  };

  const scanPlaceholder = async () => {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    setIsSearching(true);
    try {
      setResults(await searchByImage('TODO_CAPTURED_BOOK_COVER_BASE64'));
    } finally {
      setIsSearching(false);
    }
  };

  const confirmBook = async (result: BookSearchResult) => {
    Alert.alert('Looking for PDF…');
    const book = await addBook(result, null);
    navigation.navigate('BookDetail', { bookId: book.id });
    void findPDF(result.title, result.author).then((pdfUrl) => {
      void setBookPDF(book.id, pdfUrl);
      Alert.alert(pdfUrl ? 'PDF found!' : 'Upload your own PDF');
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add a book</Text>
      <View style={styles.cameraShell}>
        {permission?.granted ? <CameraView style={styles.camera} facing="back" /> : <Text style={styles.cameraText}>Camera scan uses expo-camera to capture a cover.</Text>}
      </View>
      <Pressable style={styles.primaryButton} onPress={() => void scanPlaceholder()}>
        <Text style={styles.primaryText}>{permission?.granted ? 'Scan cover' : 'Enable camera'}</Text>
      </Pressable>
      <Text style={styles.or}>or search manually</Text>
      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Title and author" placeholderTextColor={colors.textMuted} style={styles.input} />
        <Pressable style={styles.searchButton} onPress={() => void runSearch()}><Text style={styles.searchText}>Search</Text></Pressable>
      </View>
      {isSearching ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
      {results.map((result) => (
        <Pressable key={result.id} style={styles.result} onPress={() => void confirmBook(result)}>
          <Image source={{ uri: result.coverUrl || 'https://placehold.co/120x180/13131A/E8C547/png?text=Book' }} style={styles.cover} />
          <View style={styles.resultText}>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.author}>{result.author}</Text>
            <Text style={styles.confirm}>Tap to confirm</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 36, marginBottom: 18 },
  cameraShell: { height: 260, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  camera: { width: '100%', height: '100%' },
  cameraText: { color: colors.textMuted, padding: 24, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.accent, padding: 16, borderRadius: 18, alignItems: 'center', marginTop: 14 },
  primaryText: { color: colors.background, fontWeight: '800', fontSize: 16 },
  or: { color: colors.textMuted, textAlign: 'center', marginVertical: 20 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 16, paddingHorizontal: 14, borderColor: colors.border, borderWidth: 1 },
  searchButton: { backgroundColor: colors.cardElevated, borderRadius: 16, justifyContent: 'center', paddingHorizontal: 18, borderColor: colors.border, borderWidth: 1 },
  searchText: { color: colors.accent, fontWeight: '700' },
  loader: { marginTop: 24 },
  result: { flexDirection: 'row', backgroundColor: colors.card, padding: 12, borderRadius: 18, marginTop: 16, borderColor: colors.border, borderWidth: 1 },
  cover: { width: 72, height: 108, borderRadius: 10, backgroundColor: colors.cardElevated },
  resultText: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  resultTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  author: { color: colors.textMuted, marginTop: 4 },
  confirm: { color: colors.accent, marginTop: 10, fontWeight: '700' }
});
