import * as DocumentPicker from 'expo-document-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VoiceSelector } from '../components/VoiceSelector';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { RootStackParamList, TtsVoice } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

export const BookDetailScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((state) => state.getBookById(route.params.bookId));
  const setBookPDF = useLibraryStore((state) => state.setBookPDF);
  const setVoiceAndSpeed = useLibraryStore((state) => state.setVoiceAndSpeed);

  if (!book) {
    return <View style={styles.screen}><Text style={styles.missing}>Book not found.</Text></View>;
  }

  const uploadPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    const destination = asset.uri;
    await setBookPDF(book.id, asset.uri, destination);
    Alert.alert('PDF uploaded', 'Your own PDF is ready for listening.');
  };

  const pdfStatus = book.pdfLocalPath ? 'user uploaded' : book.pdfUrl ? 'found' : 'not found';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Image source={{ uri: book.coverUrl || 'https://placehold.co/240x360/13131A/E8C547/png?text=BookDrive' }} style={styles.cover} />
      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.author}>{book.author}</Text>
      <Text style={styles.description}>{book.description}</Text>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>PDF status</Text>
        <Text style={styles.statusValue}>{pdfStatus}</Text>
      </View>
      {!book.pdfUrl && !book.pdfLocalPath ? <Pressable style={styles.secondaryButton} onPress={() => void uploadPDF()}><Text style={styles.secondaryText}>Upload your own PDF</Text></Pressable> : null}
      <VoiceSelector
        selectedVoice={book.voice}
        selectedSpeed={book.speed}
        onVoiceChange={(voice: TtsVoice) => void setVoiceAndSpeed(book.id, voice, book.speed)}
        onSpeedChange={(speed) => void setVoiceAndSpeed(book.id, book.voice, speed)}
      />
      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Player', { bookId: book.id })}>
        <Text style={styles.primaryText}>Start Listening</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 70 },
  cover: { width: 170, height: 255, borderRadius: 18, alignSelf: 'center', backgroundColor: colors.card, marginBottom: 20 },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 34, textAlign: 'center' },
  author: { color: colors.accent, textAlign: 'center', marginTop: 8, fontSize: 16 },
  description: { color: colors.textMuted, lineHeight: 22, marginVertical: 22 },
  statusCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderColor: colors.border, borderWidth: 1, marginBottom: 18 },
  statusLabel: { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  statusValue: { color: colors.text, fontSize: 20, marginTop: 5, textTransform: 'capitalize' },
  primaryButton: { backgroundColor: colors.accent, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 18 },
  primaryText: { color: colors.background, fontSize: 17, fontWeight: '900' },
  secondaryButton: { borderColor: colors.accent, borderWidth: 1, padding: 15, borderRadius: 18, alignItems: 'center', marginBottom: 20 },
  secondaryText: { color: colors.accent, fontWeight: '800' },
  missing: { color: colors.text, margin: 24 }
});
