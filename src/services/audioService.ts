import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { AudioTrack } from '../types';

const POSITION_KEY_PREFIX = 'bookdrive:audio-position:';

type PlaybackStatus = {
  isLoaded: boolean;
  isPlaying: boolean;
  isPreparing: boolean;
  positionMillis: number;
  durationMillis: number;
  activeTrack: AudioTrack | null;
  activeChunkIndex: number;
  totalChunks: number;
  error: string | null;
};

type StatusListener = (status: PlaybackStatus) => void;

type QueueItem = {
  uri: string;
  title: string;
};

let player: AudioPlayer | null = null;
let statusSubscription: { remove: () => void } | null = null;
let activeTrack: AudioTrack | null = null;
let activeQueue: QueueItem[] = [];
let activeChunkIndex = 0;
let isAudioModeReady = false;
let playbackStatus: PlaybackStatus = {
  isLoaded: false,
  isPlaying: false,
  isPreparing: false,
  positionMillis: 0,
  durationMillis: 0,
  activeTrack: null,
  activeChunkIndex: 0,
  totalChunks: 0,
  error: null
};
const listeners = new Set<StatusListener>();

const emitStatus = (patch: Partial<PlaybackStatus>): PlaybackStatus => {
  playbackStatus = { ...playbackStatus, ...patch };
  listeners.forEach((listener) => listener(playbackStatus));
  return playbackStatus;
};

const configureAudioMode = async (): Promise<void> => {
  if (isAudioModeReady) {
    return;
  }

  console.log('[BookDriveAudio] configuring expo-audio mode');
  await setAudioModeAsync({
    allowsRecording: false,
    interruptionMode: 'doNotMix',
    playsInSilentMode: true,
    shouldPlayInBackground: true
  });
  isAudioModeReady = true;
};

const persistPosition = async (): Promise<void> => {
  if (!activeTrack || !playbackStatus.isLoaded) {
    return;
  }

  await AsyncStorage.setItem(
    `${POSITION_KEY_PREFIX}${activeTrack.id}`,
    JSON.stringify({
      positionMillis: playbackStatus.positionMillis,
      chunkIndex: activeChunkIndex
    })
  );
};

const getSavedPosition = async (trackId: string): Promise<{ positionMillis: number; chunkIndex: number }> => {
  const raw = await AsyncStorage.getItem(`${POSITION_KEY_PREFIX}${trackId}`);
  if (!raw) {
    return { positionMillis: 0, chunkIndex: 0 };
  }

  const parsed = JSON.parse(raw) as { positionMillis?: number; chunkIndex?: number };
  return {
    positionMillis: typeof parsed.positionMillis === 'number' ? parsed.positionMillis : 0,
    chunkIndex: typeof parsed.chunkIndex === 'number' ? parsed.chunkIndex : 0
  };
};

const currentQueueItem = (): QueueItem | null => activeQueue[activeChunkIndex] ?? null;

const loadCurrentQueueItem = async (shouldPlay: boolean, positionMillis = 0): Promise<void> => {
  const item = currentQueueItem();
  if (!item || !activeTrack) {
    emitStatus({ isLoaded: false, isPlaying: false, isPreparing: false });
    return;
  }

  console.log('[BookDriveAudio] loading chunk', { index: activeChunkIndex, uri: item.uri });
  statusSubscription?.remove();
  player?.remove();
  player = createAudioPlayer({ uri: item.uri }, { updateInterval: 500 });
  statusSubscription = player.addListener('playbackStatusUpdate', handleNativeStatus);
  if (positionMillis > 0) {
    await player.seekTo(positionMillis / 1000);
  }
  emitStatus({
    isLoaded: true,
    isPreparing: false,
    isPlaying: false,
    positionMillis,
    durationMillis: activeTrack.duration * 1000,
    activeTrack,
    activeChunkIndex,
    totalChunks: activeQueue.length,
    error: null
  });
  if (shouldPlay) {
    player.play();
    emitStatus({ isPlaying: true });
  }
};

const playNextChunk = async (): Promise<void> => {
  await persistPosition();
  if (activeChunkIndex >= activeQueue.length - 1) {
    emitStatus({ isPlaying: false, positionMillis: playbackStatus.durationMillis });
    return;
  }

  activeChunkIndex += 1;
  await loadCurrentQueueItem(true, 0);
};

