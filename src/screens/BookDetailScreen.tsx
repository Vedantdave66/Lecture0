import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VoiceSelector } from '../components/VoiceSelector';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, radii, spacing, typography } from '../theme/colors';
import { Book, TtsVoice } from '../types';

type Props = {
  book: Book;
  onClose: () => void;
  onPlay: () => void;
};

export const BookDetailScreen = ({ book, onClose, onPlay }: Props) => {
  const setVoiceAndSpeed = useLibraryStore((state) => state.setVoiceAndSpeed);
  const loadBook = usePlayerStore((state) => state.loadBook);
  const generateAndPlayBook = usePlayerStore((state) => state.generateAndPlayBook);
  const isPreparing = usePlayerStore((state) => state.isPreparing);
  const error = usePlayerStore((state) => state.error);

  const handleGenerate = async () => {
    await generateAndPlayBook(book);
    onPlay();
  };

  const handlePlay = async () => {
    await loadBook(book, true);
    onPlay();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>Close</Text></Pressable>
      <Image source={{ uri: book.coverUrl ?? 'https://placehold.co/480x640/111827/D6A84F/png?text=BookDrive' }} style={styles.cover} />
      <Text style={styles.status}>{book.sourceType} · {book.status}</Text>
      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.author}>{book.author}</Text>
      <Text style={styles.description}>{book.description}</Text>
      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Estimated listening time</Text>
        <Text style={styles.metaValue}>{book.estimatedListeningTime}</Text>
      </View>
      <VoiceSelector
        selectedVoice={book.voice}
        selectedSpeed={book.speed}
        onVoiceChange={(voice: TtsVoice) => void setVoiceAndSpeed(book.id, voice, book.speed)}
        onSpeedChange={(speed) => void setVoiceAndSpeed(book.id, book.voice, speed)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.primaryButton, isPreparing && styles.disabledButton]} onPress={() => (book.audioUrl ? void handlePlay() : void handleGenerate())} disabled={isPreparing}>
        {isPreparing ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryText}>{book.audioUrl ? 'Play audiobook' : 'Generate and play'}</Text>}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 170 },
  closeButton: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  closeText: { color: colors.textMuted, fontWeight: '800' },
  cover: { width: 190, height: 260, borderRadius: radii.xl, alignSelf: 'center', backgroundColor: colors.surfaceMuted, marginVertical: spacing.xl },
  status: { color: colors.primary, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '900', fontSize: 12 },
  title: { color: colors.text, fontSize: typography.title, fontWeight: '900', textAlign: 'center', marginTop: spacing.sm },
  author: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, fontSize: typography.body },
  description: { color: colors.textMuted, lineHeight: 23, marginVertical: spacing.xl },
  metaCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderColor: colors.border, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.xl },
  metaLabel: { color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 1.1, fontSize: 11, fontWeight: '900' },
  metaValue: { color: colors.text, fontSize: typography.subheading, fontWeight: '900', marginTop: spacing.xs },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radii.pill, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  disabledButton: { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, borderWidth: 1 },
  primaryText: { color: colors.background, fontWeight: '900' },
  error: { color: colors.danger, marginTop: spacing.md, textAlign: 'center' }
});
