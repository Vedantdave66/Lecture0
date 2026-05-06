const CHUNK_SIZE = 3000;
const CORS_PROXY_PREFIX = 'https://corsproxy.io/?';

const splitIntoChunks = (text: string): string[] => {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  sentences.forEach((sentence) => {
    if (`${current} ${sentence}`.length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
      return;
    }
    current = `${current} ${sentence}`.trim();
  });

  if (current.length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
};

const withCorsProxy = (url: string): string => `${CORS_PROXY_PREFIX}${url}`;

const isGutenbergFileUrl = (url: string): boolean => /gutenberg\.org\/files\/\d+\//i.test(url);

const getGutenbergId = (url: string): string | null => url.match(/gutenberg\.org\/files\/(\d+)\//i)?.[1] ?? null;

const getPlainTextCandidates = (url: string): string[] => {
  const gutenbergId = getGutenbergId(url);
  if (!gutenbergId) {
    return [];
  }

  const base = `https://www.gutenberg.org/files/${gutenbergId}`;
  return [
    `${base}/${gutenbergId}-0.txt`,
    `${base}/${gutenbergId}.txt`,
    `${base}/${gutenbergId}-8.txt`
  ];
};

const fetchText = async (url: string): Promise<string> => {
  console.log('[BookDrivePDF] fetching text source', url);
  const response = await fetch(withCorsProxy(url));
  if (!response.ok) {
    throw new Error(`Unable to download PDF/text for extraction: ${response.status}`);
  }
  return response.text();
};

const stripGutenbergBoilerplate = (text: string): string => {
  const startPatterns = [
    /\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*/i,
    /\*\*\* START OF THIS PROJECT GUTENBERG EBOOK .*?\*\*\*/i
  ];
  const endPatterns = [
    /\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*/i,
    /\*\*\* END OF THIS PROJECT GUTENBERG EBOOK .*?\*\*\*/i
  ];

  let cleaned = text;
  const startMatch = startPatterns.map((pattern) => pattern.exec(cleaned)).find(Boolean);
  if (startMatch?.index !== undefined) {
    cleaned = cleaned.slice(startMatch.index + startMatch[0].length);
  }

  const endMatch = endPatterns.map((pattern) => pattern.exec(cleaned)).find(Boolean);
  if (endMatch?.index !== undefined) {
    cleaned = cleaned.slice(0, endMatch.index);
  }

  return cleaned.trim();
};

export const extractTextFromPDF = async (pdfUrl: string): Promise<string[]> => {
  const candidates = [
    ...(isGutenbergFileUrl(pdfUrl) && !pdfUrl.endsWith('.txt') ? getPlainTextCandidates(pdfUrl) : []),
    pdfUrl
  ];

  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      const rawText = await fetchText(candidate);
      const cleanedText = stripGutenbergBoilerplate(rawText);
      const chunks = splitIntoChunks(cleanedText);
      if (chunks.length > 0) {
        console.log('[BookDrivePDF] extracted text chunks', { chunks: chunks.length, source: candidate });
        return chunks;
      }
    } catch (error) {
      lastError = error;
      console.log('[BookDrivePDF] source failed', candidate, error instanceof Error ? error.message : error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to download PDF for text extraction.');
};
