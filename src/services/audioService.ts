import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

const POSITION_KEY_PREFIX = 'bookdrive:position:';

type SavedPosition = {
  positionMillis: number;
  chunkIndex: number;
};

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

let isSetup = false;
let activeBookId: string | null = null;
let activeChunks: string[] = [];
let activeChunkIndex = 0;
let sound: Audio.Sound | null = null;
let playbackState: PlaybackState = 'idle';

const isLoadedStatus = (status: AVPlaybackStatus): status is AVPlaybackStatusSuccess => status.isLoaded;

const unloadCurrentSound = async (): Promise<void> => {
  if (!sound) {
    return;
  }

  sound.setOnPlaybackStatusUpdate(null);
  await sound.unloadAsync();
  sound = null;
};

const loadChunkAtIndex = async (chunkIndex: number, shouldPlay = false, positionMillis = 0): Promise<void> => {
  if (chunkIndex < 0 || chunkIndex >= activeChunks.length) {
    playbackState = 'ended';
    return;
  }

  playbackState = 'loading';
  await unloadCurrentSound();
  activeChunkIndex = chunkIndex;

  const { sound: nextSound } = await Audio.Sound.createAsync(
    { uri: activeChunks[activeChunkIndex] },
    { shouldPlay, positionMillis, progressUpdateIntervalMillis: 1000 },
    (status) => {
      if (!isLoadedStatus(status)) {
        if ('error' in status) {
          playbackState = 'error';
        }
        return;
      }

      playbackState = status.isPlaying ? 'playing' : 'paused';
      if (status.didJustFinish) {
        void loadChunkAtIndex(activeChunkIndex + 1, true);
      }
    }
  );

  sound = nextSound;
  playbackState = shouldPlay ? 'playing' : 'paused';
};

export const audioService = {
  setup: async (): Promise<void> => {
    if (isSetup) {
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    });
    isSetup = true;
  },

  loadChunks: async (chunks: string[], bookId = 'current-book'): Promise<void> => {
    await audioService.setup();
    activeBookId = bookId;
    activeChunks = chunks;
    activeChunkIndex = 0;
    await unloadCurrentSound();

    if (chunks.length > 0) {
      await loadChunkAtIndex(0, false);
    }
  },

  play: async (): Promise<void> => {
    await audioService.setup();
    if (!sound && activeChunks.length > 0) {
      await loadChunkAtIndex(activeChunkIndex, true);
      return;
    }
    await sound?.playAsync();
    playbackState = 'playing';
  },

  pause: async (): Promise<void> => {
    await sound?.pauseAsync();
    playbackState = 'paused';
    await audioService.savePosition();
  },

  skipForward: async (seconds: number): Promise<void> => {
    if (!sound) {
      return;
    }

    const status = await sound.getStatusAsync();
    if (!isLoadedStatus(status)) {
      return;
    }

    const nextPosition = status.positionMillis + seconds * 1000;
    const duration = status.durationMillis ?? nextPosition;

    if (nextPosition >= duration && activeChunkIndex < activeChunks.length - 1) {
      await loadChunkAtIndex(activeChunkIndex + 1, status.isPlaying, nextPosition - duration);
      return;
    }

    await sound.setPositionAsync(Math.min(nextPosition, duration));
  },

  skipBack: async (seconds: number): Promise<void> => {
    if (!sound) {
      return;
    }

    const status = await sound.getStatusAsync();
    if (!isLoadedStatus(status)) {
      return;
    }

    const nextPosition = status.positionMillis - seconds * 1000;
    if (nextPosition < 0 && activeChunkIndex > 0) {
      await loadChunkAtIndex(activeChunkIndex - 1, status.isPlaying, 0);
      return;
    }

    await sound.setPositionAsync(Math.max(0, nextPosition));
  },

  savePosition: async (bookId = activeBookId): Promise<void> => {
    if (!bookId || !sound) {
      return;
    }

    const status = await sound.getStatusAsync();
    if (!isLoadedStatus(status)) {
      return;
    }

    const position: SavedPosition = {
      positionMillis: status.positionMillis,
      chunkIndex: activeChunkIndex
    };
    await AsyncStorage.setItem(`${POSITION_KEY_PREFIX}${bookId}`, JSON.stringify(position));
  },

  restorePosition: async (bookId = activeBookId): Promise<void> => {
    if (!bookId || activeChunks.length === 0) {
      return;
    }

    const raw = await AsyncStorage.getItem(`${POSITION_KEY_PREFIX}${bookId}`);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Partial<SavedPosition>;
    const chunkIndex = typeof parsed.chunkIndex === 'number' ? parsed.chunkIndex : 0;
    const positionMillis = typeof parsed.positionMillis === 'number' ? parsed.positionMillis : 0;
    await loadChunkAtIndex(chunkIndex, false, positionMillis);
  },

  getPlaybackState: async (): Promise<PlaybackState> => playbackState,

  unload: async (): Promise<void> => {
    await unloadCurrentSound();
    activeChunks = [];
    activeChunkIndex = 0;
    activeBookId = null;
    playbackState = 'idle';
  }
};
