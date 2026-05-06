import { BookSearchResult } from '../types';

// TODO: replace YOUR_GOOGLE_BOOKS_API_KEY when real search is enabled after the UI/audio milestone.
const GOOGLE_BOOKS_API_KEY = 'YOUR_GOOGLE_BOOKS_API_KEY';

export const searchByQuery = async (query: string): Promise<BookSearchResult[]> => {
  console.log('[BookDriveBooks] search disabled in demo mode', query, GOOGLE_BOOKS_API_KEY);
  return [];
};

export const searchByImage = async (base64Image: string): Promise<BookSearchResult[]> => {
  console.log('[BookDriveBooks] image search disabled in demo mode', base64Image.length);
  return [];
};
