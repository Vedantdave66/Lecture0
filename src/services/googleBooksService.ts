import { BookSearchResult } from '../types';

const GOOGLE_BOOKS_API_KEY = 'YOUR_GOOGLE_BOOKS_API_KEY'; // TODO: replace YOUR_GOOGLE_BOOKS_API_KEY with your Google Books API key.
const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

type GoogleBooksResponse = {
  items?: GoogleVolume[];
};

const mapVolumeToBook = (volume: GoogleVolume): BookSearchResult => ({
  id: volume.id,
  title: volume.volumeInfo?.title ?? 'Untitled book',
  author: volume.volumeInfo?.authors?.join(', ') ?? 'Unknown author',
  coverUrl: (volume.volumeInfo?.imageLinks?.thumbnail ?? volume.volumeInfo?.imageLinks?.smallThumbnail ?? '').replace('http://', 'https://'),
  description: volume.volumeInfo?.description ?? 'No description available.'
});

export const searchByQuery = async (query: string): Promise<BookSearchResult[]> => {
  const url = `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(query)}&maxResults=10&key=${GOOGLE_BOOKS_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Unable to search Google Books.');
  }

  const data = (await response.json()) as GoogleBooksResponse;
  return (data.items ?? []).map(mapVolumeToBook);
};

export const searchByImage = async (base64Image: string): Promise<BookSearchResult[]> => {
  // TODO: replace YOUR_GOOGLE_BOOKS_API_KEY above before wiring this MVP stub to a cover-recognition backend.
  // Google Books does not provide direct image recognition; this placeholder keeps all API access in services only.
  const fallbackQuery = base64Image.slice(0, 24).trim();
  return searchByQuery(fallbackQuery.length > 0 ? fallbackQuery : 'book cover');
};
