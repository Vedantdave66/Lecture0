import { create } from 'zustand';

import { audioService } from '../services/audioService';

type PlayerState = {
  activeBookId: string | null;
  isPlaying: boolean;
  chunkUris: string[];
  setActiveBook: (bookId: string, chunkUris: string[]) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  toggle: () => Promise<void>;
  skipForward: (seconds: number) => Promise<void>;
  skipBack: (seconds: number) => Promise<void>;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  activeBookId: null,
  isPlaying: false,
  chunkUris: [],

  setActiveBook: async (bookId, chunkUris) => {
    await audioService.loadChunks(chunkUris, bookId);
    await audioService.restorePosition(bookId);
    set({ activeBookId: bookId, chunkUris });
  },

  play: async () => {
    await audioService.play();
    set({ isPlaying: true });
  },

  pause: async () => {
    await audioService.pause();
    set({ isPlaying: false });
  },

  toggle: async () => {
    if (get().isPlaying) {
      await get().pause();
      return;
    }
    await get().play();
  },

  skipForward: async (seconds) => audioService.skipForward(seconds),
  skipBack: async (seconds) => audioService.skipBack(seconds)
}));
