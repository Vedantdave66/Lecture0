import { Book } from '../types';

export const demoBooks: Book[] = [
  {
    id: 'demo-pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    coverUrl: 'https://covers.openlibrary.org/b/id/8231856-L.jpg',
    description: 'A witty public-domain classic following Elizabeth Bennet, family expectations, first impressions, and a famously complicated romance.',
    pdfUrl: 'https://www.gutenberg.org/files/1342/1342-pdf.pdf',
    pdfLocalPath: null,
    progress: 0.38,
    currentChunkIndex: 7,
    status: 'listening',
    voice: 'nova',
    speed: 1.25,
    dateAdded: '2026-05-05T00:00:00.000Z'
  },
  {
    id: 'demo-sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    coverUrl: 'https://covers.openlibrary.org/b/id/8237641-L.jpg',
    description: 'A collection of detective stories that works well as short listening sessions while driving.',
    pdfUrl: 'https://www.gutenberg.org/files/1661/1661-pdf.pdf',
    pdfLocalPath: null,
    progress: 0.12,
    currentChunkIndex: 2,
    status: 'reading',
    voice: 'echo',
    speed: 1,
    dateAdded: '2026-05-05T00:00:00.000Z'
  },
  {
    id: 'demo-frankenstein',
    title: 'Frankenstein',
    author: 'Mary Wollstonecraft Shelley',
    coverUrl: 'https://covers.openlibrary.org/b/id/8390561-L.jpg',
    description: 'A gothic public-domain novel included to demonstrate completed-book progress and library status styling.',
    pdfUrl: 'https://www.gutenberg.org/files/84/84-pdf.pdf',
    pdfLocalPath: null,
    progress: 1,
    currentChunkIndex: 24,
    status: 'completed',
    voice: 'fable',
    speed: 1.5,
    dateAdded: '2026-05-05T00:00:00.000Z'
  }
];