const handleNativeStatus = (status: AudioStatus): void => {
  emitStatus({
    isLoaded: status.isLoaded,
    isPlaying: status.playing,
    positionMillis: Math.round(status.currentTime * 1000),
    durationMillis: status.duration > 0 ? Math.round(status.duration * 1000) : playbackStatus.durationMillis,
    error: null
  });

  if (status.didJustFinish) {
    console.log('[BookDriveAudio] chunk finished', activeChunkIndex);
    void playNextChunk();
  }
};

export const audioService = {
  subscribe: (listener: StatusListener): (() => void) => {
    listeners.add(listener);
    listener(playbackStatus);
    return () => listeners.delete(listener);
  },

  setup: async (): Promise<void> => {
    await configureAudioMode();
  },

  loadTrack: async (track: AudioTrack): Promise<PlaybackStatus> => {
    return audioService.loadQueue(track, [track.audioUrl]);
  },

  loadQueue: async (track: AudioTrack, chunkUris: string[]): Promise<PlaybackStatus> => {
    await configureAudioMode();
    await audioService.unload();
    activeTrack = track;
    activeQueue = chunkUris.map((uri, index) => ({ uri, title: `${track.title} · Part ${index + 1}` }));
    const saved = await getSavedPosition(track.id);
    activeChunkIndex = Math.min(saved.chunkIndex, Math.max(0, activeQueue.length - 1));
    emitStatus({
      activeTrack: track,
      activeChunkIndex,
      totalChunks: activeQueue.length,
      isPreparing: true,
      isPlaying: false,
      error: null
    });
    await loadCurrentQueueItem(false, saved.positionMillis);
    return playbackStatus;
  },

  play: async (): Promise<PlaybackStatus> => {
    await configureAudioMode();
    if (!player) {
      const message = 'No audio track loaded';
      console.log('[BookDriveAudio] play ignored:', message);
      return emitStatus({ error: message });
    }

    console.log('[BookDriveAudio] play', activeTrack?.title, 'chunk', activeChunkIndex);
    player.play();
    return emitStatus({ isPlaying: true, error: null });
  },

  pause: async (): Promise<PlaybackStatus> => {
    if (!player) {
      return playbackStatus;
    }

    console.log('[BookDriveAudio] pause', activeTrack?.title);
    player.pause();
    await persistPosition();
    return emitStatus({ isPlaying: false, error: null });
  },

  toggle: async (): Promise<PlaybackStatus> => {
    if (playbackStatus.isPlaying) {
      return audioService.pause();
    }
    return audioService.play();
  },

  seekBy: async (deltaMillis: number): Promise<PlaybackStatus> => {
    if (!player || !playbackStatus.isLoaded) {
      return playbackStatus;
    }

    const nextPosition = Math.max(
      0,
      Math.min(playbackStatus.positionMillis + deltaMillis, playbackStatus.durationMillis || playbackStatus.positionMillis + deltaMillis)
    );
    await player.seekTo(nextPosition / 1000);
    return emitStatus({ positionMillis: nextPosition });
  },

  nextChunk: async (): Promise<void> => {
    await playNextChunk();
  },

  previousChunk: async (): Promise<void> => {
    if (activeChunkIndex === 0) {
      await audioService.seekBy(-30000);
      return;
    }
    activeChunkIndex -= 1;
    await loadCurrentQueueItem(playbackStatus.isPlaying, 0);
  },

  unload: async (): Promise<void> => {
    if (player) {
      console.log('[BookDriveAudio] unload', activeTrack?.title);
      await persistPosition();
      statusSubscription?.remove();
      player.remove();
    }
    player = null;
    statusSubscription = null;
    activeTrack = null;
    activeQueue = [];
    activeChunkIndex = 0;
    emitStatus({
      activeTrack: null,
      isLoaded: false,
      isPlaying: false,
      isPreparing: false,
      positionMillis: 0,
      durationMillis: 0,
      activeChunkIndex: 0,
      totalChunks: 0,
      error: null
    });
  },

  getPlaybackStatus: (): PlaybackStatus => playbackStatus
};
