// Gutenberg search via the Gutendex API.
// URLs are read directly from the formats object — never constructed manually.

export type GutenbergBook = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  /** Validated plain-text URL from Gutendex formats object, or null if unavailable. */
  textUrl: string | null;
  /** EPUB URL from Gutendex formats object, or null if unavailable. */
  epubUrl: string | null;
  /** HTML URL from Gutendex formats object, or null if unavailable. */
  htmlUrl: string | null;
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

/** Pick all readable URLs from a Gutendex formats object. */
export const pickAllUrls = (
  formats: Record<string, string>
): { textUrl: string | null; epubUrl: string | null; htmlUrl: string | null } => {
  let textUrl: string | null = null;
  let epubUrl: string | null = null;
  let htmlUrl: string | null = null;

  for (const [mime, url] of Object.entries(formats)) {
    if (mime.startsWith('text/plain') && !textUrl) textUrl = url;
    else if (mime.includes('epub') && !epubUrl) epubUrl = url;
    else if (mime.startsWith('text/html') && !htmlUrl) htmlUrl = url;
  }

  return { textUrl, epubUrl, htmlUrl };
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
 * Returns books with all available format URLs.
 */
export const searchGutenberg = async (query: string): Promise<GutenbergBook[]> => {
  if (!query.trim()) return [];

  const response = await fetch(
    `https://gutendex.com/books?search=${encodeURIComponent(query)}&mime_type=text`
  );
  if (!response.ok) {
    throw new Error(`Search failed (HTTP ${response.status})`);
  }

  const data = (await response.json()) as GutendexResponse;
  const results = data.results ?? [];

  const books: GutenbergBook[] = results.slice(0, 12).map((doc) => {
    const formats = doc.formats ?? {};
    const { textUrl, epubUrl, htmlUrl } = pickAllUrls(formats);
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
      epubUrl,
      htmlUrl,
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
