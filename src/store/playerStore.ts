import { create } from 'zustand';

import { audioService } from '../services/audioService';
import { AudioTrack, Book } from '../types';

type PlayerState = {
  activeBook: Book | null;
  isPlaying: boolean;
  isLoaded: boolean;
  positionMillis: number;
  durationMillis: number;
  error: string | null;
  loadBook: (book: Book, autoplay?: boolean) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  toggle: () => Promise<void>;
  seekBy: (deltaMillis: number) => Promise<void>;
  clear: () => Promise<void>;
};

const toTrack = (book: Book): AudioTrack | null => {
  if (!book.audioUrl) {
    return null;
  }

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    audioUrl: book.audioUrl,
    artwork: book.coverUrl,
    duration: book.duration,
    isDemo: book.sourceType === 'demo'
  };
};

export const usePlayerStore = create<PlayerState>((set, get) => {
  audioService.subscribe((status) => {
    set({
      isPlaying: status.isPlaying,
      isLoaded: status.isLoaded,
      positionMillis: status.positionMillis,
      durationMillis: status.durationMillis,
      error: status.error
    });
  });

  return {
    activeBook: null,
    isPlaying: false,
    isLoaded: false,
    positionMillis: 0,
    durationMillis: 0,
    error: null,

    loadBook: async (book, autoplay = true) => {
      const track = toTrack(book);
      if (!track) {
        set({ activeBook: book, error: 'Demo audio has not been generated for this book yet.', isPlaying: false });
        return;
      }

      set({ activeBook: book, error: null });
      await audioService.loadTrack(track);
      if (autoplay) {
        await audioService.play();
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

    clear: async () => {
      await audioService.unload();
      set({ activeBook: null, isPlaying: false, isLoaded: false, positionMillis: 0, durationMillis: 0, error: null });
    }
  };
});
