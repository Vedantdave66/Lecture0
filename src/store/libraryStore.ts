import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { Book, BookSearchResult, BookSourceType, TtsVoice } from '../types';
import { demoBooks } from './demoBooks';

const LIBRARY_KEY = 'bookdrive:library';

type AddBookParams = {
  result: BookSearchResult;
  sourceType: BookSourceType;
  textUrl?: string | null;
  fileUri?: string | null;
  textCacheUri?: string | null;
};

type LibraryState = {
  books: Book[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  addBook: (params: AddBookParams) => Promise<Book>;
  updateBook: (bookId: string, patch: Partial<Book>) => Promise<void>;
  markOpened: (bookId: string) => Promise<void>;
  setVoiceAndSpeed: (bookId: string, voice: TtsVoice, speed: number) => Promise<void>;
  getBookById: (bookId: string) => Book | undefined;
  seedDemoLibrary: () => Promise<void>;
  clearLibrary: () => Promise<void>;
  /** @deprecated use addBook with params */
  setBookPDF: (bookId: string, pdfUrl: string | null, pdfLocalPath?: string | null) => Promise<void>;
};

const persist = async (books: Book[]): Promise<void> => {
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(books));
};

/** Migrate old Book objects that may be missing new fields. */
const migrateBook = (raw: unknown): Book => {
  const b = raw as Record<string, unknown>;
  return {
    id: (b.id as string) ?? '',
    title: (b.title as string) ?? '',
    author: (b.author as string) ?? '',
    coverUrl: (b.coverUrl as string) ?? '',
    description: (b.description as string) ?? '',
    sourceType: (b.sourceType as BookSourceType) ?? 'gutenberg',
    textUrl: (b.textUrl as string | null) ?? (b.pdfUrl as string | null) ?? null,
    fileUri: (b.fileUri as string | null) ?? (b.pdfLocalPath as string | null) ?? null,
    textCacheUri: (b.textCacheUri as string | null) ?? null,
    pdfUrl: (b.pdfUrl as string | null) ?? null,
    pdfLocalPath: (b.pdfLocalPath as string | null) ?? null,
    progress: (b.progress as number) ?? 0,
    currentChunkIndex: (b.currentChunkIndex as number) ?? 0,
    status: (b.status as Book['status']) ?? 'reading',
    voice: (b.voice as TtsVoice) ?? 'alloy',
    speed: (b.speed as number) ?? 1,
    dateAdded: (b.dateAdded as string) ?? new Date().toISOString(),
    lastOpenedAt: (b.lastOpenedAt as string | null) ?? null,
  };
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  isHydrated: false,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
    const books = parsed.map(migrateBook);
    set({ books, isHydrated: true });
  },

  addBook: async ({ result, sourceType, textUrl = null, fileUri = null, textCacheUri = null }) => {
    const book: Book = {
      ...result,
      sourceType,
      textUrl,
      fileUri,
      textCacheUri,
      pdfUrl: textUrl,          // deprecated compat
      pdfLocalPath: fileUri,    // deprecated compat
      progress: 0,
      currentChunkIndex: 0,
      status: 'reading',
      voice: 'alloy',
      speed: 1,
      dateAdded: new Date().toISOString(),
      lastOpenedAt: null,
    };
    const books = [book, ...get().books.filter((b) => b.id !== book.id)];
    set({ books });
    await persist(books);
    return book;
  },

  updateBook: async (bookId, patch) => {
    const books = get().books.map((b) => (b.id === bookId ? { ...b, ...patch } : b));
    set({ books });
    await persist(books);
  },

  markOpened: async (bookId) => {
    await get().updateBook(bookId, { lastOpenedAt: new Date().toISOString() });
  },

  setVoiceAndSpeed: async (bookId, voice, speed) => {
    await get().updateBook(bookId, { voice, speed });
  },

  getBookById: (bookId) => get().books.find((b) => b.id === bookId),

  seedDemoLibrary: async () => {
    const current = get().books;
    const merged = [
      ...demoBooks.map((b) => ({ ...b, dateAdded: new Date().toISOString() })),
      ...current.filter((b) => !demoBooks.some((d) => d.id === b.id)),
    ];
    set({ books: merged });
    await persist(merged);
  },

  clearLibrary: async () => {
    set({ books: [] });
    await persist([]);
  },

  setBookPDF: async (bookId, pdfUrl, pdfLocalPath = null) => {
    await get().updateBook(bookId, { pdfUrl, pdfLocalPath, textUrl: pdfUrl, fileUri: pdfLocalPath });
  },
}));
