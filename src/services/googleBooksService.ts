// Google Books integration has been removed from this MVP.
// The app now uses Gutenberg search (gutenbergService.ts) for public-domain
// book discovery, which requires no API key.

export const searchByQuery = async (_query: string): Promise<never[]> => {
  throw new Error('Google Books search has been removed. Use gutenbergService.searchGutenberg instead.');
};

export const searchByImage = searchByQuery;
