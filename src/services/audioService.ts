// Audio service — SDK 54 compatible, uses expo-audio (not the deprecated expo-av).
//
// Public API surface is unchanged from the old expo-av version so all callers
// (playerStore, PlayerScreen, App.tsx) continue to work without modification.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const POSITION_KEY_PREFIX = 'bookdrive:position:';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SavedPosition = {
  positionSeconds: number;
  chunkIndex: number;
};

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

// ---------------------------------------------------------------------------
// Module-level state (singleton service — one player at a time)
// ---------------------------------------------------------------------------

let isSetup = false;
let activeBookId: string | null = null;
let activeChunks: string[] = [];
let activeChunkIndex = 0;
let player: AudioPlayer | null = null;
let playbackState: PlaybackState = 'idle';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const destroyPlayer = (): void => {
  if (!player) return;
  try {
    player.pause();
    player.remove();
  } catch {
    // Ignore errors during cleanup
  }
  player = null;
};

const loadChunkAtIndex = (chunkIndex: number, shouldPlay = false, positionSeconds = 0): void => {
  if (chunkIndex < 0 || chunkIndex >= activeChunks.length) {
    playbackState = 'ended';
    return;
  }

  playbackState = 'loading';
  destroyPlayer();
  activeChunkIndex = chunkIndex;

  const uri = activeChunks[chunkIndex];
  console.log('[audioService] Loading chunk', chunkIndex, uri);

  player = createAudioPlayer({ uri }, { updateInterval: 1000 });

  // Listen for playback status updates
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) {
      // Auto-advance to next chunk
      loadChunkAtIndex(activeChunkIndex + 1, true);
      return;
    }
    playbackState = status.playing ? 'playing' : 'paused';
  });

  // Seek to saved position if needed
  if (positionSeconds > 0) {
    void player.seekTo(positionSeconds);
  }

  if (shouldPlay) {
    player.play();
    playbackState = 'playing';
  } else {
    playbackState = 'paused';
  }
};

// ---------------------------------------------------------------------------
// Public service object
// ---------------------------------------------------------------------------

export const audioService = {
  setup: async (): Promise<void> => {
    if (isSetup) return;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
    });
    isSetup = true;
  },

  loadChunks: async (chunks: string[], bookId = 'current-book'): Promise<void> => {
    await audioService.setup();
    activeBookId = bookId;
    activeChunks = chunks;
    activeChunkIndex = 0;
    destroyPlayer();

    if (chunks.length > 0) {
      loadChunkAtIndex(0, false);
    }
  },

  play: async (): Promise<void> => {
    await audioService.setup();

    if (!player && activeChunks.length > 0) {
      loadChunkAtIndex(activeChunkIndex, true);
      return;
    }

    player?.play();
    playbackState = 'playing';
  },

  pause: async (): Promise<void> => {
    player?.pause();
    playbackState = 'paused';
    await audioService.savePosition();
  },

  skipForward: async (seconds: number): Promise<void> => {
    if (!player) return;
    const nextTime = player.currentTime + seconds;
    const duration = player.duration;

    if (duration > 0 && nextTime >= duration && activeChunkIndex < activeChunks.length - 1) {
      loadChunkAtIndex(activeChunkIndex + 1, player.playing, Math.max(0, nextTime - duration));
      return;
    }

    await player.seekTo(Math.min(nextTime, duration > 0 ? duration : nextTime));
  },

  skipBack: async (seconds: number): Promise<void> => {
    if (!player) return;
    const nextTime = player.currentTime - seconds;

    if (nextTime < 0 && activeChunkIndex > 0) {
      loadChunkAtIndex(activeChunkIndex - 1, player.playing, 0);
      return;
    }

    await player.seekTo(Math.max(0, nextTime));
  },

  savePosition: async (bookId = activeBookId): Promise<void> => {
    if (!bookId || !player) return;

    const position: SavedPosition = {
      positionSeconds: player.currentTime,
      chunkIndex: activeChunkIndex,
    };
    await AsyncStorage.setItem(`${POSITION_KEY_PREFIX}${bookId}`, JSON.stringify(position));
  },

  restorePosition: async (bookId = activeBookId): Promise<void> => {
    if (!bookId || activeChunks.length === 0) return;

    const raw = await AsyncStorage.getItem(`${POSITION_KEY_PREFIX}${bookId}`);
    if (!raw) return;

    const parsed = JSON.parse(raw) as Partial<SavedPosition>;
    const chunkIndex = typeof parsed.chunkIndex === 'number' ? parsed.chunkIndex : 0;
    const positionSeconds = typeof parsed.positionSeconds === 'number' ? parsed.positionSeconds : 0;
    loadChunkAtIndex(chunkIndex, false, positionSeconds);
  },

  getPlaybackState: (): PlaybackState => playbackState,

  unload: async (): Promise<void> => {
    destroyPlayer();
    activeChunks = [];
    activeChunkIndex = 0;
    activeBookId = null;
    playbackState = 'idle';
  },
};
