declare module 'expo-av' {
  export type AVPlaybackStatusSuccess = {
    isLoaded: true;
    isPlaying: boolean;
    positionMillis: number;
    durationMillis?: number;
    didJustFinish: boolean;
  };

  export type AVPlaybackStatus = AVPlaybackStatusSuccess | {
    isLoaded: false;
    error?: string;
  };

  export enum InterruptionModeIOS {
    MixWithOthers = 0,
    DoNotMix = 1,
    DuckOthers = 2
  }

  export enum InterruptionModeAndroid {
    DoNotMix = 1,
    DuckOthers = 2
  }

  export namespace Audio {
    class Sound {
      static createAsync(
        source: { uri: string },
        initialStatus?: Record<string, unknown>,
        onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void
      ): Promise<{ sound: Sound; status: AVPlaybackStatus }>;
      playAsync(): Promise<AVPlaybackStatus>;
      pauseAsync(): Promise<AVPlaybackStatus>;
      unloadAsync(): Promise<AVPlaybackStatus>;
      getStatusAsync(): Promise<AVPlaybackStatus>;
      setPositionAsync(positionMillis: number): Promise<AVPlaybackStatus>;
      setOnPlaybackStatusUpdate(onPlaybackStatusUpdate: ((status: AVPlaybackStatus) => void) | null): void;
    }

    function setAudioModeAsync(mode: Record<string, unknown>): Promise<void>;
  }
}
