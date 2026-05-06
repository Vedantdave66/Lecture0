import { Book } from '../types';

export const DEMO_AUDIO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

export const demoBooks: Book[] = [
  {
    id: 'demo-midnight-manual',
    title: 'The Midnight Manual',
    author: 'BookDrive Studio',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
    status: 'listening',
    progress: 0.42,
    audioUrl: DEMO_AUDIO_URL,
    duration: 270,
    estimatedListeningTime: '4 min demo',
    description: 'A short demo narration entry used to prove playback, mini-player state, and car-mode controls before AI generation is connected.',
    sourceType: 'demo',
    currentChapter: 'Demo narration',
    voice: 'nova',
    speed: 1,
    dateAdded: '2026-05-06T00:00:00.000Z'
  },
  {
    id: 'demo-product-strategy',
    title: 'Road Notes for Product Teams',
    author: 'Avery Stone',
    coverUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80',
    status: 'generated',
    progress: 0.08,
    audioUrl: DEMO_AUDIO_URL,
    duration: 420,
    estimatedListeningTime: '7 min demo',
    description: 'A mock imported PDF that has a generated narration ready for listening during a commute.',
    sourceType: 'pdf',
    currentChapter: 'Generated overview',
    voice: 'alloy',
    speed: 1,
    dateAdded: '2026-05-05T00:00:00.000Z'
  },
  {
    id: 'demo-scan-playbook',
    title: 'Scanned Field Guide',
    author: 'Mira Chen',
    coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&q=80',
    status: 'reading',
    progress: 0.18,
    audioUrl: null,
    duration: 0,
    estimatedListeningTime: 'Needs audio',
    description: 'A scanned-book placeholder showing how camera capture will move into AI narration generation later.',
    sourceType: 'scanned',
    currentChapter: 'Awaiting generation',
    voice: 'echo',
    speed: 1,
    dateAdded: '2026-05-04T00:00:00.000Z'
  },
  {
    id: 'demo-completed-deck',
    title: 'The Quiet Dashboard',
    author: 'Noah Vale',
    coverUrl: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&q=80',
    status: 'completed',
    progress: 1,
    audioUrl: DEMO_AUDIO_URL,
    duration: 180,
    estimatedListeningTime: '3 min demo',
    description: 'A completed demo narration used to validate completed-state styling and progress treatment.',
    sourceType: 'demo',
    currentChapter: 'Finished',
    voice: 'fable',
    speed: 1.25,
    dateAdded: '2026-05-03T00:00:00.000Z'
  }
];
