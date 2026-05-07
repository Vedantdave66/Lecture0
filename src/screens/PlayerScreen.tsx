// PlayerScreen.tsx
// Standard Voice is default. Shows Chapter/Section list instead of raw chunks.
// OpenAI Premium Voice stays available as an optional toggle.

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
import { loadChunksFromCache, extractFromUrl, saveChunksToCache } from '../services/textExtractorService';
import { detectSections } from '../services/chapterDetectorService';
import { audioService } from '../services/audioService';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { BookSection, RootStackParamList } from '../types';
import { sectionIndexForChunk } from '../services/chapterDetectorService';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const STATE_LABEL: Record<PlaybackState, string> = {
  idle: 'Ready to listen',
  loading: 'Preparing…',
  playing: 'Now listening',
  paused: 'Paused',
  stopped: 'Stopped',
  error: 'Playback stopped. Press Play to continue.',
};

const STATE_COLOR: Partial<Record<PlaybackState, string>> = {
  playing: colors.success,
  error: colors.danger,
  paused: colors.accent,
};

const SECTION_H = 72;

export const PlayerScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((s) => s.getBookById(route.params.bookId));
  const updateBook = useLibraryStore((s) => s.updateBook);
  const updateSectionProgress = useLibraryStore((s) => s.updateSectionProgress);
  const markOpened = useLibraryStore((s) => s.markOpened);
  const player = usePlayerStore();

  const machine = usePlayerMachine(route.params.bookId, book?.speed ?? 1);
  const [chunks, setChunks] = useState<string[]>([]);
  const [sections, setSections] = useState<BookSection[]>(book?.sections ?? []);
  const [sectionType, setSectionType] = useState<'chapter' | 'section'>(book?.sectionType ?? 'section');
  const [ttsProvider, setProvider] = useState<TtsProvider>('device');
  const [ttsWarning, setTtsWarning] = useState('');
  const [openAiActive, setOpenAiActive] = useState(false);
  const [showPremiumToggle, setShowPremiumToggle] = useState(false);
  const ttsRef = useRef<TtsProvider>('device');
  const flatListRef = useRef<FlatList>(null);

  // Jump to a section if navigated with startSectionIndex
  const startSectionIndex = route.params.startSectionIndex ?? 0;

  useEffect(() => {
    if (!book) return;
    void markOpened(book.id);
    void getTtsProvider().then((p) => { setProvider(p); ttsRef.current = p; });
    void loadText();
    return () => { void stopSpeech(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll section list to active section
  useEffect(() => {
    if (!sections.length) return;
    const activeSec = sectionIndexForChunk(machine.chunkIndex, sections);
    setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({ index: activeSec, animated: true, viewPosition: 0.5 });
      } catch {/* guard */}
    }, 200);
  }, [machine.chunkIndex, sections]);

  // Save section progress whenever chunk changes
  useEffect(() => {
    if (!sections.length || !book) return;
    const secIdx = sectionIndexForChunk(machine.chunkIndex, sections);
    void updateSectionProgress(book.id, secIdx, machine.chunkIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.chunkIndex]);

  if (!book) {
    return <View style={styles.screen}><Text style={styles.emptyText}>Book not found.</Text></View>;
  }

  const loadText = async () => {
    machine.setLoading();
    try {
      let loaded: string[] = [];

      // Try cache first
      if (book.textCacheUri) {
        try { loaded = await loadChunksFromCache(book.textCacheUri); } catch {/* miss */}
      }

      // Fallback: fetch from URL
      if (!loaded.length && book.textUrl) {
        loaded = await extractFromUrl(book.textUrl);
        if (loaded.length) {
          const uri = await saveChunksToCache(book.id, loaded);
          await updateBook(book.id, { textCacheUri: uri });
        }
      }

      if (!loaded.length) {
        machine.setError('No text source found. Try finding this book again.');
        return;
      }

      setChunks(loaded);
      machine.setChunks(loaded);

      // Build/refresh sections if book has none
      let activeSections = sections;
      if (!activeSections.length) {
        const detected = detectSections(loaded);
        activeSections = detected.sections;
        setSections(detected.sections);
        setSectionType(detected.sectionType);
        await updateBook(book.id, { sections: detected.sections, sectionType: detected.sectionType });
      }

      // Jump to requested section on first load
      if (startSectionIndex > 0 && activeSections.length > startSectionIndex) {
        machine.jumpToChunk(activeSections[startSectionIndex].chunkStart);
      } else {
        // Resume from saved position
        machine.jumpToChunk(book.currentChunkIndex > 0 ? book.currentChunkIndex : 0);
      }

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
      const uri = await generateAudio({
        bookId: book.id, title: book.title, author: book.author,
        text: chunks[machine.chunkIndex], voiceId: book.voice, speed: book.speed,
      });
      await player.setActiveBook(book.id, [uri]);
      await player.play();
      setOpenAiActive(true); machine.setIdle();
    } catch (err) {
      const friendly = classifyTtsError(err);
      if (err instanceof TtsQuotaError || err instanceof TtsAuthError) {
        setTtsWarning(`Premium Voice unavailable. Using Standard Voice.`);
        await switchProvider('device'); machine.play();
      } else {
        machine.setError('Playback stopped. Press Play to continue.');
      }
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

  const activeSectionIndex = sectionIndexForChunk(machine.chunkIndex, sections);
  const stateColor = STATE_COLOR[machine.playState] ?? colors.textMuted;
  const pct = sections.length
    ? Math.round(((activeSectionIndex + 1) / sections.length) * 100)
    : chunks.length
      ? Math.round(((machine.chunkIndex + 1) / chunks.length) * 100)
      : 0;

  const sectionLabel = sectionType === 'chapter' ? 'Chapter' : 'Section';
  const sectionCount = sections.length || chunks.length;

  type SectionItem = { section: BookSection; index: number } | { chunkText: string; index: number };

  // Use sections for list if available, otherwise flat chunk list
  const listData: Array<{ label: string; subLabel: string; index: number; chunkStart: number }> =
    sections.length > 0
      ? sections.map((s, i) => ({
          label: s.label,
          subLabel: s.heading ?? '',
          index: i,
          chunkStart: s.chunkStart,
        }))
      : chunks.map((c, i) => ({
          label: `${sectionLabel} ${i + 1}`,
          subLabel: c.slice(0, 60),
          index: i,
          chunkStart: i,
        }));

  type ListItem = typeof listData[0];

  const renderSection: ListRenderItem<ListItem> = ({ item }) => {
    const active = sections.length > 0
      ? item.index === activeSectionIndex
      : item.index === machine.chunkIndex;
    const done = sections.length > 0
      ? item.index < activeSectionIndex
      : item.index < machine.chunkIndex;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.sectionRow,
          active && styles.sectionActive,
          done && styles.sectionDone,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => machine.jumpToChunk(item.chunkStart)}
      >
        <Text style={[styles.sectionNum, active && styles.sectionNumActive]}>
          {item.index + 1}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionLabel, active && styles.sectionLabelActive, done && styles.sectionLabelDone]}>
            {item.label}
          </Text>
          {item.subLabel ? (
            <Text style={[styles.sectionSub, active && styles.sectionSubActive]} numberOfLines={1}>
              {item.subLabel}
            </Text>
          ) : null}
        </View>
        {active && <View style={styles.activeDot} />}
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Top controls section */}
      <View style={styles.topArea}>
        {/* Roadtrip Mode chip */}
        <Pressable style={styles.drivingChip} onPress={() => navigation.navigate('DrivingMode', { bookId: book.id })}>
          <Ionicons name="car-sport" size={13} color={colors.accentDark} />
          <Text style={styles.drivingText}>Roadtrip Mode</Text>
        </Pressable>

        {/* Cover */}
        <View style={[styles.coverCard, cardShadows.medium]}>
          <Image
            source={{ uri: book.coverUrl || 'https://placehold.co/140x210/FFC107/FFF/png?text=📚' }}
            style={styles.cover}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>

        {/* State */}
        <View style={styles.statePill}>
          {isLoading && <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />}
          <Text style={[styles.stateText, { color: stateColor }]}>{STATE_LABEL[machine.playState]}</Text>
        </View>

        {/* Progress */}
        {sectionCount > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.chunkLabel}>
                {sectionLabel} {(sections.length > 0 ? activeSectionIndex : machine.chunkIndex) + 1} of {sectionCount}
              </Text>
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
          <Pressable
            style={[styles.sideBtn, !canInteract && styles.btnDisabled]}
            disabled={!canInteract}
            onPress={() => isDevice ? machine.skipBack() : void player.skipBack(30)}
          >
            <Ionicons name="play-back" size={22} color={colors.text} />
          </Pressable>

          <Pressable
            style={[styles.playBtn, cardShadows.accent, !canInteract && styles.btnDisabled]}
            disabled={!canInteract}
            onPress={onPlayPause}
          >
            {isLoading
              ? <ActivityIndicator color={colors.white} />
              : <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color={colors.white} />
            }
          </Pressable>

          <Pressable
            style={[styles.sideBtn, !canInteract && styles.btnDisabled]}
            disabled={!canInteract}
            onPress={() => isDevice ? machine.skipForward() : void player.skipForward(30)}
          >
            <Ionicons name="play-forward" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Voice — Standard Voice default. Premium Voice optional (collapsed). */}
        <Pressable style={styles.voiceToggleRow} onPress={() => setShowPremiumToggle((v) => !v)}>
          <Ionicons name="mic" size={13} color={colors.textMuted} />
          <Text style={styles.voiceToggleText}>
            {ttsProvider === 'device' ? 'Standard Voice' : '✨ Premium Voice'}
          </Text>
          <Ionicons name={showPremiumToggle ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textMuted} />
        </Pressable>

        {showPremiumToggle && (
          <View style={styles.providerRow}>
            {(['device', 'openai'] as TtsProvider[]).map((p) => (
              <Pressable
                key={p}
                style={[styles.providerChip, ttsProvider === p && styles.providerChipActive]}
                onPress={() => void switchProvider(p)}
              >
                <Text style={[styles.providerText, ttsProvider === p && styles.providerTextActive]}>
                  {p === 'device' ? '📱 Standard Voice' : '✨ Premium Voice'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Section / Chapter list */}
      {listData.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={listData}
          keyExtractor={(item) => String(item.index)}
          renderItem={renderSection}
          getItemLayout={(_, i) => ({ length: SECTION_H, offset: SECTION_H * i, index: i })}
          onScrollToIndexFailed={({ index }) =>
            setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: false }), 300)
          }
          style={styles.sectionList}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.sectionListHeader}>
              {sectionType === 'chapter' ? 'Chapters' : 'Sections'}
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topArea: { alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 8 },
  emptyText: { color: colors.text, margin: 24 },

  drivingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    backgroundColor: colors.accentLight,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderColor: colors.accent,
    borderWidth: 1,
    marginBottom: 4,
  },
  drivingText: { color: colors.accentDark, fontSize: 12, fontWeight: '800' },

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

  voiceToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingHorizontal: 10, paddingVertical: 5 },
  voiceToggleText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  providerChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
  providerChipActive: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  providerText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  providerTextActive: { color: colors.accentDark },

  sectionList: { flex: 1 },
  sectionListHeader: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6, marginTop: 2 },
  sectionRow: { height: SECTION_H, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, marginBottom: 5, paddingHorizontal: 12, borderColor: colors.border, borderWidth: 1 },
  sectionActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  sectionDone: { opacity: 0.42 },
  sectionNum: { fontSize: 11, fontWeight: '800', color: colors.textMuted, width: 28 },
  sectionNumActive: { color: colors.accentDark },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  sectionLabelActive: { color: colors.accentDark },
  sectionLabelDone: { color: colors.textLight },
  sectionSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sectionSubActive: { color: colors.textMuted },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginLeft: 6 },
});
