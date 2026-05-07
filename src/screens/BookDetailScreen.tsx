import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { SourceBadge } from '../components/SourceBadge';
import { WarningCard } from '../components/WarningCard';
import { VoiceSelector } from '../components/VoiceSelector';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { RootStackParamList, TtsVoice } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

export const BookDetailScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((s) => s.getBookById(route.params.bookId));
  const setVoiceAndSpeed = useLibraryStore((s) => s.setVoiceAndSpeed);

  if (!book) {
    return <View style={styles.screen}><Text style={styles.missing}>Book not found.</Text></View>;
  }

  const hasText = !!(book.textCacheUri ?? book.textUrl ?? book.fileUri);
  const pct = Math.round(book.progress * 100);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Cover card */}
      <View style={[styles.coverCard, cardShadows.medium]}>
        <Image
          source={{ uri: book.coverUrl || 'https://placehold.co/240x360/FFC107/FFFFFF/png?text=📚' }}
          style={styles.cover}
          resizeMode="cover"
        />
      </View>

      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.author}>{book.author}</Text>

      <SourceBadge source={book.sourceType} />

      {book.description ? (
        <Text style={styles.description}>{book.description}</Text>
      ) : null}

      {/* Progress row */}
      {pct > 0 && (
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>{pct}% complete</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>
      )}

      {!hasText && (
        <WarningCard
          message="No text source found. Delete this book and re-import it from Add Book."
          type="warning"
        />
      )}

      <VoiceSelector
        selectedVoice={book.voice}
        selectedSpeed={book.speed}
        onVoiceChange={(v: TtsVoice) => void setVoiceAndSpeed(book.id, v, book.speed)}
        onSpeedChange={(s) => void setVoiceAndSpeed(book.id, book.voice, s)}
      />

      <Pressable style={{ width: '100%' }}>
        <PrimaryButton
          label={book.status === 'listening' ? 'Continue Listening' : 'Start Listening'}
          onPress={() => navigation.navigate('Player', { bookId: book.id })}
          disabled={!hasText}
        />
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { alignItems: 'center', padding: spacing.lg, paddingBottom: 60, gap: 14 },
  coverCard: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden', marginTop: 8, marginBottom: 6 },
  cover: { width: 200, height: 300 },
  title: { fontFamily: typography.titleFont, fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  author: { fontSize: 15, color: colors.accent, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 14, color: colors.textMuted, lineHeight: 22, textAlign: 'center', paddingHorizontal: 8 },
  progressSection: { width: '100%', gap: 4 },
  progressLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textAlign: 'right' },
  progressTrack: { height: 5, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  missing: { color: colors.text, margin: 24 },
});
