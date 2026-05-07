export type BookStatus = 'reading' | 'listening' | 'completed';
export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'nova';
export type BookSourceType = 'upload' | 'gutenberg';

/**
 * A chapter or fallback section inside a book.
 * chunkStart / chunkEnd are indices into the flat chunks array.
 */
export type BookSection = {
  id: string;
  /** User-facing label: "Chapter 1", "Chapter I", "Section 3", etc. */
  label: string;
  /** Optional heading text extracted from the book */
  heading?: string;
  /** Index into chunks[] where this section starts (inclusive) */
  chunkStart: number;
  /** Index into chunks[] where this section ends (inclusive) */
  chunkEnd: number;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  /** Source of the book's text content */
  sourceType: BookSourceType;
  /** Gutenberg / remote plain-text URL */
  textUrl: string | null;
  /** Local file URI for uploaded files (TXT / EPUB) */
  fileUri: string | null;
  /** expo-file-system URI of cached JSON chunks array */
  textCacheUri: string | null;
  /** @deprecated kept for library data backward-compat */
  pdfUrl: string | null;
  /** @deprecated kept for library data backward-compat */
  pdfLocalPath: string | null;
  progress: number;
  currentChunkIndex: number;
  /** Whether sections were auto-detected as chapters or split as fallback sections */
  sectionType: 'chapter' | 'section';
  /** Ordered chapter/section index over the flat chunks array */
  sections: BookSection[];
  /** Which section is currently active (index into sections[]) */
  currentSectionIndex: number;
  status: BookStatus;
  voice: TtsVoice;
  speed: number;
  dateAdded: string;
  lastOpenedAt: string | null;
};

export type BookSearchResult = Pick<Book, 'id' | 'title' | 'author' | 'coverUrl' | 'description'>;

export type RootStackParamList = {
  ApiKey: undefined;
  MainTabs: undefined;
  FindBook: undefined;
  AddBook: undefined;
  BookDetail: { bookId: string };
  Player: { bookId: string; startSectionIndex?: number };
  DrivingMode: { bookId: string };
};

export type MainTabParamList = {
  LibraryTab: undefined;
  NowPlayingTab: undefined;
};

export type AudioChunk = {
  id: string;
  uri: string;
  title: string;
  artist: string;
  artwork?: string;
};
