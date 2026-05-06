declare module 'expo-audio' {
  export type AudioSource = string | number | null | { uri?: string; assetId?: number; headers?: Record<string, string> };

  export type AudioStatus = {
    currentTime: number;
    didJustFinish: boolean;
    duration: number;
    id: number;
    isBuffering: boolean;
    isLoaded: boolean;
    playbackState: string;
    playing: boolean;
    reasonForWaitingToPlay?: string;
    timeControlStatus: string;
  };

  export type AudioMode = {
    allowsRecording?: boolean;
    interruptionMode?: 'doNotMix' | 'duckOthers' | 'mixWithOthers';
    playsInSilentMode?: boolean;
    shouldPlayInBackground?: boolean;
  };

  export type AudioPlayerOptions = {
    updateInterval?: number;
    downloadFirst?: boolean;
  };

  export type Subscription = { remove: () => void };

  export class AudioPlayer {
    currentTime: number;
    duration: number;
    isLoaded: boolean;
    playing: boolean;
    addListener(eventName: 'playbackStatusUpdate', listener: (status: AudioStatus) => void): Subscription;
    play(): void;
    pause(): void;
    replace(source: AudioSource): void;
    seekTo(seconds: number, toleranceMillisBefore?: number, toleranceMillisAfter?: number): Promise<void>;
    remove(): void;
    setPlaybackRate(rate: number): void;
  }

  export function createAudioPlayer(source?: AudioSource, options?: AudioPlayerOptions): AudioPlayer;
  export function setAudioModeAsync(mode: Partial<AudioMode>): Promise<void>;
  export function setIsAudioActiveAsync(active: boolean): Promise<void>;
}
