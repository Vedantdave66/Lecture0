import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

import { AudioTrack } from '../types';

const POSITION_KEY_PREFIX = 'bookdrive:audio-position:';

type PlaybackStatus = {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  activeTrack: AudioTrack | null;
  error: string | null;
};

type StatusListener = (status: PlaybackStatus) => void;

let sound: Audio.Sound | null = null;
let activeTrack: AudioTrack | null = null;
let isAudioModeReady = false;
let playbackStatus: PlaybackStatus = {
  isLoaded: false,
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  activeTrack: null,
  error: null
};
const listeners = new Set<StatusListener>();

const emitStatus = (patch: Partial<PlaybackStatus>): PlaybackStatus => {
  playbackStatus = { ...playbackStatus, ...patch };
  listeners.forEach((listener) => listener(playbackStatus));
  return playbackStatus;
};

const isLoadedStatus = (status: AVPlaybackStatus): status is AVPlaybackStatusSuccess => status.isLoaded;

const configureAudioMode = async (): Promise<void> => {
  if (isAudioModeReady) {
    return;
  }

  console.log('[BookDriveAudio] configuring audio mode');
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false
  });
  isAudioModeReady = true;
};

const persistPosition = async (): Promise<void> => {
  if (!activeTrack || !playbackStatus.isLoaded) {
    return;
  }

  await AsyncStorage.setItem(
    `${POSITION_KEY_PREFIX}${activeTrack.id}`,
    JSON.stringify({ positionMillis: playbackStatus.positionMillis })
  );
};

const getSavedPosition = async (trackId: string): Promise<number> => {
  const raw = await AsyncStorage.getItem(`${POSITION_KEY_PREFIX}${trackId}`);
  if (!raw) {
    return 0;
  }

  const parsed = JSON.parse(raw) as { positionMillis?: number };
  return typeof parsed.positionMillis === 'number' ? parsed.positionMillis : 0;
};

const handleNativeStatus = (status: AVPlaybackStatus): void => {
  if (!isLoadedStatus(status)) {
    if ('error' in status) {
      console.log('[BookDriveAudio] playback error', status.error);
      emitStatus({ isLoaded: false, isPlaying: false, error: status.error ?? 'Unknown playback error' });
    }
    return;
  }

  emitStatus({
    isLoaded: true,
    isPlaying: status.isPlaying,
    positionMillis: status.positionMillis,
    durationMillis: status.durationMillis ?? playbackStatus.durationMillis,
    error: null
  });

  if (status.didJustFinish) {
    console.log('[BookDriveAudio] track finished');
    void persistPosition();
    emitStatus({ isPlaying: false, positionMillis: status.durationMillis ?? status.positionMillis });
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
    await configureAudioMode();

    if (activeTrack?.id === track.id && sound && playbackStatus.isLoaded) {
      console.log('[BookDriveAudio] track already loaded', track.title);
      return playbackStatus;
    }

    console.log('[BookDriveAudio] loading track', track.title, track.audioUrl);
    await audioService.unload();
    activeTrack = track;
    emitStatus({
      activeTrack: track,
      isLoaded: false,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: track.duration * 1000,
      error: null
    });

    try {
      const savedPosition = await getSavedPosition(track.id);
      const created = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        {
          shouldPlay: false,
          positionMillis: savedPosition,
          progressUpdateIntervalMillis: 500
        },
        handleNativeStatus
      );
      sound = created.sound;
      const nativeStatus = await sound.getStatusAsync();
      handleNativeStatus(nativeStatus);
      console.log('[BookDriveAudio] loaded track', track.title);
      return playbackStatus;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load audio';
      console.log('[BookDriveAudio] load failed', message);
      emitStatus({ isLoaded: false, isPlaying: false, error: message });
      throw error;
    }
  },

  play: async (): Promise<PlaybackStatus> => {
    await configureAudioMode();
    if (!sound) {
      const message = 'No audio track loaded';
      console.log('[BookDriveAudio] play ignored:', message);
      return emitStatus({ error: message });
    }

    try {
      console.log('[BookDriveAudio] play', activeTrack?.title);
      await sound.playAsync();
      return emitStatus({ isPlaying: true, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to play audio';
      console.log('[BookDriveAudio] play failed', message);
      emitStatus({ isPlaying: false, error: message });
      throw error;
    }
  },

  pause: async (): Promise<PlaybackStatus> => {
    if (!sound) {
      return playbackStatus;
    }

    try {
      console.log('[BookDriveAudio] pause', activeTrack?.title);
      await sound.pauseAsync();
      await persistPosition();
      return emitStatus({ isPlaying: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to pause audio';
      console.log('[BookDriveAudio] pause failed', message);
      emitStatus({ error: message });
      throw error;
    }
  },

  toggle: async (): Promise<PlaybackStatus> => {
    if (playbackStatus.isPlaying) {
      return audioService.pause();
    }
    return audioService.play();
  },

  seekBy: async (deltaMillis: number): Promise<PlaybackStatus> => {
    if (!sound || !playbackStatus.isLoaded) {
      return playbackStatus;
    }

    const nextPosition = Math.max(
      0,
      Math.min(playbackStatus.positionMillis + deltaMillis, playbackStatus.durationMillis || playbackStatus.positionMillis + deltaMillis)
    );
    await sound.setPositionAsync(nextPosition);
    return emitStatus({ positionMillis: nextPosition });
  },

  unload: async (): Promise<void> => {
    if (!sound) {
      activeTrack = null;
      emitStatus({ activeTrack: null, isLoaded: false, isPlaying: false, positionMillis: 0, durationMillis: 0 });
      return;
    }

    console.log('[BookDriveAudio] unload', activeTrack?.title);
    await persistPosition();
    sound.setOnPlaybackStatusUpdate(null);
    await sound.unloadAsync();
    sound = null;
    activeTrack = null;
    emitStatus({ activeTrack: null, isLoaded: false, isPlaying: false, positionMillis: 0, durationMillis: 0, error: null });
  },

  getPlaybackStatus: (): PlaybackStatus => playbackStatus
};
