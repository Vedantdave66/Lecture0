// This file is kept for backward compatibility.
// All functionality has moved to gutenbergService.ts and textExtractorService.ts

export { searchGutenberg, validateTextUrl } from './gutenbergService';

/** @deprecated Use searchGutenberg from gutenbergService */
export const findTextUrl = async (title: string, author: string): Promise<string | null> => {
  const { searchGutenberg } = await import('./gutenbergService');
  const results = await searchGutenberg(`${title} ${author}`);
  return results.find((r) => r.textUrl)?.textUrl ?? null;
};

/** @deprecated Use findTextUrl */
export const findPDF = findTextUrl;
