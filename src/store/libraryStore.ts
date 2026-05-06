import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { Book, BookSearchResult, TtsVoice } from '../types';
import { demoBooks } from './demoBooks';

const LIBRARY_KEY = 'bookdrive:library:v2';

type LibraryState = {
  books: Book[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  addBook: (result: BookSearchResult) => Promise<Book>;
  updateBook: (bookId: string, patch: Partial<Book>) => Promise<void>;
  setVoiceAndSpeed: (bookId: string, voice: TtsVoice, speed: number) => Promise<void>;
  getBookById: (bookId: string) => Book | undefined;
  seedDemoLibrary: () => Promise<void>;
  clearLibrary: () => Promise<void>;
};

const persist = async (books: Book[]): Promise<void> => {
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(books));
};

const withFreshDemoDates = (): Book[] => demoBooks.map((book) => ({ ...book, dateAdded: new Date().toISOString() }));

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  isHydrated: false,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    const books = raw ? (JSON.parse(raw) as Book[]) : withFreshDemoDates();
    set({ books, isHydrated: true });
    if (!raw) {
      await persist(books);
    }
  },

  addBook: async (result) => {
    const book: Book = {
      id: result.id,
      title: result.title,
      author: result.author,
      coverUrl: result.coverUrl,
      description: result.description,
      status: 'reading',
      progress: 0,
      audioUrl: null,
      duration: 0,
      estimatedListeningTime: 'Needs audio',
      sourceType: 'pdf',
      currentChapter: 'Awaiting import',
      voice: 'alloy',
      speed: 1,
      dateAdded: new Date().toISOString()
    };
    const books = [book, ...get().books.filter((existing) => existing.id !== book.id)];
    set({ books });
    await persist(books);
    return book;
  },

  updateBook: async (bookId, patch) => {
    const books = get().books.map((book) => (book.id === bookId ? { ...book, ...patch } : book));
    set({ books });
    await persist(books);
  },

  setVoiceAndSpeed: async (bookId, voice, speed) => {
    await get().updateBook(bookId, { voice, speed });
  },

  getBookById: (bookId) => get().books.find((book) => book.id === bookId),

  seedDemoLibrary: async () => {
    const currentBooks = get().books;
    const seededBooks = withFreshDemoDates();
    const mergedBooks = [
      ...seededBooks,
      ...currentBooks.filter((book) => !seededBooks.some((demoBook) => demoBook.id === book.id))
    ];
    set({ books: mergedBooks });
    await persist(mergedBooks);
  },

  clearLibrary: async () => {
    set({ books: [] });
    await persist([]);
  }
}));
