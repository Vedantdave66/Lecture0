import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { SourceBadge } from '../components/SourceBadge';
import { WarningCard } from '../components/WarningCard';
import { VoiceSelector } from '../components/VoiceSelector';
import { useLibraryStore } from '../store/libraryStore';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { BookSection, RootStackParamList, TtsVoice } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

export const BookDetailScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((s) => s.getBookById(route.params.bookId));
  const setVoiceAndSpeed = useLibraryStore((s) => s.setVoiceAndSpeed);

  if (!book) {
    return <View style={styles.screen}><Text style={styles.missing}>Book not found.</Text></View>;
  }

  const hasText = !!(book.textCacheUri ?? book.textUrl ?? book.fileUri);
  const pct = Math.round(book.progress * 100);
  const sections: BookSection[] = book.sections ?? [];
  const sectionType = book.sectionType ?? 'section';
  const sectionLabel = sectionType === 'chapter' ? 'Chapter' : 'Section';

  const navigateToSection = (section: BookSection, index: number) => {
    navigation.navigate('Player', { bookId: book.id, startSectionIndex: index });
  };

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
          message="No text source found. Delete this book and find it again."
          type="warning"
        />
      )}

      {/* ── Chapters / Sections ── */}
      {sections.length > 0 && (
        <View style={styles.sectionsCard}>
          <View style={styles.sectionsHeader}>
            <Ionicons
              name={sectionType === 'chapter' ? 'book-outline' : 'list-outline'}
              size={16}
              color={colors.accent}
            />
            <Text style={styles.sectionsTitle}>
              {sections.length} {sectionType === 'chapter' ? 'Chapters' : 'Sections'} Found
            </Text>
          </View>
          {sections.map((section, idx) => {
            const isActive = idx === (book.currentSectionIndex ?? 0);
            return (
              <Pressable
                key={section.id}
                style={({ pressed }) => [
                  styles.sectionRow,
                  isActive && styles.sectionRowActive,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigateToSection(section, idx)}
              >
                <Text style={[styles.sectionNum, isActive && styles.sectionNumActive]}>
                  {idx + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionName, isActive && styles.sectionNameActive]}>
                    {section.label}
                  </Text>
                  {section.heading && section.heading !== section.label && (
                    <Text style={styles.sectionHeading} numberOfLines={1}>
                      {section.heading}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="play-circle-outline"
                  size={20}
                  color={isActive ? colors.accent : colors.border}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Voice / Speed selector (collapsed under book settings) */}
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

  sectionsCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
    ...cardShadows.soft,
  },
  sectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    backgroundColor: colors.accentLight,
  },
  sectionsTitle: {
    fontFamily: typography.titleFont,
    fontSize: 14,
    fontWeight: '700',
    color: colors.accentDark,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 10,
  },
  sectionRowActive: { backgroundColor: colors.accentLight },
  sectionNum: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    width: 24,
    textAlign: 'center',
  },
  sectionNumActive: { color: colors.accent },
  sectionName: { fontSize: 14, fontWeight: '600', color: colors.text },
  sectionNameActive: { color: colors.accentDark },
  sectionHeading: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
