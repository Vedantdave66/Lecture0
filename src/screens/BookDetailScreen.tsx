import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VoiceSelector } from '../components/VoiceSelector';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { RootStackParamList, TtsVoice } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

export const BookDetailScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((s) => s.getBookById(route.params.bookId));
  const setVoiceAndSpeed = useLibraryStore((s) => s.setVoiceAndSpeed);

  if (!book) {
    return <View style={styles.screen}><Text style={styles.missing}>Book not found.</Text></View>;
  }

  const sourceBadge = book.sourceType === 'upload' ? '📁 Uploaded file' : '🌐 Project Gutenberg';
  const hasText = !!(book.textCacheUri ?? book.textUrl ?? book.fileUri);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.author}>{book.author}</Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{sourceBadge}</Text>
      </View>

      {book.description ? (
        <Text style={styles.description}>{book.description}</Text>
      ) : null}

      {!hasText && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ No text source found for this book. Delete it and re-import from the Add Book screen.
          </Text>
        </View>
      )}

      <VoiceSelector
        selectedVoice={book.voice}
        selectedSpeed={book.speed}
        onVoiceChange={(voice: TtsVoice) => void setVoiceAndSpeed(book.id, voice, book.speed)}
        onSpeedChange={(speed) => void setVoiceAndSpeed(book.id, book.voice, speed)}
      />

      <Pressable
        style={[styles.primaryButton, !hasText && styles.primaryButtonDisabled]}
        disabled={!hasText}
        onPress={() => navigation.navigate('Player', { bookId: book.id })}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>
          {book.status === 'listening' ? 'Continue Listening' : 'Start Listening'}
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 70 },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 32, textAlign: 'center' },
  author: { color: colors.accent, textAlign: 'center', marginTop: 8, fontSize: 16 },
  badge: { alignSelf: 'center', backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginTop: 12, borderColor: colors.border, borderWidth: 1 },
  badgeText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  description: { color: colors.textMuted, lineHeight: 22, marginVertical: 20 },
  warningCard: { backgroundColor: '#2A1F0A', borderRadius: 14, padding: 14, borderColor: '#8A5A00', borderWidth: 1, marginBottom: 16 },
  warningText: { color: '#E8A547', fontSize: 14, lineHeight: 20 },
  primaryButton: { backgroundColor: colors.accent, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 18 },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryText: { color: colors.background, fontSize: 17, fontWeight: '900' },
  missing: { color: colors.text, margin: 24 },
});
