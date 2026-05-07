import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { usePlayerMachine, PlaybackState } from '../hooks/usePlayerMachine';
import {
  TtsProvider,
  getTtsProvider,
  setTtsProvider,
  stopSpeech,
} from '../services/speechService';
import {
  TtsAuthError,
  TtsQuotaError,
  classifyTtsError,
  generateAudio,
} from '../services/ttsService';
import {
  extractFromUrl,
  loadChunksFromCache,
  saveChunksToCache,
} from '../services/textExtractorService';
import { audioService } from '../services/audioService';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, typography } from '../theme/colors';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const STATE_LABEL: Record<PlaybackState, string> = {
  idle: 'Ready to listen',
  loading: 'Preparing…',
  playing: 'Now playing',
  paused: Platform.OS === 'android' ? 'Paused (will restart chunk)' : 'Paused',
  stopped: 'Stopped',
  error: 'Playback unavailable',
};

const CHUNK_HEIGHT = 72;

export const PlayerScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((s) => s.getBookById(route.params.bookId));
  const updateBook = useLibraryStore((s) => s.updateBook);
  const markOpened = useLibraryStore((s) => s.markOpened);
  const player = usePlayerStore(); // OpenAI path only

  const machine = usePlayerMachine(route.params.bookId, book?.speed ?? 1);

  const [chunks, setChunks] = useState<string[]>([]);
  const [ttsProvider, setProvider] = useState<TtsProvider>('device');
  const [ttsWarning, setTtsWarning] = useState('');
  const [openAiPlaying, setOpenAiPlaying] = useState(false);

  const ttsProviderRef = useRef<TtsProvider>('device');
  const flatListRef = useRef<FlatList>(null);

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!book) return;
    void markOpened(book.id);
    void getTtsProvider().then((p) => {
      setProvider(p);
      ttsProviderRef.current = p;
      console.log(`[PlayerScreen] book="${book.title}" provider=${p}`);
    });
    void loadText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll chunk list when active chunk changes
  useEffect(() => {
    if (chunks.length === 0 || machine.chunkIndex < 0) return;
    setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index: machine.chunkIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch {/* out-of-range guard */}
    }, 200);
  }, [machine.chunkIndex, chunks.length]);

  if (!book) {
    return <View style={styles.screen}><Text style={styles.title}>Book not found.</Text></View>;
  }

  // ── Text loading ──────────────────────────────────────────────────────────
  const loadText = async () => {
    machine.setLoading();
    try {
      let loaded: string[] = [];

      if (book.textCacheUri) {
        try { loaded = await loadChunksFromCache(book.textCacheUri); } catch {/* miss */}
      }
      if (loaded.length === 0 && book.textUrl) {
        loaded = await extractFromUrl(book.textUrl);
        if (loaded.length > 0) {
          const uri = await saveChunksToCache(book.id, loaded);
          await updateBook(book.id, { textCacheUri: uri });
        }
      }

      if (loaded.length === 0) {
        machine.setError('No text source. Re-import this book from Add Book.');
        return;
      }

      setChunks(loaded);
      machine.setChunks(loaded);
      machine.setIdle();
      console.log(`[PlayerScreen] ${loaded.length} chunks loaded`);
    } catch (err) {
      machine.setError(err instanceof Error ? err.message : 'Failed to load text.');
    }
  };

  // ── Provider switch ───────────────────────────────────────────────────────
  const switchProvider = async (p: TtsProvider) => {
    await stopSpeech();
    if (openAiPlaying) { await audioService.unload(); setOpenAiPlaying(false); }
    setProvider(p);
    ttsProviderRef.current = p;
    await setTtsProvider(p);
    setTtsWarning('');
    machine.stop();
    console.log(`[PlayerScreen] provider → ${p}`);
  };

  // ── OpenAI path ───────────────────────────────────────────────────────────
  const playWithOpenAI = async () => {
    if (chunks.length === 0) return;
    machine.setLoading();
    try {
      const firstUri = await generateAudio({
        bookId: book.id, title: book.title, author: book.author,
        text: chunks[machine.chunkIndex],
        voiceId: book.voice, speed: book.speed,
      });
      await player.setActiveBook(book.id, [firstUri]);
      await updateBook(book.id, { status: 'listening' });
      await player.play();
      setOpenAiPlaying(true);
      machine.setIdle(); // OpenAI path manages its own state via playerStore

      for (let i = machine.chunkIndex + 1; i < chunks.length; i++) {
        try {
          const uri = await generateAudio({
            bookId: book.id, title: book.title, author: book.author,
            text: chunks[i], voiceId: book.voice, speed: book.speed,
          });
          await audioService.loadChunks([uri], book.id);
        } catch {/* ignore individual chunk failures */}
      }
    } catch (err) {
      const isQuota = err instanceof TtsQuotaError || err instanceof TtsAuthError;
      const msg = classifyTtsError(err);
      console.warn('[PlayerScreen] OpenAI failed:', err);
      if (isQuota) {
        setTtsWarning(`${msg} Switched to device voice.`);
        await switchProvider('device');
        machine.play();
      } else {
        machine.setError(msg);
      }
    }
  };

  // ── Unified control handlers ──────────────────────────────────────────────
  const isDevice = ttsProvider === 'device' || ttsWarning !== '';

  const handlePlayPause = () => {
    if (chunks.length === 0) return;
    if (isDevice) {
      if (machine.playState === 'playing') machine.pause();
      else machine.play();
    } else {
      if (openAiPlaying) void player.toggle();
      else void playWithOpenAI();
    }
  };

  const handleSkipForward = () => {
    if (isDevice) machine.skipForward();
    else void player.skipForward(30);
  };

  const handleSkipBack = () => {
    if (isDevice) machine.skipBack();
    else void player.skipBack(30);
  };

  const isEffectivelyPlaying = isDevice
    ? machine.playState === 'playing'
    : player.isPlaying;

  const isLoading = machine.playState === 'loading';
  const isButtonDisabled = isLoading || machine.playState === 'error' || chunks.length === 0;
  const stateLabel = STATE_LABEL[machine.playState];

  // ── Chunk list ────────────────────────────────────────────────────────────
  type ChunkItem = { text: string; index: number };

  const renderChunk: ListRenderItem<ChunkItem> = ({ item }) => {
    const isActive = item.index === machine.chunkIndex;
    const isDone = item.index < machine.chunkIndex;

    return (
      <Pressable
        style={[styles.chunkRow, isActive && styles.chunkRowActive, isDone && styles.chunkRowDone]}
        onPress={() => machine.jumpToChunk(item.index)}
        accessibilityRole="button"
        accessibilityLabel={`Jump to chunk ${item.index + 1}`}
      >
        <Text style={[styles.chunkNum, isActive && styles.chunkNumActive, isDone && styles.chunkNumDone]}>
          {item.index + 1}
        </Text>
        <Text
          style={[styles.chunkPreview, isActive && styles.chunkPreviewActive, isDone && styles.chunkPreviewDone]}
          numberOfLines={2}
        >
          {item.text.slice(0, 120)}
        </Text>
        {isActive && (
          <View style={styles.chunkNowDot} />
        )}
      </Pressable>
    );
  };

  const chunkData: ChunkItem[] = chunks.map((text, index) => ({ text, index }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.drivingButton}
          onPress={() => navigation.navigate('DrivingMode', { bookId: book.id })}
        >
          <Text style={styles.drivingText}>Driving Mode</Text>
        </Pressable>

        <Image
          source={{ uri: book.coverUrl || 'https://placehold.co/120x180/13131A/E8C547/png?text=BD' }}
          style={styles.cover}
        />

        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>

        {/* State label */}
        <View style={styles.statePill}>
          {(machine.playState === 'loading') && (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />
          )}
          <Text style={[
            styles.stateText,
            machine.playState === 'playing' && styles.stateTextPlaying,
            machine.playState === 'error' && styles.stateTextError,
          ]}>
            {stateLabel}
          </Text>
        </View>

        {/* Chunk progress */}
        {chunks.length > 0 && (
          <>
            <Text style={styles.chunkLabel}>
              Chunk {machine.chunkIndex + 1} of {chunks.length}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(((machine.chunkIndex + 1) / chunks.length) * 100)}%` }]} />
            </View>
          </>
        )}

        {/* Warnings & errors */}
        {ttsWarning !== '' && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>⚠️ {ttsWarning}</Text>
          </View>
        )}
        {machine.errorMsg !== '' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⛔ {machine.errorMsg}</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={[styles.roundButton, isButtonDisabled && styles.buttonDisabled]}
            onPress={handleSkipBack}
            disabled={isButtonDisabled}
          >
            <Ionicons name="play-back" size={26} color={colors.text} />
          </Pressable>

          <Pressable
            style={[styles.playButton, isButtonDisabled && styles.buttonDisabled]}
            onPress={handlePlayPause}
            disabled={isButtonDisabled}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Ionicons name={isEffectivelyPlaying ? 'pause' : 'play'} size={40} color={colors.background} />
            )}
          </Pressable>

          <Pressable
            style={[styles.roundButton, isButtonDisabled && styles.buttonDisabled]}
            onPress={handleSkipForward}
            disabled={isButtonDisabled}
          >
            <Ionicons name="play-forward" size={26} color={colors.text} />
          </Pressable>
        </View>

        {/* Provider toggle */}
        <View style={styles.providerRow}>
          <Text style={styles.providerLabel}>Voice:</Text>
          {(['device', 'openai'] as TtsProvider[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.providerChip, ttsProvider === p && styles.providerChipActive]}
              onPress={() => void switchProvider(p)}
            >
              <Text style={[styles.providerChipText, ttsProvider === p && styles.providerChipTextActive]}>
                {p === 'device' ? '📱 Device' : '✨ OpenAI'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Chunk list ── */}
      {chunks.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={chunkData}
          keyExtractor={(item) => String(item.index)}
          renderItem={renderChunk}
          getItemLayout={(_, index) => ({ length: CHUNK_HEIGHT, offset: CHUNK_HEIGHT * index, index })}
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index, animated: false });
            }, 300);
          }}
          style={styles.chunkList}
          contentContainerStyle={styles.chunkListContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.chunkListHeader}>Chapters / Sections</Text>}
        />
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  drivingButton: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
  drivingText: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  cover: { width: 120, height: 180, borderRadius: 16, backgroundColor: colors.card, marginTop: 8 },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 22, textAlign: 'center', marginTop: 12, paddingHorizontal: 8 },
  author: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  statePill: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderColor: colors.border, borderWidth: 1 },
  stateText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  stateTextPlaying: { color: colors.success },
  stateTextError: { color: colors.danger },
  chunkLabel: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  progressTrack: { width: '100%', height: 4, backgroundColor: colors.card, borderRadius: 99, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  warningCard: { backgroundColor: '#2A1F0A', borderRadius: 10, padding: 10, borderColor: '#8A5A00', borderWidth: 1, marginTop: 8, width: '100%' },
  warningText: { color: '#E8A547', fontSize: 12, lineHeight: 18 },
  errorCard: { backgroundColor: '#2A0F0F', borderRadius: 10, padding: 10, borderColor: colors.danger, borderWidth: 1, marginTop: 8, width: '100%' },
  errorText: { color: colors.danger, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 16 },
  roundButton: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  playButton: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  buttonDisabled: { opacity: 0.35 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 },
  providerLabel: { color: colors.textMuted, fontSize: 12 },
  providerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
  providerChipActive: { backgroundColor: colors.cardElevated, borderColor: colors.accent },
  providerChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  providerChipTextActive: { color: colors.accent },
  chunkList: { flex: 1 },
  chunkListContent: { paddingHorizontal: 16, paddingBottom: 40 },
  chunkListHeader: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  chunkRow: { height: CHUNK_HEIGHT, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, marginBottom: 6, paddingHorizontal: 12, borderColor: colors.border, borderWidth: 1 },
  chunkRowActive: { backgroundColor: colors.cardElevated, borderColor: colors.accent },
  chunkRowDone: { opacity: 0.4 },
  chunkNum: { color: colors.textMuted, fontSize: 12, width: 30, fontWeight: '700' },
  chunkNumActive: { color: colors.accent },
  chunkNumDone: { color: colors.textMuted },
  chunkPreview: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  chunkPreviewActive: { color: colors.text },
  chunkPreviewDone: { color: colors.textMuted },
  chunkNowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginLeft: 6 },
});
