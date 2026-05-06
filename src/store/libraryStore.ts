import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { Book, BookSearchResult, TtsVoice } from '../types';
import { demoBooks } from './demoBooks';

const LIBRARY_KEY = 'bookdrive:library';

type LibraryState = {
  books: Book[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  addBook: (result: BookSearchResult, pdfUrl?: string | null) => Promise<Book>;
  updateBook: (bookId: string, patch: Partial<Book>) => Promise<void>;
  setBookPDF: (bookId: string, pdfUrl: string | null, pdfLocalPath?: string | null) => Promise<void>;
  setVoiceAndSpeed: (bookId: string, voice: TtsVoice, speed: number) => Promise<void>;
  getBookById: (bookId: string) => Book | undefined;
  seedDemoLibrary: () => Promise<void>;
  clearLibrary: () => Promise<void>;
};

const persist = async (books: Book[]): Promise<void> => {
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(books));
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  isHydrated: false,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    const books = raw ? (JSON.parse(raw) as Book[]) : [];
    set({ books, isHydrated: true });
  },

  addBook: async (result, pdfUrl = null) => {
    const book: Book = {
      ...result,
      pdfUrl,
      pdfLocalPath: null,
      progress: 0,
      currentChunkIndex: 0,
      status: 'reading',
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

  setBookPDF: async (bookId, pdfUrl, pdfLocalPath = null) => {
    await get().updateBook(bookId, { pdfUrl, pdfLocalPath });
  },

  setVoiceAndSpeed: async (bookId, voice, speed) => {
    await get().updateBook(bookId, { voice, speed });
  },

  getBookById: (bookId) => get().books.find((book) => book.id === bookId),

  seedDemoLibrary: async () => {
    const currentBooks = get().books;
    const mergedBooks = [
      ...demoBooks.map((book) => ({ ...book, dateAdded: new Date().toISOString() })),
      ...currentBooks.filter((book) => !demoBooks.some((demoBook) => demoBook.id === book.id))
    ];
    set({ books: mergedBooks });
    await persist(mergedBooks);
  },

  clearLibrary: async () => {
    set({ books: [] });
    await persist([]);
  }
}));
