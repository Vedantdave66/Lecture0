// BookDrive only searches public-domain and controlled digital lending sources here:
// Project Gutenberg, Open Library, and Internet Archive. Do not return pirated or unauthorized PDFs.

type GutenbergDoc = {
  title?: string;
  authors?: Array<{ name?: string }>;
  formats?: Record<string, string>;
};

type GutenbergResponse = {
  results?: GutenbergDoc[];
};

type OpenLibraryDoc = {
  ia?: string[];
  title?: string;
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDoc[];
};

type InternetArchiveDoc = {
  identifier?: string;
  title?: string;
};

type InternetArchiveResponse = {
  response?: {
    docs?: InternetArchiveDoc[];
  };
};

const findGutenbergPDF = async (title: string, author: string): Promise<string | null> => {
  const response = await fetch(`https://gutendex.com/books?search=${encodeURIComponent(`${title} ${author}`)}`);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as GutenbergResponse;
  const doc = data.results?.[0];
  const pdfEntry = Object.entries(doc?.formats ?? {}).find(([mime]) => mime.includes('application/pdf'));
  return pdfEntry?.[1] ?? null;
};

const findOpenLibraryPDF = async (title: string, author: string): Promise<string | null> => {
  const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&has_fulltext=true&public_scan=true&limit=5`);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as OpenLibraryResponse;
  const identifier = data.docs?.find((doc) => doc.ia && doc.ia.length > 0)?.ia?.[0];
  return identifier ? `https://archive.org/download/${identifier}/${identifier}.pdf` : null;
};

const findInternetArchivePDF = async (title: string, author: string): Promise<string | null> => {
  const query = `title:(${title}) AND creator:(${author}) AND mediatype:texts AND (collection:gutenberg OR collection:internetarchivebooks)`;
  const response = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&rows=5&output=json`);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as InternetArchiveResponse;
  const identifier = data.response?.docs?.[0]?.identifier;
  return identifier ? `https://archive.org/download/${identifier}/${identifier}.pdf` : null;
};

export const findPDF = async (title: string, author: string): Promise<string | null> => {
  const finders = [findGutenbergPDF, findOpenLibraryPDF, findInternetArchivePDF];

  for (const finder of finders) {
    const pdfUrl = await finder(title, author);
    if (pdfUrl) {
      return pdfUrl;
    }
  }

  return null;
};
