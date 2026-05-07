// Text extraction service — supports TXT files, EPUB (via jszip), and
// plain-text URLs (Gutenberg). PDF is explicitly unsupported in Expo Go.
// Extracted text is chunked at sentence boundaries (~3000 chars) and cached
// to expo-file-system so the Player never re-fetches.

import { File, Paths } from 'expo-file-system';
import JSZip from 'jszip';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

// ---------------------------------------------------------------------------
// Text chunking
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 3000;

const splitIntoChunks = (text: string): string[] => {
  const normalised = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (normalised.length === 0) return [];

  const sentences = normalised.match(/[^.!?]+[.!?]+[\s]?|[^.!?]+$/g) ?? [normalised];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (`${current} ${sentence}`.length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
};

// ---------------------------------------------------------------------------
// Gutenberg boilerplate stripping
// ---------------------------------------------------------------------------

const stripGutenbergBoilerplate = (raw: string): string => {
  const startMarkers = [
    '*** START OF THE PROJECT GUTENBERG',
    '*** START OF THIS PROJECT GUTENBERG',
  ];
  const endMarkers = [
    '*** END OF THE PROJECT GUTENBERG',
    '*** END OF THIS PROJECT GUTENBERG',
    'End of the Project Gutenberg',
    'End of Project Gutenberg',
  ];

  let text = raw;
  for (const m of startMarkers) {
    const idx = text.indexOf(m);
    if (idx !== -1) {
      const lineEnd = text.indexOf('\n', idx);
      text = lineEnd !== -1 ? text.slice(lineEnd + 1) : text.slice(idx + m.length);
      break;
    }
  }
  for (const m of endMarkers) {
    const idx = text.indexOf(m);
    if (idx !== -1) { text = text.slice(0, idx); break; }
  }
  return text.trim();
};

// ---------------------------------------------------------------------------
// HTML tag stripping (for EPUB chapters)
// ---------------------------------------------------------------------------

const stripHtml = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------------------
// Extraction methods
// ---------------------------------------------------------------------------

/** Extract chunks from a plain-text string. */
export const extractFromText = (text: string): string[] => {
  const cleaned = stripGutenbergBoilerplate(text);
  if (cleaned.length < 50) throw new ExtractionError('File contains no readable text.');
  return splitIntoChunks(cleaned);
};

/** Fetch a remote plain-text URL and extract chunks. */
export const extractFromUrl = async (url: string): Promise<string[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new ExtractionError(`Could not fetch text (HTTP ${res.status}): ${url}`);
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text') && !contentType.includes('octet-stream')) {
    throw new ExtractionError(`Unexpected content-type "${contentType}" from ${url}`);
  }
  const raw = await res.text();
  return extractFromText(raw);
};

/** Parse an EPUB ArrayBuffer and extract text chunks in spine order. */
const extractFromEpub = async (buffer: ArrayBuffer): Promise<string[]> => {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Find content.opf path from META-INF/container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new ExtractionError('Invalid EPUB: missing META-INF/container.xml');
  const containerXml = await containerFile.async('text');
  const rootfileMatch = /full-path="([^"]+)"/.exec(containerXml);
  if (!rootfileMatch) throw new ExtractionError('Invalid EPUB: cannot locate rootfile in container.xml');

  const opfPath = rootfileMatch[1];
  const baseDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Parse content.opf for manifest items and spine order
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new ExtractionError('Invalid EPUB: missing content.opf');
  const opf = await opfFile.async('text');

  // Build manifest: id → href for html/xhtml items
  const manifest: Record<string, string> = {};
  const itemRegex = /<item\s([^>]+)>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(opf)) !== null) {
    const attrs = m[1];
    const idM = /\bid="([^"]+)"/.exec(attrs);
    const hrefM = /\bhref="([^"]+)"/.exec(attrs);
    const typeM = /\bmedia-type="([^"]+)"/.exec(attrs);
    if (idM && hrefM && typeM && typeM[1].includes('html')) {
      manifest[idM[1]] = hrefM[1];
    }
  }

  // Spine order
  const spineIds: string[] = [];
  const spineRegex = /<itemref\s[^>]*idref="([^"]+)"/g;
  while ((m = spineRegex.exec(opf)) !== null) spineIds.push(m[1]);

  if (spineIds.length === 0) throw new ExtractionError('EPUB spine is empty — no chapters found.');

  // 3. Extract and concatenate chapter text in order
  let fullText = '';
  for (const id of spineIds) {
    const href = manifest[id];
    if (!href) continue;
    const chapterPath = (baseDir + href).replace(/\/\//g, '/');
    const chapterFile = zip.file(chapterPath) ?? zip.file(href);
    if (!chapterFile) continue;
    const html = await chapterFile.async('text');
    fullText += stripHtml(html) + '\n\n';
  }

  if (fullText.trim().length < 50) throw new ExtractionError('EPUB contained no readable text after extraction.');
  return splitIntoChunks(fullText);
};

/**
 * Extract text chunks from a local file URI.
 * Supports .txt and .epub. Throws UnsupportedFormatError for .pdf.
 */
export const extractFromFile = async (uri: string, mimeType: string): Promise<string[]> => {
  const lowerMime = mimeType.toLowerCase();
  const lowerUri = uri.toLowerCase();

  // PDF — explicitly unsupported
  if (lowerMime.includes('pdf') || lowerUri.endsWith('.pdf')) {
    throw new UnsupportedFormatError(
      'PDF text extraction is not supported in this version. Please upload a .txt or .epub file.'
    );
  }

  // EPUB
  if (lowerMime.includes('epub') || lowerUri.endsWith('.epub')) {
    const file = new File(uri);
    const buffer = await file.arrayBuffer();
    return extractFromEpub(buffer);
  }

  // TXT (default — also handles text/plain, text/*)
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buffer);
  return extractFromText(text);
};

// ---------------------------------------------------------------------------
// Chunk cache (expo-file-system v19 File API)
// ---------------------------------------------------------------------------

/** Write chunks array to cache and return the local file URI. */
export const saveChunksToCache = async (bookId: string, chunks: string[]): Promise<string> => {
  const file = new File(Paths.cache, `bookdrive_chunks_${bookId}.json`);
  const encoded = new TextEncoder().encode(JSON.stringify(chunks));
  file.write(encoded);
  return file.uri;
};

/** Read and parse chunks from a cached file URI. */
export const loadChunksFromCache = async (cacheUri: string): Promise<string[]> => {
  const file = new File(cacheUri);
  if (!file.exists) throw new ExtractionError('Text cache file not found. Re-open the book to regenerate.');
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buffer);
  return JSON.parse(text) as string[];
};

// ---------------------------------------------------------------------------
// Deprecated re-exports (keep old import paths working during transition)
// ---------------------------------------------------------------------------

/** @deprecated Use extractFromUrl */
export const extractTextFromPDF = extractFromUrl;
/** @deprecated Use extractFromUrl */
export const extractTextChunks = extractFromUrl;
