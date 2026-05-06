export type BookStatus = 'reading' | 'listening' | 'completed';
export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'nova';

export type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  pdfUrl: string | null;
  pdfLocalPath: string | null;
  progress: number;
  currentChunkIndex: number;
  status: BookStatus;
  voice: TtsVoice;
  speed: number;
  dateAdded: string;
};

export type BookSearchResult = Pick<Book, 'id' | 'title' | 'author' | 'coverUrl' | 'description'>;

export type RootStackParamList = {
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
