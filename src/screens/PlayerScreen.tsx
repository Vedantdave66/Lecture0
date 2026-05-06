import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VoiceSelector } from '../components/VoiceSelector';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, radii, spacing, typography } from '../theme/colors';

const formatTime = (millis: number): string => {
  const totalSeconds = Math.max(0, Math.floor(millis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const PlayerScreen = () => {
  const books = useLibraryStore((state) => state.books);
  const setVoiceAndSpeed = useLibraryStore((state) => state.setVoiceAndSpeed);
  const activeBook = usePlayerStore((state) => state.activeBook) ?? books.find((book) => book.audioUrl) ?? null;
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const positionMillis = usePlayerStore((state) => state.positionMillis);
  const durationMillis = usePlayerStore((state) => state.durationMillis);
  const error = usePlayerStore((state) => state.error);
  const isPreparing = usePlayerStore((state) => state.isPreparing);
  const activeChunkIndex = usePlayerStore((state) => state.activeChunkIndex);
  const totalChunks = usePlayerStore((state) => state.totalChunks);
  const loadBook = usePlayerStore((state) => state.loadBook);
  const toggle = usePlayerStore((state) => state.toggle);
  const seekBy = usePlayerStore((state) => state.seekBy);

  if (!activeBook) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.title}>Nothing playing yet</Text>
        <Text style={styles.subtitle}>Load demo audiobooks from Home or Add to test playback.</Text>
      </View>
    );
  }

  const duration = durationMillis || activeBook.duration * 1000;
  const progress = duration > 0 ? Math.min(100, Math.round((positionMillis / duration) * 100)) : Math.round(activeBook.progress * 100);

  const handlePlay = async () => {
    if (!usePlayerStore.getState().isLoaded) {
      await loadBook(activeBook, true);
      return;
    }
    await toggle();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Now Playing</Text>
      <Image source={{ uri: activeBook.coverUrl ?? 'https://placehold.co/480x640/111827/D6A84F/png?text=BookDrive' }} style={styles.cover} />
      <Text style={styles.title} numberOfLines={2}>{activeBook.title}</Text>
      <Text style={styles.author}>{activeBook.author}</Text>
      <Text style={styles.chapter}>{activeBook.currentChapter}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(positionMillis)}</Text>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.smallControl} onPress={() => void seekBy(-30000)}><Text style={styles.smallControlText}>−30</Text></Pressable>
        <Pressable style={styles.playButton} onPress={() => void handlePlay()} disabled={isPreparing}>{isPreparing ? <Text style={styles.playText}>…</Text> : <Text style={styles.playText}>{isPlaying ? 'Ⅱ' : '▶'}</Text>}</Pressable>
        <Pressable style={styles.smallControl} onPress={() => void seekBy(30000)}><Text style={styles.smallControlText}>+30</Text></Pressable>
      </View>

      {isPreparing ? <Text style={styles.preparing}>Generating first audio chunk…</Text> : null}
      {totalChunks > 0 ? <Text style={styles.chunkText}>Chunk {activeChunkIndex + 1} of {totalChunks}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.placeholderRow}>
        <Pressable style={styles.placeholderButton}><Text style={styles.placeholderText}>Speed {activeBook.speed}x</Text></Pressable>
        <Pressable style={styles.placeholderButton}><Text style={styles.placeholderText}>Voice {activeBook.voice}</Text></Pressable>
        <Pressable style={styles.placeholderButton}><Text style={styles.placeholderText}>Car mode</Text></Pressable>
      </View>

      <View style={styles.voiceCard}>
        <VoiceSelector
          selectedVoice={activeBook.voice}
          selectedSpeed={activeBook.speed}
          onVoiceChange={(voice) => void setVoiceAndSpeed(activeBook.id, voice, activeBook.speed)}
          onSpeedChange={(speed) => void setVoiceAndSpeed(activeBook.id, activeBook.voice, speed)}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 170, alignItems: 'center' },
  emptyScreen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  eyebrow: { alignSelf: 'flex-start', color: colors.primary, fontSize: typography.caption, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '900' },
  cover: { width: 250, height: 330, borderRadius: radii.xl, backgroundColor: colors.surfaceMuted, marginTop: spacing.xl },
  title: { color: colors.text, fontSize: typography.heading, fontWeight: '900', textAlign: 'center', marginTop: spacing.xl, lineHeight: 30 },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  author: { color: colors.textMuted, fontSize: typography.body, marginTop: spacing.sm },
  chapter: { color: colors.primary, fontSize: typography.caption, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: spacing.md },
  progressTrack: { width: '100%', height: 8, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, overflow: 'hidden', marginTop: spacing.xl },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  timeRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  time: { color: colors.textSubtle, fontSize: 12, fontWeight: '700' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.xl },
  smallControl: { width: 68, height: 58, borderRadius: radii.lg, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  smallControlText: { color: colors.text, fontSize: 18, fontWeight: '900' },
  playButton: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  playText: { color: colors.background, fontSize: 42, fontWeight: '900' },
  preparing: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg, fontWeight: '900' },
  chunkText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.lg },
  placeholderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xl },
  placeholderButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  placeholderText: { color: colors.textMuted, fontWeight: '800', textTransform: 'capitalize' },
  voiceCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radii.xl, borderColor: colors.border, borderWidth: 1, padding: spacing.lg, marginTop: spacing.xl }
});
