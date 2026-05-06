import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
  Track
} from 'react-native-track-player';

const POSITION_KEY_PREFIX = 'bookdrive:position:';
let isSetup = false;
let activeBookId: string | null = null;

export const audioService = {
  setup: async (): Promise<void> => {
    if (isSetup) {
      return;
    }

    await TrackPlayer.setupPlayer({ waitForBuffer: true });
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback
      },
      capabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo],
      compactCapabilities: [Capability.Play, Capability.Pause],
      notificationCapabilities: [Capability.Play, Capability.Pause, Capability.SeekTo],
      progressUpdateEventInterval: 2
    });
    TrackPlayer.setRepeatMode(RepeatMode.Off);
    isSetup = true;
  },

  loadChunks: async (chunks: string[], bookId = 'current-book'): Promise<void> => {
    await audioService.setup();
    activeBookId = bookId;
    await TrackPlayer.reset();
    const tracks: Track[] = chunks.map((uri, index) => ({
      id: `${bookId}-${index}`,
      url: uri,
      title: `Chunk ${index + 1}`,
      artist: 'BookDrive',
      album: 'BookDrive audiobook'
    }));
    await TrackPlayer.add(tracks);
  },

  play: async (): Promise<void> => {
    await audioService.setup();
    await TrackPlayer.play();
  },

  pause: async (): Promise<void> => {
    await TrackPlayer.pause();
    await audioService.savePosition();
  },

  skipForward: async (seconds: number): Promise<void> => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(progress.position + seconds);
  },

  skipBack: async (seconds: number): Promise<void> => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(0, progress.position - seconds));
  },

  savePosition: async (bookId = activeBookId): Promise<void> => {
    if (!bookId) {
      return;
    }
    const progress = await TrackPlayer.getProgress();
    const trackIndex = await TrackPlayer.getActiveTrackIndex();
    await AsyncStorage.setItem(`${POSITION_KEY_PREFIX}${bookId}`, JSON.stringify({ position: progress.position, trackIndex: trackIndex ?? 0 }));
  },

  restorePosition: async (bookId = activeBookId): Promise<void> => {
    if (!bookId) {
      return;
    }
    const raw = await AsyncStorage.getItem(`${POSITION_KEY_PREFIX}${bookId}`);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as { position?: number; trackIndex?: number };
    if (typeof parsed.trackIndex === 'number') {
      await TrackPlayer.skip(parsed.trackIndex);
    }
    if (typeof parsed.position === 'number') {
      await TrackPlayer.seekTo(parsed.position);
    }
  },

  getPlaybackState: async (): Promise<State> => {
    return TrackPlayer.getPlaybackState();
  },

  addRemoteEventHandlers: (): void => {
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
      void TrackPlayer.play();
    });
    TrackPlayer.addEventListener(Event.RemotePause, () => {
      void TrackPlayer.pause();
    });
    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
      void TrackPlayer.seekTo(event.position);
    });
  }
};
