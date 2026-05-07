export type BookStatus = 'reading' | 'listening' | 'completed';
export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'nova';
export type BookSourceType = 'upload' | 'gutenberg';

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
  AddBook: undefined;
  BookDetail: { bookId: string };
  Player: { bookId: string };
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
