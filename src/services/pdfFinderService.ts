type GutenbergDoc = {
  title?: string;
  authors?: Array<{ name?: string }>;
  formats?: Record<string, string>;
};

type GutenbergResponse = {
  results?: GutenbergDoc[];
};

const GUTENDEX_URL = 'https://gutendex.com/books';

const isPlainTextFormat = (mimeType: string): boolean => mimeType.toLowerCase().startsWith('text/plain');
const isPdfFormat = (mimeType: string): boolean => mimeType.toLowerCase().includes('application/pdf');

const preferUtf8TextUrl = (formats: Record<string, string>): string | null => {
  const entries = Object.entries(formats);
  const utf8Text = entries.find(([mimeType]) => isPlainTextFormat(mimeType) && mimeType.toLowerCase().includes('utf-8'));
  const anyText = entries.find(([mimeType]) => isPlainTextFormat(mimeType));
  const pdf = entries.find(([mimeType]) => isPdfFormat(mimeType));
  return utf8Text?.[1] ?? anyText?.[1] ?? pdf?.[1] ?? null;
};

export const findPDF = async (title: string, author: string): Promise<string | null> => {
  const query = `${title} ${author}`.trim();
  const url = `${GUTENDEX_URL}?search=${encodeURIComponent(query)}&mime_type=text%2Fplain`;
  console.log('[BookDrivePDF] searching Gutenberg text source', { title, author });

  const response = await fetch(url);
  if (!response.ok) {
    console.log('[BookDrivePDF] Gutenberg search failed', response.status);
    return null;
  }

  const data = (await response.json()) as GutenbergResponse;
  const bestMatch = data.results?.[0];
  const sourceUrl = preferUtf8TextUrl(bestMatch?.formats ?? {});
  console.log('[BookDrivePDF] preferred source URL', sourceUrl);
  return sourceUrl;
};
