import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { audioService } from '../services/audioService';
import { generateAudio } from '../services/ttsService';
import {
  ExtractionError,
  extractFromUrl,
  loadChunksFromCache,
  saveChunksToCache,
} from '../services/textExtractorService';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, typography } from '../theme/colors';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

export const PlayerScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((s) => s.getBookById(route.params.bookId));
  const updateBook = useLibraryStore((s) => s.updateBook);
  const markOpened = useLibraryStore((s) => s.markOpened);
  const player = usePlayerStore();

  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [chunksDone, setChunksDone] = useState(0);
  const [chunksTotal, setChunksTotal] = useState(0);

  useEffect(() => {
    if (book) void markOpened(book.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  if (!book) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Book not found.</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Load text chunks (from cache, or fetch if not cached yet)
  // ---------------------------------------------------------------------------
  const resolveChunks = async (): Promise<string[]> => {
    // 1. Try cache first
    if (book.textCacheUri) {
      try {
        return await loadChunksFromCache(book.textCacheUri);
      } catch {
        // Cache miss — fall through
      }
    }

    // 2. Fetch from textUrl (Gutenberg books seeded via demoBooks)
    if (book.textUrl) {
      setStatusMsg('Fetching book text…');
      const chunks = await extractFromUrl(book.textUrl);
      if (chunks.length === 0) throw new ExtractionError('No readable text found at the book URL.');
      const cacheUri = await saveChunksToCache(book.id, chunks);
      await updateBook(book.id, { textCacheUri: cacheUri });
      return chunks;
    }

    throw new ExtractionError(
      'No text source available for this book. Please re-import it from the Add Book screen.'
    );
  };

  // ---------------------------------------------------------------------------
  // Prepare and start playback
  // ---------------------------------------------------------------------------
  const prepareAndPlay = useCallback(async () => {
    setError('');
    setIsPreparing(true);
    setChunksDone(0);
    setChunksTotal(0);

    try {
      setStatusMsg('Loading text…');
      const textChunks = await resolveChunks();
      setChunksTotal(textChunks.length);

      // Generate first chunk → start playing immediately
      setStatusMsg('Generating audio…');
      const firstUri = await generateAudio({
        bookId: book.id,
        title: book.title,
        author: book.author,
        text: textChunks[0],
        voiceId: book.voice,
        speed: book.speed,
      });

      const audioUris: string[] = [firstUri];
      await player.setActiveBook(book.id, audioUris);
      await updateBook(book.id, { status: 'listening' });
      await player.play();
      setChunksDone(1);
      setIsPreparing(false);
      setStatusMsg('');

      // Generate remaining chunks in background
      for (let i = 1; i < textChunks.length; i++) {
        try {
          const uri = await generateAudio({
            bookId: book.id,
            title: book.title,
            author: book.author,
            text: textChunks[i],
            voiceId: book.voice,
            speed: book.speed,
          });
          audioUris.push(uri);
          await audioService.loadChunks([...audioUris], book.id);
          setChunksDone(i + 1);
        } catch {
          // Don't abort background generation for a single chunk failure
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Playback failed.';
      setError(msg);
      setStatusMsg('');
      setIsPreparing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, book.textUrl, book.textCacheUri, book.voice, book.speed]);

  const chunkLabel =
    chunksTotal > 0
      ? `Chunk ${chunksDone} of ${chunksTotal}`
      : `Chunk ${book.currentChunkIndex + 1}`;

  const sourceBadge = book.sourceType === 'upload' ? '📁 Uploaded' : '🌐 Gutenberg';

  return (
    <View style={styles.screen}>
      <Pressable
        style={styles.drivingButton}
        onPress={() => navigation.navigate('DrivingMode', { bookId: book.id })}
      >
        <Text style={styles.drivingText}>Driving Mode</Text>
      </Pressable>

      <Image
        source={{ uri: book.coverUrl || 'https://placehold.co/240x360/13131A/E8C547/png?text=BookDrive' }}
        style={styles.cover}
      />

      <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.author}>{book.author}</Text>
      <Text style={styles.sourceBadge}>{sourceBadge}</Text>
      <Text style={styles.chapter}>{chunkLabel}</Text>

      {/* Status / loading */}
      {(isPreparing || statusMsg !== '') && (
        <View style={styles.statusRow}>
          {isPreparing && <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />}
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>
      )}

      {/* Error */}
      {error !== '' && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(book.progress * 100)}%` }]} />
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.roundButton} onPress={() => void player.skipBack(30)}>
          <Ionicons name="play-back" size={28} color={colors.text} />
        </Pressable>

        <Pressable
          style={[styles.playButton, error !== '' && styles.playButtonDisabled]}
          disabled={error !== ''}
          onPress={() => (player.chunkUris.length > 0 ? void player.toggle() : void prepareAndPlay())}
        >
          {isPreparing && player.chunkUris.length === 0 ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Ionicons name={player.isPlaying ? 'pause' : 'play'} size={42} color={colors.background} />
          )}
        </Pressable>

        <Pressable style={styles.roundButton} onPress={() => void player.skipForward(30)}>
          <Ionicons name="play-forward" size={28} color={colors.text} />
        </Pressable>
      </View>

      <Text style={styles.speed}>{book.speed}x · {book.voice}</Text>
      <Pressable onPress={() => void audioService.savePosition(book.id)}>
        <Text style={styles.save}>Save position</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', padding: 22, backgroundColor: colors.background },
  drivingButton: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
  drivingText: { color: colors.accent, fontWeight: '800' },
  cover: { width: 200, height: 300, borderRadius: 24, marginTop: 24, backgroundColor: colors.card },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 26, textAlign: 'center', marginTop: 20 },
  author: { color: colors.textMuted, marginTop: 4, fontSize: 14 },
  sourceBadge: { color: colors.accentMuted, fontSize: 12, marginTop: 4, fontWeight: '600' },
  chapter: { color: colors.textMuted, marginTop: 6, fontSize: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  statusText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  errorCard: { backgroundColor: '#2A0F0F', borderRadius: 12, padding: 12, borderColor: colors.danger, borderWidth: 1, marginTop: 10, width: '100%' },
  errorText: { color: colors.danger, fontSize: 13 },
  progressTrack: { width: '100%', height: 6, backgroundColor: colors.card, borderRadius: 99, overflow: 'hidden', marginTop: 24 },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 30 },
  roundButton: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  playButton: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  playButtonDisabled: { opacity: 0.4 },
  speed: { color: colors.textMuted, marginTop: 16, textTransform: 'capitalize', fontSize: 13 },
  save: { color: colors.accent, marginTop: 18, fontSize: 13 },
});
