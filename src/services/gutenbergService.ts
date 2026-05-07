// Gutenberg search via the Gutendex API.
// URLs are read directly from the formats object — never constructed manually.

export type GutenbergBook = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  /** Validated plain-text URL from Gutendex formats object, or null if unavailable. */
  textUrl: string | null;
};

type GutendexDoc = {
  id?: number;
  title?: string;
  authors?: Array<{ name?: string }>;
  formats?: Record<string, string>;
};

type GutendexResponse = {
  results?: GutendexDoc[];
};

/** Pick the best text URL from a Gutendex formats object. Prefers text/plain. */
const pickTextUrl = (formats: Record<string, string>): string | null => {
  // text/plain; charset=utf-8 is the canonical Gutenberg plain-text MIME
  const entry = Object.entries(formats).find(([mime]) => mime.startsWith('text/plain'));
  return entry?.[1] ?? null;
};

/** Validate that a URL actually responds with HTTP 200. */
const validateUrl = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Search Project Gutenberg via Gutendex.
 * Returns books that have a confirmed plain-text source URL.
 */
export const searchGutenberg = async (query: string): Promise<GutenbergBook[]> => {
  if (!query.trim()) return [];

  const response = await fetch(
    `https://gutendex.com/books?search=${encodeURIComponent(query)}&mime_type=text`
  );
  if (!response.ok) {
    throw new Error(`Gutendex search failed (HTTP ${response.status})`);
  }

  const data = (await response.json()) as GutendexResponse;
  const results = data.results ?? [];

  const books: GutenbergBook[] = results.slice(0, 10).map((doc) => {
    const formats = doc.formats ?? {};
    const textUrl = pickTextUrl(formats);
    const coverUrl = formats['image/jpeg'] ?? '';
    const author =
      doc.authors?.map((a) => {
        // Gutendex returns "Last, First" — reverse to "First Last"
        const parts = (a.name ?? '').split(', ');
        return parts.length === 2 ? `${parts[1]} ${parts[0]}` : (a.name ?? 'Unknown');
      }).join(', ') ?? 'Unknown';

    return {
      id: `gutenberg-${doc.id ?? Math.random()}`,
      title: doc.title ?? 'Untitled',
      author,
      coverUrl,
      textUrl,
    };
  });

  return books;
};

/**
 * Validate a text URL: must return HTTP 200 and contain readable text.
 * Returns the URL if valid, throws a descriptive error otherwise.
 */
export const validateTextUrl = async (url: string): Promise<string> => {
  const ok = await validateUrl(url);
  if (!ok) throw new Error(`Text URL returned a non-200 status: ${url}`);
  return url;
};
