// bookResolverService.ts
// Fully automatic source resolver for the "Find and Listen" flow.
//
// Given a GutenbergBook, tries sources in order:
//   1. text/plain URL
//   2. text/html URL (HTML stripped then chunked)
//
// For each candidate:
//   - HEAD check (HTTP 200)
//   - Download + extract text
//   - Verify non-empty (≥ 100 chars)
//   - Run chapter detection
//   - Build chunks
//
// Returns ResolvedBook on success, throws user-friendly error on full failure.
//
// No random web scraping. No blind PDF downloads. Gutenberg-only.

import { BookSection } from '../types';
import { detectSections } from './chapterDetectorService';
import { GutenbergBook } from './gutenbergService';
import {
  ExtractionError,
  extractFromText,
  extractRawText,
  saveChunksToCache,
} from './textExtractorService';

export type ResolvedBook = {
  chunks: string[];
  sections: BookSection[];
  sectionType: 'chapter' | 'section';
  textCacheUri: string;
  /** The URL that ultimately succeeded */
  resolvedUrl: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const headOk = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the best readable source for a Gutenberg book.
 * Tries TXT → HTML in order, returns the first that works.
 * EPUB from a remote URL is handled by extractRawText (fetches as text).
 */
export const resolveBook = async (
  book: GutenbergBook,
  onStatus?: (msg: string) => void
): Promise<ResolvedBook> => {
  onStatus?.('Finding book…');

  // Build candidate list: TXT first, then HTML fallback
  const candidates: Array<{ url: string }> = [];
  if (book.textUrl) candidates.push({ url: book.textUrl });
  if (book.htmlUrl) candidates.push({ url: book.htmlUrl });

  if (candidates.length === 0) {
    throw new Error('No free readable version was found. Try another title.');
  }

  for (const { url } of candidates) {
    try {
      // 1. Validate URL is reachable
      if (!(await headOk(url))) continue;

      onStatus?.('Preparing book…');

      // 2. Extract raw clean text
      let rawText: string;
      try {
        rawText = await extractRawText(url);
      } catch {
        continue;
      }

      if (rawText.length < 100) continue;

      // 3. Split into chunks
      let chunks: string[];
      try {
        chunks = extractFromText(rawText);
      } catch {
        continue;
      }

      if (chunks.length === 0) continue;

      // 4. Detect chapters / sections
      const { sections, sectionType } = detectSections(chunks);

      // 5. Cache chunks to disk
      const textCacheUri = await saveChunksToCache(book.id, chunks);

      onStatus?.('Book ready');

      return { chunks, sections, sectionType, textCacheUri, resolvedUrl: url };
    } catch (err) {
      // Log internally but keep trying
      console.warn(
        '[bookResolver] candidate failed:',
        url,
        err instanceof ExtractionError ? err.message : String(err)
      );
    }
  }

  throw new Error('No free readable version was found. Try another title.');
};
