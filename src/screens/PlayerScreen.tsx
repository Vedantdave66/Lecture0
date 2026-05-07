import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, ListRenderItem,
  Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';

import { WarningCard } from '../components/WarningCard';
import { usePlayerMachine, PlaybackState } from '../hooks/usePlayerMachine';
import { TtsProvider, getTtsProvider, setTtsProvider, stopSpeech } from '../services/speechService';
import { TtsAuthError, TtsQuotaError, classifyTtsError, generateAudio } from '../services/ttsService';
import { extractFromUrl, loadChunksFromCache, saveChunksToCache } from '../services/textExtractorService';
import { audioService } from '../services/audioService';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const STATE_LABEL: Record<PlaybackState, string> = {
  idle: 'Ready to listen', loading: 'Preparing voice…', playing: 'Now playing',
  paused: Platform.OS === 'android' ? 'Paused (resumes from start of chunk)' : 'Paused',
  stopped: 'Stopped', error: 'Playback unavailable',
};
const STATE_COLOR: Partial<Record<PlaybackState, string>> = {
  playing: colors.success, error: colors.danger, paused: colors.accent,
};

const CHUNK_H = 72;

export const PlayerScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((s) => s.getBookById(route.params.bookId));
  const updateBook = useLibraryStore((s) => s.updateBook);
  const markOpened = useLibraryStore((s) => s.markOpened);
  const player = usePlayerStore();

  const machine = usePlayerMachine(route.params.bookId, book?.speed ?? 1);
  const [chunks, setChunks] = useState<string[]>([]);
  const [ttsProvider, setProvider] = useState<TtsProvider>('device');
  const [ttsWarning, setTtsWarning] = useState('');
  const [openAiActive, setOpenAiActive] = useState(false);
  const ttsRef = useRef<TtsProvider>('device');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!book) return;
    void markOpened(book.id);
    void getTtsProvider().then((p) => { setProvider(p); ttsRef.current = p; });
    void loadText();
    return () => { void stopSpeech(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chunks.length) return;
    setTimeout(() => {
      try { flatListRef.current?.scrollToIndex({ index: machine.chunkIndex, animated: true, viewPosition: 0.5 }); }
      catch {/* guard */}
    }, 200);
  }, [machine.chunkIndex, chunks.length]);

  if (!book) return <View style={styles.screen}><Text style={styles.emptyText}>Book not found.</Text></View>;

  const loadText = async () => {
    machine.setLoading();
    try {
      let loaded: string[] = [];
      if (book.textCacheUri) { try { loaded = await loadChunksFromCache(book.textCacheUri); } catch {/* miss */} }
      if (!loaded.length && book.textUrl) {
        loaded = await extractFromUrl(book.textUrl);
        if (loaded.length) {
          const uri = await saveChunksToCache(book.id, loaded);
          await updateBook(book.id, { textCacheUri: uri });
        }
      }
      if (!loaded.length) { machine.setError('No text source. Re-import from Add Book.'); return; }
      setChunks(loaded);
      machine.setChunks(loaded);
      machine.setIdle();
    } catch (err) {
      machine.setError(err instanceof Error ? err.message : 'Failed to load.');
    }
  };

  const switchProvider = async (p: TtsProvider) => {
    await stopSpeech();
    if (openAiActive) { await audioService.unload(); setOpenAiActive(false); }
    setProvider(p); ttsRef.current = p;
    await setTtsProvider(p);
    setTtsWarning(''); machine.stop();
  };

  const playWithOpenAI = async () => {
    if (!chunks.length) return;
    machine.setLoading();
    try {
      const uri = await generateAudio({ bookId: book.id, title: book.title, author: book.author, text: chunks[machine.chunkIndex], voiceId: book.voice, speed: book.speed });
      await player.setActiveBook(book.id, [uri]);
      await player.play();
      setOpenAiActive(true); machine.setIdle();
      for (let i = machine.chunkIndex + 1; i < chunks.length; i++) {
        try { const u = await generateAudio({ bookId: book.id, title: book.title, author: book.author, text: chunks[i], voiceId: book.voice, speed: book.speed }); await audioService.loadChunks([u], book.id); }
        catch {/* ignore */}
      }
    } catch (err) {
      const friendly = classifyTtsError(err);
      if (err instanceof TtsQuotaError || err instanceof TtsAuthError) {
        setTtsWarning(`${friendly} Switched to device voice.`);
        await switchProvider('device'); machine.play();
      } else { machine.setError(friendly); }
    }
  };

  const isDevice = ttsProvider === 'device' || ttsWarning !== '';
  const isPlaying = isDevice ? machine.playState === 'playing' : player.isPlaying;
  const isLoading = machine.playState === 'loading';
  const canInteract = chunks.length > 0 && !isLoading && machine.playState !== 'error';

  const onPlayPause = () => {
    if (!canInteract) return;
    if (isDevice) { isPlaying ? machine.pause() : machine.play(); }
    else { openAiActive ? void player.toggle() : void playWithOpenAI(); }
  };

  type ChunkItem = { text: string; index: number };
  const renderChunk: ListRenderItem<ChunkItem> = ({ item }) => {
    const active = item.index === machine.chunkIndex;
    const done = item.index < machine.chunkIndex;
    return (
      <Pressable
        style={({ pressed }) => [styles.chunkRow, active && styles.chunkActive, done && styles.chunkDone, pressed && { opacity: 0.7 }]}
        onPress={() => machine.jumpToChunk(item.index)}
      >
        <Text style={[styles.chunkNum, active && styles.chunkNumActive]}>{item.index + 1}</Text>
        <Text style={[styles.chunkText, active && styles.chunkTextActive, done && styles.chunkTextDone]} numberOfLines={2}>
          {item.text.slice(0, 100)}
        </Text>
        {active && <View style={styles.activeDot} />}
      </Pressable>
    );
  };

  const stateColor = STATE_COLOR[machine.playState] ?? colors.textMuted;
  const pct = chunks.length ? Math.round(((machine.chunkIndex + 1) / chunks.length) * 100) : 0;

  return (
    <View style={styles.screen}>
      {/* Top controls section */}
      <View style={styles.topArea}>
        <Pressable style={styles.drivingChip} onPress={() => navigation.navigate('DrivingMode', { bookId: book.id })}>
          <Text style={styles.drivingText}>🚗 Driving Mode</Text>
        </Pressable>

        {/* Cover */}
        <View style={[styles.coverCard, cardShadows.medium]}>
          <Image source={{ uri: book.coverUrl || 'https://placehold.co/140x210/FFC107/FFF/png?text=📚' }} style={styles.cover} resizeMode="cover" />
        </View>

        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>

        {/* State */}
        <View style={styles.statePill}>
          {isLoading && <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />}
          <Text style={[styles.stateText, { color: stateColor }]}>{STATE_LABEL[machine.playState]}</Text>
        </View>

        {/* Progress */}
        {chunks.length > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.chunkLabel}>Chunk {machine.chunkIndex + 1} of {chunks.length}</Text>
              <Text style={styles.pctLabel}>{pct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>
        )}

        {ttsWarning !== '' && <WarningCard message={ttsWarning} type="warning" />}
        {machine.errorMsg !== '' && <WarningCard message={machine.errorMsg} type="error" />}

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable style={[styles.sideBtn, !canInteract && styles.btnDisabled]} disabled={!canInteract}
            onPress={() => isDevice ? machine.skipBack() : void player.skipBack(30)}>
            <Ionicons name="play-back" size={24} color={colors.text} />
          </Pressable>

          <Pressable style={[styles.playBtn, cardShadows.accent, !canInteract && styles.btnDisabled]} disabled={!canInteract} onPress={onPlayPause}>
            {isLoading
              ? <ActivityIndicator color={colors.white} />
              : <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color={colors.white} />
            }
          </Pressable>

          <Pressable style={[styles.sideBtn, !canInteract && styles.btnDisabled]} disabled={!canInteract}
            onPress={() => isDevice ? machine.skipForward() : void player.skipForward(30)}>
            <Ionicons name="play-forward" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Provider toggle */}
        <View style={styles.providerRow}>
          <Text style={styles.providerLabel}>Voice:</Text>
          {(['device', 'openai'] as TtsProvider[]).map((p) => (
            <Pressable key={p} style={[styles.providerChip, ttsProvider === p && styles.providerChipActive]} onPress={() => void switchProvider(p)}>
              <Text style={[styles.providerText, ttsProvider === p && styles.providerTextActive]}>{p === 'device' ? '📱 Device' : '✨ OpenAI'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Chunk list */}
      {chunks.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={chunks.map((text, index) => ({ text, index }))}
          keyExtractor={(item) => String(item.index)}
          renderItem={renderChunk}
          getItemLayout={(_, i) => ({ length: CHUNK_H, offset: CHUNK_H * i, index: i })}
          onScrollToIndexFailed={({ index }) => setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: false }), 300)}
          style={styles.chunkList}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.chunkListHeader}>Sections</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topArea: { alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 8 },
  emptyText: { color: colors.text, margin: 24 },
  drivingChip: { alignSelf: 'flex-end', backgroundColor: colors.card, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7, borderColor: colors.border, borderWidth: 1, marginBottom: 4 },
  drivingText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  coverCard: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', marginVertical: 8 },
  cover: { width: 120, height: 180 },
  title: { fontFamily: typography.titleFont, fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 8 },
  author: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statePill: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, ...cardShadows.soft },
  stateText: { fontSize: 12, fontWeight: '700' },
  progressSection: { width: '100%', marginTop: 8, gap: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chunkLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  pctLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: 14 },
  sideBtn: { width: 54, height: 54, borderRadius: radius.full, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...cardShadows.soft },
  playBtn: { width: 78, height: 78, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.35 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  providerLabel: { fontSize: 11, color: colors.textMuted },
  providerChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
  providerChipActive: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  providerText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  providerTextActive: { color: colors.accentDark },
  chunkList: { flex: 1 },
  chunkListHeader: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6, marginTop: 2 },
  chunkRow: { height: CHUNK_H, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, marginBottom: 5, paddingHorizontal: 12, borderColor: colors.border, borderWidth: 1 },
  chunkActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  chunkDone: { opacity: 0.42 },
  chunkNum: { fontSize: 11, fontWeight: '800', color: colors.textMuted, width: 28 },
  chunkNumActive: { color: colors.accentDark },
  chunkText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  chunkTextActive: { color: colors.text, fontWeight: '600' },
  chunkTextDone: { color: colors.textLight },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginLeft: 6 },
});
