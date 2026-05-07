// chapterDetectorService.ts
// Detects real chapter headings in cleaned book text and builds a BookSection[]
// index over the flat chunks array.
//
// Detection priority:
//   1. "Chapter 1", "Chapter 2", …
//   2. "Chapter One", "Chapter Two", … (English words)
//   3. "CHAPTER I", "CHAPTER II", … (Roman numerals, uppercase)
//   4. Numbered lines that look like chapter headings (e.g. "I.", "II.", "1.")
//
// If ≥ 2 real chapters found → sectionType = 'chapter'
// Otherwise → split chunks into groups of ~SECTION_CHUNK_SIZE → sectionType = 'section'

import { BookSection } from '../types';

const SECTION_CHUNK_SIZE = 8; // chunks per fallback section

// ---------------------------------------------------------------------------
// Chapter heading patterns
// ---------------------------------------------------------------------------

const CHAPTER_PATTERNS: RegExp[] = [
  // "Chapter 1", "Chapter 23"
  /^chapter\s+\d+/i,
  // "Chapter One", "Chapter Two", … "Chapter Twenty"
  /^chapter\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)/i,
  // "CHAPTER I", "CHAPTER IV", "CHAPTER XLII" (Roman numerals)
  /^CHAPTER\s+[IVXLCDM]+(\s|$)/,
  // Standalone Roman numeral lines: "I.", "IV.", "XII."
  /^[IVXLCDM]{1,6}\.?\s*$/,
];

const isChapterHeading = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return false;
  return CHAPTER_PATTERNS.some((re) => re.test(trimmed));
};

// ---------------------------------------------------------------------------
// Main detector — works on the raw cleaned text (pre-chunking)
// ---------------------------------------------------------------------------

export type DetectionResult = {
  sections: BookSection[];
  sectionType: 'chapter' | 'section';
};

/**
 * Detect chapters from raw text and map them onto the given chunks array.
 * This must be called AFTER chunking so chunkStart/chunkEnd can be computed.
 *
 * Strategy: scan each chunk for a chapter heading in its first ~200 chars.
 */
export const detectSections = (chunks: string[]): DetectionResult => {
  if (chunks.length === 0) {
    return { sections: [], sectionType: 'section' };
  }

  // Scan chunks for chapter headings
  const chapterStarts: { chunkIndex: number; heading: string }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const preview = chunks[i].slice(0, 300);
    const lines = preview.split('\n');
    for (const line of lines.slice(0, 5)) {
      if (isChapterHeading(line)) {
        chapterStarts.push({ chunkIndex: i, heading: line.trim() });
        break;
      }
    }
  }

  // Need at least 2 detected chapters to use chapter mode
  if (chapterStarts.length >= 2) {
    const sections: BookSection[] = chapterStarts.map((ch, idx) => {
      const nextStart = chapterStarts[idx + 1]?.chunkIndex ?? chunks.length;
      return {
        id: `ch-${idx}`,
        label: `Chapter ${idx + 1}`,
        heading: ch.heading,
        chunkStart: ch.chunkIndex,
        chunkEnd: Math.max(ch.chunkIndex, nextStart - 1),
      };
    });
    return { sections, sectionType: 'chapter' };
  }

  // Fallback: split into fixed-size sections
  const sections: BookSection[] = [];
  let sectionIdx = 0;
  for (let i = 0; i < chunks.length; i += SECTION_CHUNK_SIZE) {
    const end = Math.min(i + SECTION_CHUNK_SIZE - 1, chunks.length - 1);
    sections.push({
      id: `sec-${sectionIdx}`,
      label: `Section ${sectionIdx + 1}`,
      chunkStart: i,
      chunkEnd: end,
    });
    sectionIdx++;
  }
  return { sections, sectionType: 'section' };
};

/**
 * Given a chunk index, find the index of the section it belongs to.
 * Returns 0 if sections is empty.
 */
export const sectionIndexForChunk = (
  chunkIndex: number,
  sections: BookSection[]
): number => {
  if (sections.length === 0) return 0;
  for (let i = sections.length - 1; i >= 0; i--) {
    if (chunkIndex >= sections[i].chunkStart) return i;
  }
  return 0;
};
