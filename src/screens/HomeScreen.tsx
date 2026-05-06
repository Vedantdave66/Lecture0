import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookCard } from '../components/BookCard';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, radii, shadows, spacing, typography } from '../theme/colors';
import { Book } from '../types';

type Props = {
  onNavigate: (tab: 'Library' | 'Add' | 'Player') => void;
  onOpenBook: (book: Book) => void;
};

const progressPercent = (progress: number) => `${Math.round(progress * 100)}%` as const;

export const HomeScreen = ({ onNavigate, onOpenBook }: Props) => {
  const books = useLibraryStore((state) => state.books);
  const seedDemoLibrary = useLibraryStore((state) => state.seedDemoLibrary);
  const activeBook = usePlayerStore((state) => state.activeBook);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const loadBook = usePlayerStore((state) => state.loadBook);
  const toggle = usePlayerStore((state) => state.toggle);
  const heroBook = activeBook ?? books.find((book) => book.status === 'listening' && book.audioUrl) ?? books.find((book) => book.audioUrl) ?? books[0];
  const recentlyAdded = books.slice(0, 3);
  const readyForDrive = books.filter((book) => Boolean(book.audioUrl)).slice(0, 3);
  const generated = books.filter((book) => book.status === 'generated').slice(0, 3);

  const handleHeroPlay = async () => {
    if (!heroBook) {
      await seedDemoLibrary();
      return;
    }

    if (activeBook?.id === heroBook.id) {
      await toggle();
      return;
    }

    await loadBook(heroBook, true);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>BookDrive</Text>
          <Text style={styles.tagline}>Your AI audiobook library</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>BD</Text></View>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.sectionKicker}>Continue Listening</Text>
        {heroBook ? (
          <View style={styles.heroContent}>
            <Image source={{ uri: heroBook.coverUrl ?? 'https://placehold.co/320x420/111827/D6A84F/png?text=BookDrive' }} style={styles.heroCover} />
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle} numberOfLines={2}>{heroBook.title}</Text>
              <Text style={styles.heroAuthor}>{heroBook.author}</Text>
              <Text style={styles.heroChapter}>{heroBook.currentChapter || 'Demo narration'}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressPercent(heroBook.progress) }]} />
              </View>
              <Text style={styles.progressText}>{progressPercent(heroBook.progress)} complete</Text>
              <Pressable style={styles.heroButton} onPress={() => void handleHeroPlay()}>
                <Text style={styles.heroButtonText}>{activeBook?.id === heroBook.id && isPlaying ? 'Pause' : 'Play demo'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyHero}>
            <Text style={styles.emptyTitle}>Start with demo audio</Text>
            <Text style={styles.emptyText}>Load clean mock books with a public sample MP3 to test playback.</Text>
            <Pressable style={styles.heroButton} onPress={() => void seedDemoLibrary()}>
              <Text style={styles.heroButtonText}>Load demo library</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionCard} onPress={() => onNavigate('Add')}><Text style={styles.actionIcon}>＋</Text><Text style={styles.actionText}>Import PDF</Text></Pressable>
        <Pressable style={styles.actionCard} onPress={() => onNavigate('Add')}><Text style={styles.actionIcon}>▣</Text><Text style={styles.actionText}>Scan Book</Text></Pressable>
        <Pressable style={styles.actionCard} onPress={() => onNavigate('Add')}><Text style={styles.actionIcon}>◎</Text><Text style={styles.actionText}>Generate Audio</Text></Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recently Added</Text>
      {recentlyAdded.map((book) => <BookCard key={book.id} book={book} onPress={() => onOpenBook(book)} />)}

      <Text style={styles.sectionTitle}>Ready for the Drive</Text>
      {readyForDrive.map((book) => <BookCard key={`drive-${book.id}`} book={book} onPress={() => onOpenBook(book)} />)}

      <Text style={styles.sectionTitle}>Generated Narrations</Text>
      {generated.length > 0 ? generated.map((book) => <BookCard key={`generated-${book.id}`} book={book} onPress={() => onOpenBook(book)} />) : <Text style={styles.muted}>Generated narration cards will appear here.</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 170 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  appName: { color: colors.text, fontSize: typography.title, fontWeight: '900' },
  tagline: { color: colors.textMuted, fontSize: typography.body, marginTop: spacing.xs },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '900' },
  heroCard: { backgroundColor: colors.surfaceElevated, borderRadius: radii.xl, padding: spacing.lg, borderColor: colors.border, borderWidth: 1, ...shadows.card },
  sectionKicker: { color: colors.primary, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1.2, fontWeight: '900', marginBottom: spacing.md },
  heroContent: { flexDirection: 'row', gap: spacing.lg },
  heroCover: { width: 128, height: 178, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  heroCopy: { flex: 1 },
  heroTitle: { color: colors.text, fontSize: 24, fontWeight: '900', lineHeight: 29 },
  heroAuthor: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  heroChapter: { color: colors.primary, fontSize: 13, marginTop: spacing.md, fontWeight: '800' },
  progressTrack: { height: 7, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, overflow: 'hidden', marginTop: spacing.md },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  progressText: { color: colors.textSubtle, fontSize: 12, marginTop: spacing.sm },
  heroButton: { backgroundColor: colors.primary, borderRadius: radii.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  heroButtonText: { color: colors.background, fontWeight: '900' },
  emptyHero: { paddingVertical: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: typography.heading, fontWeight: '900' },
  emptyText: { color: colors.textMuted, marginTop: spacing.sm, lineHeight: 22 },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.xl },
  actionCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 96, justifyContent: 'space-between' },
  actionIcon: { color: colors.primary, fontSize: 26, fontWeight: '900' },
  actionText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  sectionTitle: { color: colors.text, fontSize: typography.subheading, fontWeight: '900', marginTop: spacing.xl, marginBottom: spacing.md },
  muted: { color: colors.textMuted, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderColor: colors.border, borderWidth: 1 }
});
