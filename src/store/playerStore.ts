import { create } from 'zustand';

import { audioService } from '../services/audioService';
import { findPDF } from '../services/pdfFinderService';
import { extractTextFromPDF } from '../services/pdfParserService';
import { generateAudio } from '../services/ttsService';
import { AudioTrack, Book } from '../types';

type PlayerState = {
  activeBook: Book | null;
  isPlaying: boolean;
  isLoaded: boolean;
  isPreparing: boolean;
  positionMillis: number;
  durationMillis: number;
  activeChunkIndex: number;
  totalChunks: number;
  error: string | null;
  loadBook: (book: Book, autoplay?: boolean) => Promise<void>;
  generateAndPlayBook: (book: Book) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  toggle: () => Promise<void>;
  seekBy: (deltaMillis: number) => Promise<void>;
  nextChunk: () => Promise<void>;
  previousChunk: () => Promise<void>;
  clear: () => Promise<void>;
};

const toTrack = (book: Book, audioUrl: string): AudioTrack => ({
  id: book.id,
  title: book.title,
  author: book.author,
  audioUrl,
  artwork: book.coverUrl,
  duration: book.duration,
  isDemo: book.sourceType === 'demo'
});

export const usePlayerStore = create<PlayerState>((set, get) => {
  audioService.subscribe((status) => {
    set({
      isPlaying: status.isPlaying,
      isLoaded: status.isLoaded,
      isPreparing: status.isPreparing,
      positionMillis: status.positionMillis,
      durationMillis: status.durationMillis,
      activeChunkIndex: status.activeChunkIndex,
      totalChunks: status.totalChunks,
      error: status.error
    });
  });

  return {
    activeBook: null,
    isPlaying: false,
    isLoaded: false,
    isPreparing: false,
    positionMillis: 0,
    durationMillis: 0,
    activeChunkIndex: 0,
    totalChunks: 0,
    error: null,

    loadBook: async (book, autoplay = true) => {
      if (!book.audioUrl) {
        await get().generateAndPlayBook(book);
        return;
      }

      set({ activeBook: book, error: null, isPreparing: true });
      const track = toTrack(book, book.audioUrl);
      await audioService.loadTrack(track);
      if (autoplay) {
        await audioService.play();
      }
    },

    generateAndPlayBook: async (book) => {
      set({ activeBook: book, error: null, isPreparing: true });
      try {
        const pdfUrl = await findPDF(book.title, book.author);
        if (!pdfUrl) {
          throw new Error('No demo PDF source is available for this book.');
        }

        const chunks = await extractTextFromPDF(pdfUrl);
        if (chunks.length === 0) {
          throw new Error('No readable text chunks were found for this book.');
        }

        const audioUris: string[] = [];
        for (const chunk of chunks) {
          audioUris.push(await generateAudio(chunk, book.voice, book.speed));
        }

        const firstAudioUri = audioUris[0];
        const track = toTrack({ ...book, audioUrl: firstAudioUri }, firstAudioUri);
        await audioService.loadQueue(track, audioUris);
        await audioService.play();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to prepare audiobook.';
        console.log('[BookDrivePlayer] generation failed', message);
        set({ error: message, isPreparing: false, isPlaying: false });
      }
    },

    play: async () => {
      await audioService.play();
    },

    pause: async () => {
      await audioService.pause();
    },

    toggle: async () => {
      const { activeBook } = get();
      if (!activeBook) {
        return;
      }

      if (!get().isLoaded) {
        await get().loadBook(activeBook, true);
        return;
      }

      await audioService.toggle();
    },

    seekBy: async (deltaMillis) => {
      await audioService.seekBy(deltaMillis);
    },

    nextChunk: async () => {
      await audioService.nextChunk();
    },

    previousChunk: async () => {
      await audioService.previousChunk();
    },

    clear: async () => {
      await audioService.unload();
      set({
        activeBook: null,
        isPlaying: false,
        isLoaded: false,
        isPreparing: false,
        positionMillis: 0,
        durationMillis: 0,
        activeChunkIndex: 0,
        totalChunks: 0,
        error: null
      });
    }
  };
});
