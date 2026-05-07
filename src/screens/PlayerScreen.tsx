import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { audioService } from '../services/audioService';
import {
  TtsProvider,
  getTtsProvider,
  setTtsProvider,
  speakText,
  stopSpeech,
} from '../services/speechService';
import {
  TtsAuthError,
  TtsQuotaError,
  classifyTtsError,
  generateAudio,
} from '../services/ttsService';
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

  // ── Core state ────────────────────────────────────────────────────────────
  const [ttsProvider, setProvider] = useState<TtsProvider>('device');
  const [statusMsg, setStatusMsg] = useState('');
  const [ttsWarning, setTtsWarning] = useState(''); // clean user-facing warning
  const [error, setError] = useState('');           // blocking error (both providers failed)
  const [isPreparing, setIsPreparing] = useState(false);

  // ── Device TTS state ──────────────────────────────────────────────────────
  const [isDeviceSpeaking, setIsDeviceSpeaking] = useState(false);
  const [deviceChunkIndex, setDeviceChunkIndex] = useState(0);

  // ── Chunk counter (shown in UI) ───────────────────────────────────────────
  const [chunksDone, setChunksDone] = useState(0);
  const [chunksTotal, setChunksTotal] = useState(0);

  // ── Refs for stable callbacks ─────────────────────────────────────────────
  const textChunksRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);         // mirrors isDeviceSpeaking without stale closure
  const deviceChunkRef = useRef(0);            // mirrors deviceChunkIndex without stale closure
  const ttsProviderRef = useRef<TtsProvider>('device');

  // ── Load provider preference on mount ────────────────────────────────────
  useEffect(() => {
    getTtsProvider().then((p) => {
      setProvider(p);
      ttsProviderRef.current = p;
    });
    if (book) void markOpened(book.id);
    return () => {
      // Stop device speech when leaving screen
      void stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!book) {
    return <View style={styles.screen}><Text style={styles.title}>Book not found.</Text></View>;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  const switchProvider = async (p: TtsProvider) => {
    await stopSpeech();
    await audioService.unload();
    setProvider(p);
    ttsProviderRef.current = p;
    await setTtsProvider(p);
    setIsDeviceSpeaking(false);
    isSpeakingRef.current = false;
    setTtsWarning('');
    setError('');
    setStatusMsg('');
    console.log(`[PlayerScreen] Provider switched to: ${p}`);
  };

  /** Load text chunks from cache or fetch from textUrl. Updates ref + state. */
  const resolveTextChunks = async (): Promise<string[]> => {
    if (textChunksRef.current.length > 0) return textChunksRef.current;

    if (book.textCacheUri) {
      try {
        const cached = await loadChunksFromCache(book.textCacheUri);
        textChunksRef.current = cached;
        setChunksTotal(cached.length);
        return cached;
      } catch { /* fall through */ }
    }

    if (book.textUrl) {
      setStatusMsg('Fetching book text…');
      const chunks = await extractFromUrl(book.textUrl);
      if (chunks.length === 0) throw new ExtractionError('No readable text found.');
      const cacheUri = await saveChunksToCache(book.id, chunks);
      await updateBook(book.id, { textCacheUri: cacheUri });
      textChunksRef.current = chunks;
      setChunksTotal(chunks.length);
      return chunks;
    }

    throw new ExtractionError(
      'No text source available. Re-import this book from the Add Book screen.'
    );
  };

  // ── Device TTS playback ───────────────────────────────────────────────────

  const speakChunkAt = useCallback((index: number) => {
    const chunks = textChunksRef.current;
    if (index < 0 || index >= chunks.length) {
      setIsDeviceSpeaking(false);
      isSpeakingRef.current = false;
      console.log('[PlayerScreen] Device TTS: reached end of book');
      return;
    }

    deviceChunkRef.current = index;
    setDeviceChunkIndex(index);
    setIsDeviceSpeaking(true);
    isSpeakingRef.current = true;
    setChunksDone(index + 1);

    console.log(
      `[PlayerScreen] Device TTS — book="${book.title}" chunk=${index}/${chunks.length - 1}`
    );

    speakText(chunks[index], {
      rate: book.speed,
      onStart: () => console.log(`[PlayerScreen] Device TTS chunk ${index} started`),
      onDone: () => {
        console.log(`[PlayerScreen] Device TTS chunk ${index} done, advancing`);
        speakChunkAt(index + 1);
      },
      onError: (err) => {
        console.error('[PlayerScreen] Device TTS error:', err);
        setIsDeviceSpeaking(false);
        isSpeakingRef.current = false;
        setError('Device voice failed. Please try again.');
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.speed, book.title]);

  const devicePlay = () => speakChunkAt(deviceChunkRef.current);

  const devicePause = async () => {
    await stopSpeech();
    setIsDeviceSpeaking(false);
    isSpeakingRef.current = false;
  };

  const deviceSkipForward = async () => {
    await stopSpeech();
    const next = Math.min(deviceChunkRef.current + 1, textChunksRef.current.length - 1);
    speakChunkAt(next);
  };

  const deviceSkipBack = async () => {
    await stopSpeech();
    const prev = Math.max(deviceChunkRef.current - 1, 0);
    speakChunkAt(prev);
  };

  const deviceToggle = async () => {
    if (isSpeakingRef.current) {
      await devicePause();
    } else {
      devicePlay();
    }
  };

  // ── OpenAI TTS playback ───────────────────────────────────────────────────

  const prepareWithOpenAI = async (chunks: string[]) => {
    setStatusMsg('Generating audio…');
    console.log(`[PlayerScreen] OpenAI TTS — book="${book.title}" chunk=0/${chunks.length - 1}`);

    const firstUri = await generateAudio({
      bookId: book.id,
      title: book.title,
      author: book.author,
      text: chunks[0],
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
    console.log('[PlayerScreen] OpenAI TTS chunk 0 playing');

    // Background: generate remaining chunks
    for (let i = 1; i < chunks.length; i++) {
      try {
        const uri = await generateAudio({
          bookId: book.id,
          title: book.title,
          author: book.author,
          text: chunks[i],
          voiceId: book.voice,
          speed: book.speed,
        });
        audioUris.push(uri);
        await audioService.loadChunks([...audioUris], book.id);
        setChunksDone(i + 1);
        console.log(`[PlayerScreen] OpenAI TTS chunk ${i} cached`);
      } catch {
        // Don't abort background gen for single chunk failure
      }
    }
  };

  // ── Main prepare-and-play entry point ─────────────────────────────────────

  const prepareAndPlay = async () => {
    setError('');
    setTtsWarning('');
    setIsPreparing(true);
    setChunksDone(0);

    try {
      setStatusMsg('Loading text…');
      const chunks = await resolveTextChunks();

      if (ttsProviderRef.current === 'device') {
        // ── Device voice path ──────────────────────────────────────────────
        console.log(`[PlayerScreen] Using device TTS — ${chunks.length} chunks`);
        setIsPreparing(false);
        setStatusMsg('');
        speakChunkAt(0);
        return;
      }

      // ── OpenAI voice path ──────────────────────────────────────────────
      try {
        await prepareWithOpenAI(chunks);
      } catch (ttsErr) {
        const isQuotaOrAuth = ttsErr instanceof TtsQuotaError || ttsErr instanceof TtsAuthError;
        const friendly = classifyTtsError(ttsErr);
        console.warn('[PlayerScreen] OpenAI TTS failed:', ttsErr);

        if (isQuotaOrAuth || true /* always fall back for any OpenAI error */) {
          setTtsWarning(`${friendly} Playing with device voice instead.`);
          setIsPreparing(false);
          setStatusMsg('');
          speakChunkAt(0);
        } else {
          throw ttsErr;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Playback failed.';
      setError(msg);
      setStatusMsg('');
      setIsPreparing(false);
    }
  };

  // ── Unified controls ─────────────────────────────────────────────────────

  const isDeviceMode = ttsProvider === 'device' || ttsWarning !== '';
  const isEffectivelyPlaying = isDeviceMode ? isDeviceSpeaking : player.isPlaying;
  const hasStarted = isDeviceMode
    ? (isDeviceSpeaking || deviceChunkIndex > 0)
    : player.chunkUris.length > 0;

  const handlePlayPause = () => {
    if (hasStarted) {
      if (isDeviceMode) {
        void deviceToggle();
      } else {
        void player.toggle();
      }
    } else {
      void prepareAndPlay();
    }
  };

  const handleSkipForward = () => {
    if (isDeviceMode) void deviceSkipForward();
    else void player.skipForward(30);
  };

  const handleSkipBack = () => {
    if (isDeviceMode) void deviceSkipBack();
    else void player.skipBack(30);
  };

  // ── UI labels ─────────────────────────────────────────────────────────────

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
        source={{ uri: book.coverUrl || 'https://placehold.co/200x300/13131A/E8C547/png?text=BookDrive' }}
        style={styles.cover}
      />

      <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.author}>{book.author}</Text>
      <Text style={styles.sourceBadge}>{sourceBadge}</Text>
      <Text style={styles.chapter}>{chunkLabel}</Text>

      {/* Status */}
      {(isPreparing || statusMsg !== '') && (
        <View style={styles.statusRow}>
          {isPreparing && <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />}
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>
      )}

      {/* OpenAI fallback warning — clean, not raw JSON */}
      {ttsWarning !== '' && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>⚠️ {ttsWarning}</Text>
        </View>
      )}

      {/* Blocking error */}
      {error !== '' && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⛔ {error}</Text>
        </View>
      )}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(book.progress * 100)}%` }]} />
      </View>

      {/* Playback controls */}
      <View style={styles.controls}>
        <Pressable style={styles.roundButton} onPress={handleSkipBack}>
          <Ionicons name="play-back" size={28} color={colors.text} />
        </Pressable>

        <Pressable
          style={[styles.playButton, error !== '' && styles.playButtonDisabled]}
          disabled={error !== ''}
          onPress={handlePlayPause}
        >
          {isPreparing && !hasStarted ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Ionicons
              name={isEffectivelyPlaying ? 'pause' : 'play'}
              size={42}
              color={colors.background}
            />
          )}
        </Pressable>

        <Pressable style={styles.roundButton} onPress={handleSkipForward}>
          <Ionicons name="play-forward" size={28} color={colors.text} />
        </Pressable>
      </View>

      <Text style={styles.speed}>{book.speed}x · {book.voice}</Text>

      {/* TTS provider toggle */}
      <View style={styles.providerRow}>
        <Text style={styles.providerLabel}>Voice:</Text>
        <Pressable
          style={[styles.providerChip, ttsProvider === 'device' && styles.providerChipActive]}
          onPress={() => void switchProvider('device')}
          accessibilityRole="radio"
        >
          <Text style={[styles.providerChipText, ttsProvider === 'device' && styles.providerChipTextActive]}>
            📱 Device
          </Text>
        </Pressable>
        <Pressable
          style={[styles.providerChip, ttsProvider === 'openai' && styles.providerChipActive]}
          onPress={() => void switchProvider('openai')}
          accessibilityRole="radio"
        >
          <Text style={[styles.providerChipText, ttsProvider === 'openai' && styles.providerChipTextActive]}>
            ✨ OpenAI
          </Text>
        </Pressable>
      </View>

      {Platform.OS === 'ios' ? null : (
        <Text style={styles.hint}>
          {ttsProvider === 'device' ? 'Using your device\'s built-in voice' : 'Requires OpenAI API credits'}
        </Text>
      )}

      <Pressable onPress={() => void audioService.savePosition(book.id)} style={{ marginTop: 12 }}>
        <Text style={styles.save}>Save position</Text>
      </Pressable>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', padding: 22, backgroundColor: colors.background },
  drivingButton: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
  drivingText: { color: colors.accent, fontWeight: '800' },
  cover: { width: 190, height: 285, borderRadius: 22, marginTop: 20, backgroundColor: colors.card },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 24, textAlign: 'center', marginTop: 18, paddingHorizontal: 8 },
  author: { color: colors.textMuted, marginTop: 4, fontSize: 14 },
  sourceBadge: { color: colors.accentMuted, fontSize: 12, marginTop: 4, fontWeight: '600' },
  chapter: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  warningCard: { backgroundColor: '#2A1F0A', borderRadius: 12, padding: 12, borderColor: '#8A5A00', borderWidth: 1, marginTop: 10, width: '100%' },
  warningText: { color: '#E8A547', fontSize: 13, lineHeight: 19 },
  errorCard: { backgroundColor: '#2A0F0F', borderRadius: 12, padding: 12, borderColor: colors.danger, borderWidth: 1, marginTop: 10, width: '100%' },
  errorText: { color: colors.danger, fontSize: 13 },
  progressTrack: { width: '100%', height: 5, backgroundColor: colors.card, borderRadius: 99, overflow: 'hidden', marginTop: 20 },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 24 },
  roundButton: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  playButton: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  playButtonDisabled: { opacity: 0.4 },
  speed: { color: colors.textMuted, marginTop: 14, textTransform: 'capitalize', fontSize: 13 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
  providerLabel: { color: colors.textMuted, fontSize: 13 },
  providerChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
  providerChipActive: { backgroundColor: colors.cardElevated, borderColor: colors.accent },
  providerChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  providerChipTextActive: { color: colors.accent },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  save: { color: colors.accent, fontSize: 13 },
});
