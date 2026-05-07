// DrivingModeScreen.tsx
// Roadtrip Mode — on-theme white/yellow design matching the rest of the app.
// Uses usePlayerMachine (Standard Voice / device TTS) for reliable Android Bluetooth playback.
// No technical settings. Large Android-friendly controls. Keep-awake while playing.

import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

import { usePlayerMachine } from '../hooks/usePlayerMachine';
import { speakText, stopSpeech } from '../services/speechService';
import { loadChunksFromCache, extractFromUrl, saveChunksToCache } from '../services/textExtractorService';
import { sectionIndexForChunk } from '../services/chapterDetectorService';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DrivingMode'>;

const CAR_AUDIO_TEST_TEXT =
  'Audio test. If you hear this through your car speakers, you are ready.';

export const DrivingModeScreen = ({ navigation, route }: Props) => {
  // Keep screen awake during Roadtrip Mode
  useKeepAwake();

  const book = useLibraryStore((s) => s.getBookById(route.params.bookId));
  const updateBook = useLibraryStore((s) => s.updateBook);
  const updateSectionProgress = useLibraryStore((s) => s.updateSectionProgress);

  const machine = usePlayerMachine(route.params.bookId, book?.speed ?? 1);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [testPlaying, setTestPlaying] = useState(false);

  // Load chunks once
  useEffect(() => {
    if (!book) return;
    void loadChunks();
    return () => { void stopSpeech(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save section progress whenever chunk changes
  useEffect(() => {
    if (!book || !book.sections.length) return;
    const secIdx = sectionIndexForChunk(machine.chunkIndex, book.sections);
    void updateSectionProgress(book.id, secIdx, machine.chunkIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.chunkIndex]);

  const loadChunks = async () => {
    if (!book) return;
    machine.setLoading();
    try {
      let chunks: string[] = [];
      if (book.textCacheUri) {
        try { chunks = await loadChunksFromCache(book.textCacheUri); } catch {/* miss */}
      }
      if (!chunks.length && book.textUrl) {
        chunks = await extractFromUrl(book.textUrl);
        if (chunks.length) {
          const uri = await saveChunksToCache(book.id, chunks);
          await updateBook(book.id, { textCacheUri: uri });
        }
      }
      if (!chunks.length) {
        setLoadError('Could not load this book. Go back and try again.');
        machine.setError('Could not load.');
        return;
      }
      machine.setChunks(chunks);

      // Resume from saved position
      const resumeIndex = book.currentChunkIndex > 0 ? book.currentChunkIndex : 0;
      machine.jumpToChunk(resumeIndex);
      machine.setIdle();
      setLoaded(true);
    } catch {
      setLoadError('Could not load this book. Go back and try again.');
      machine.setError('Could not load.');
    }
  };

  const handleTestAudio = () => {
    if (testPlaying) return;
    // Pause main playback temporarily
    const wasPlaying = machine.playState === 'playing';
    if (wasPlaying) machine.pause();

    setTestPlaying(true);
    speakText(CAR_AUDIO_TEST_TEXT, {
      rate: 0.95,
      onDone: () => {
        setTestPlaying(false);
        // Resume if we paused it
        if (wasPlaying) machine.play();
      },
      onError: () => setTestPlaying(false),
    });
  };

  if (!book) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.errorText}>Book not found.</Text>
      </SafeAreaView>
    );
  }

  const isPlaying = machine.playState === 'playing';
  const isLoading = machine.playState === 'loading';
  const canInteract = loaded && !isLoading && machine.playState !== 'error';

  const sections = book.sections ?? [];
  const sectionType = book.sectionType ?? 'section';
  const activeSectionIndex = sections.length
    ? sectionIndexForChunk(machine.chunkIndex, sections)
    : machine.chunkIndex;
  const totalSections = sections.length || machine.totalChunks;
  const sectionLabel = sectionType === 'chapter' ? 'Chapter' : 'Section';
  const currentSection = sections[activeSectionIndex];

  const pct = totalSections > 0
    ? Math.round(((activeSectionIndex + 1) / totalSections) * 100)
    : 0;

  const statusText = isLoading
    ? 'Preparing…'
    : isPlaying
      ? 'Now listening'
      : machine.playState === 'paused'
        ? 'Paused'
        : machine.playState === 'error'
          ? 'Playback stopped. Press Play to continue.'
          : 'Ready to listen';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Roadtrip Mode</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Cover */}
        <View style={[styles.coverCard, cardShadows.medium]}>
          <Image
            source={{ uri: book.coverUrl || 'https://placehold.co/160x240/FFC107/FFF/png?text=📚' }}
            style={styles.cover}
            resizeMode="cover"
          />
        </View>

        {/* Book info */}
        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.bookAuthor}>{book.author}</Text>

        {/* Status pill */}
        <View style={[styles.statusPill, isPlaying && styles.statusPillPlaying]}>
          {isLoading && <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />}
          <Text style={[styles.statusText, isPlaying && styles.statusTextPlaying]}>
            {statusText}
          </Text>
        </View>

        {/* Section label */}
        {totalSections > 0 && (
          <Text style={styles.sectionLabel}>
            {sectionLabel} {activeSectionIndex + 1} of {totalSections}
            {currentSection?.heading ? `  ·  ${currentSection.heading}` : ''}
          </Text>
        )}

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pctText}>{pct}% complete</Text>

        {/* Load error */}
        {loadError !== '' && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorBoxText}>{loadError}</Text>
          </View>
        )}

        {/* ── Main Controls ── */}
        <View style={styles.controlsRow}>
          {/* Previous */}
          <Pressable
            style={({ pressed }) => [styles.navBtn, !canInteract && styles.btnDisabled, pressed && styles.btnPressed]}
            onPress={() => machine.skipBack()}
            disabled={!canInteract}
          >
            <Ionicons name="play-back" size={28} color={canInteract ? colors.text : colors.textLight} />
            <Text style={[styles.navBtnLabel, !canInteract && styles.navBtnLabelDisabled]}>Previous</Text>
          </Pressable>

          {/* Play / Pause */}
          <Pressable
            style={({ pressed }) => [styles.playBtn, !canInteract && styles.btnDisabled, pressed && styles.playBtnPressed]}
            onPress={() => (isPlaying ? machine.pause() : machine.play())}
            disabled={!canInteract}
          >
            {isLoading
              ? <ActivityIndicator size="large" color={colors.white} />
              : <Ionicons name={isPlaying ? 'pause' : 'play'} size={46} color={colors.white} />
            }
          </Pressable>

          {/* Next */}
          <Pressable
            style={({ pressed }) => [styles.navBtn, !canInteract && styles.btnDisabled, pressed && styles.btnPressed]}
            onPress={() => machine.skipForward()}
            disabled={!canInteract}
          >
            <Ionicons name="play-forward" size={28} color={canInteract ? colors.text : colors.textLight} />
            <Text style={[styles.navBtnLabel, !canInteract && styles.navBtnLabelDisabled]}>Next</Text>
          </Pressable>
        </View>

        {/* Stop */}
        <Pressable
          style={({ pressed }) => [styles.stopBtn, !canInteract && styles.btnDisabled, pressed && { opacity: 0.7 }]}
          onPress={() => machine.stop()}
          disabled={!canInteract}
        >
          <Ionicons name="stop" size={18} color={colors.textMuted} />
          <Text style={styles.stopBtnText}>Stop</Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Test Car Audio */}
        <Pressable
          style={({ pressed }) => [styles.testBtn, testPlaying && styles.testBtnActive, pressed && { opacity: 0.8 }]}
          onPress={handleTestAudio}
          disabled={testPlaying}
        >
          <Ionicons
            name={testPlaying ? 'volume-high' : 'car-outline'}
            size={18}
            color={testPlaying ? colors.accent : colors.text}
          />
          <Text style={[styles.testBtnText, testPlaying && styles.testBtnTextActive]}>
            {testPlaying ? 'Playing test…' : 'Test Car Audio'}
          </Text>
        </Pressable>

        {/* Bluetooth reminder */}
        <View style={styles.reminderBox}>
          <Ionicons name="bluetooth" size={14} color={colors.textMuted} />
          <Text style={styles.reminderText}>
            Connect your phone to car Bluetooth before pressing Play.{'\n'}Start listening before driving.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadows.soft,
  },
  headerTitle: {
    fontFamily: typography.titleFont,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  coverCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginVertical: spacing.md,
  },
  cover: { width: 140, height: 210 },

  bookTitle: {
    fontFamily: typography.titleFont,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: spacing.sm,
    ...cardShadows.soft,
  },
  statusPillPlaying: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  statusText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  statusTextPlaying: { color: colors.accentDark },

  sectionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 99 },
  pctText: { fontSize: 12, color: colors.textMuted, alignSelf: 'flex-end', marginBottom: spacing.lg },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F5',
    borderRadius: radius.md,
    padding: 10,
    borderColor: '#FECACA',
    borderWidth: 1,
    width: '100%',
    marginBottom: spacing.md,
  },
  errorBoxText: { color: colors.danger, fontSize: 13, flex: 1 },

  // ── Controls ──
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
    width: '100%',
  },

  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 4,
    ...cardShadows.soft,
  },
  navBtnLabel: { fontSize: 11, fontWeight: '700', color: colors.text },
  navBtnLabelDisabled: { color: colors.textLight },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },

  playBtn: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadows.accent,
  },
  playBtnPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
  btnDisabled: { opacity: 0.35 },

  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  stopBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },

  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },

  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: '100%',
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: spacing.md,
    ...cardShadows.soft,
  },
  testBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  testBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
  testBtnTextActive: { color: colors.accentDark },

  reminderBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    padding: 12,
    width: '100%',
  },
  reminderText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  errorText: { color: colors.text, margin: 24 },
});
