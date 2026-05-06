export type BookStatus = 'listening' | 'reading' | 'generated' | 'completed';
export type SourceType = 'pdf' | 'scanned' | 'demo';
export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'nova';

export type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  status: BookStatus;
  progress: number;
  audioUrl: string | null;
  duration: number;
  estimatedListeningTime: string;
  description: string;
  sourceType: SourceType;
  currentChapter: string;
  voice: TtsVoice;
  speed: number;
  dateAdded: string;
};

export type AudioTrack = {
  id: string;
  title: string;
  author: string;
  audioUrl: string;
  artwork: string | null;
  duration: number;
  isDemo: boolean;
};

export type BookSearchResult = Pick<Book, 'id' | 'title' | 'author' | 'coverUrl' | 'description'>;

export type MainTab = 'Home' | 'Library' | 'Add' | 'Player';
