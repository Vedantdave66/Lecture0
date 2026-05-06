import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { audioService } from '../services/audioService';
import { extractTextFromPDF } from '../services/pdfParserService';
import { generateAudio } from '../services/ttsService';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, typography } from '../theme/colors';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

export const PlayerScreen = ({ navigation, route }: Props) => {
  const book = useLibraryStore((state) => state.getBookById(route.params.bookId));
  const updateBook = useLibraryStore((state) => state.updateBook);
  const player = usePlayerStore();
  const [isPreparing, setIsPreparing] = useState(false);

  if (!book) {
    return <View style={styles.screen}><Text style={styles.title}>Book not found.</Text></View>;
  }

  const prepareAndPlay = async () => {
    const source = book.pdfLocalPath ?? book.pdfUrl;
    if (!source) {
      return;
    }
    setIsPreparing(true);
    try {
      const textChunks = await extractTextFromPDF(source);
      const audioChunks = await Promise.all(
        textChunks.slice(0, 3).map((chunk) =>
          generateAudio({
            bookId: book.id,
            title: book.title,
            author: book.author,
            text: chunk,
            voiceId: book.voice,
          })
        )
      );
      await player.setActiveBook(book.id, audioChunks);
      await updateBook(book.id, { status: 'listening' });
      await player.play();
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Pressable style={styles.drivingButton} onPress={() => navigation.navigate('DrivingMode', { bookId: book.id })}>
        <Text style={styles.drivingText}>Driving Mode</Text>
      </Pressable>
      <Image source={{ uri: book.coverUrl || 'https://placehold.co/240x360/13131A/E8C547/png?text=BookDrive' }} style={styles.cover} />
      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.chapter}>Chapter / chunk {book.currentChunkIndex + 1}</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(book.progress * 100)}%` }]} /></View>
      <View style={styles.controls}>
        <Pressable style={styles.roundButton} onPress={() => void player.skipBack(30)}><Ionicons name="play-back" size={28} color={colors.text} /></Pressable>
        <Pressable style={styles.playButton} onPress={() => (player.chunkUris.length > 0 ? void player.toggle() : void prepareAndPlay())}>
          {isPreparing ? <ActivityIndicator color={colors.background} /> : <Ionicons name={player.isPlaying ? 'pause' : 'play'} size={42} color={colors.background} />}
        </Pressable>
        <Pressable style={styles.roundButton} onPress={() => void player.skipForward(30)}><Ionicons name="play-forward" size={28} color={colors.text} /></Pressable>
      </View>
      <Text style={styles.speed}>{book.speed}x · {book.voice}</Text>
      <Pressable onPress={() => void audioService.savePosition(book.id)}><Text style={styles.save}>Save position</Text></Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', padding: 22, backgroundColor: colors.background },
  drivingButton: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
  drivingText: { color: colors.accent, fontWeight: '800' },
  cover: { width: 220, height: 330, borderRadius: 26, marginTop: 28, backgroundColor: colors.card },
  title: { color: colors.text, fontFamily: typography.titleFont, fontSize: 30, textAlign: 'center', marginTop: 24 },
  chapter: { color: colors.textMuted, marginTop: 8 },
  progressTrack: { width: '100%', height: 8, backgroundColor: colors.card, borderRadius: 99, overflow: 'hidden', marginTop: 34 },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 34 },
  roundButton: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  playButton: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  speed: { color: colors.textMuted, marginTop: 18, textTransform: 'capitalize' },
  save: { color: colors.accent, marginTop: 22 }
});
