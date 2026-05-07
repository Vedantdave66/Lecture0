// usePlayerMachine.ts
// Self-contained playback state machine for device TTS.
// Manages: states, chunk index, speech lifecycle, auto-advance, progress saves.

import { Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import {
  pauseSpeech,
  resumeSpeech,
  speakText,
  stopSpeech,
} from '../services/speechService';
import { useLibraryStore } from '../store/libraryStore';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export type PlayerMachine = {
  playState: PlaybackState;
  chunkIndex: number;
  totalChunks: number;
  errorMsg: string;
  setChunks: (chunks: string[]) => void;
  jumpToChunk: (index: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  skipForward: () => void;
  skipBack: () => void;
  setError: (msg: string) => void;
  setLoading: () => void;
  setIdle: () => void;
};

export const usePlayerMachine = (
  bookId: string,
  bookSpeed: number
): PlayerMachine => {
  const updateBook = useLibraryStore((s) => s.updateBook);

  const [playState, setPlayState] = useState<PlaybackState>('idle');
  const [chunkIndex, setChunkIndex] = useState(0);
  const [errorMsg, setErrorMsgState] = useState('');

  // Refs for stable closures
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const speechIdRef = useRef(0);  // incremented per speak call; prevents stale onDone callbacks
  const lockRef = useRef(false);   // prevents overlapping speak calls during setup
  const speedRef = useRef(bookSpeed);
  const bookIdRef = useRef(bookId);

  useEffect(() => { speedRef.current = bookSpeed; }, [bookSpeed]);
  useEffect(() => { bookIdRef.current = bookId; }, [bookId]);

  // Stop speech on unmount
  useEffect(() => () => { void stopSpeech(); }, []);

  // Sync chunkIndex state + ref together
  const setIndex = (i: number) => {
    chunkIndexRef.current = i;
    setChunkIndex(i);
  };

  // ── Core speak ──────────────────────────────────────────────────────────

  const speakAt = async (index: number): Promise<void> => {
    if (lockRef.current) {
      console.log('[PlayerMachine] Blocked: lock held');
      return;
    }
    lockRef.current = true;
    const myId = ++speechIdRef.current;

    try {
      await stopSpeech();
      if (myId !== speechIdRef.current) { lockRef.current = false; return; }

      const chunks = chunksRef.current;
      if (index < 0 || index >= chunks.length) {
        setPlayState('idle');
        lockRef.current = false;
        return;
      }

      setIndex(index);
      setPlayState('playing');
      console.log(
        `[PlayerMachine] speak chunk=${index}/${chunks.length - 1} book="${bookIdRef.current}" speed=${speedRef.current}`
      );

      speakText(chunks[index], {
        rate: speedRef.current,
        onDone: () => {
          if (myId !== speechIdRef.current) return;
          console.log(`[PlayerMachine] chunk ${index} done`);

          // Save progress
          const progress = (index + 1) / chunks.length;
          void updateBook(bookIdRef.current, { currentChunkIndex: index + 1, progress });

          const next = index + 1;
          if (next < chunks.length) {
            console.log(`[PlayerMachine] auto-advance → ${next}`);
            void speakAt(next);
          } else {
            console.log('[PlayerMachine] book finished');
            setPlayState('idle');
            setIndex(0);
          }
        },
        onError: (err) => {
          if (myId !== speechIdRef.current) return;
          console.error('[PlayerMachine] speech error:', err.message);
          setPlayState('error');
          setErrorMsgState('Voice playback failed. Please try again.');
        },
      });
    } finally {
      lockRef.current = false;
    }
  };

  // ── Controls ────────────────────────────────────────────────────────────

  const play = () => {
    const state = playState;
    console.log(`[PlayerMachine] play() called, state=${state}`);

    if (state === 'paused') {
      if (Platform.OS === 'ios') {
        // iOS supports real resume
        void resumeSpeech().then(() => setPlayState('playing'));
      } else {
        // Android: restart current chunk
        void speakAt(chunkIndexRef.current);
      }
      return;
    }

    if (state === 'idle' || state === 'stopped' || state === 'error') {
      void speakAt(chunkIndexRef.current);
    }
  };

  const pause = () => {
    console.log('[PlayerMachine] pause()');
    speechIdRef.current++; // cancel any pending onDone
    if (Platform.OS === 'ios') {
      void pauseSpeech().then(() => setPlayState('paused'));
    } else {
      void stopSpeech().then(() => setPlayState('paused'));
    }
  };

  const stop = () => {
    console.log('[PlayerMachine] stop()');
    speechIdRef.current++;
    void stopSpeech().then(() => setPlayState('stopped'));
  };

  const skipForward = () => {
    const wasPlaying = playState === 'playing';
    const next = Math.min(chunkIndexRef.current + 1, chunksRef.current.length - 1);
    console.log(`[PlayerMachine] skipForward → ${next}, wasPlaying=${wasPlaying}`);
    speechIdRef.current++;
    if (wasPlaying) {
      void speakAt(next);
    } else {
      void stopSpeech().then(() => { setIndex(next); setPlayState('stopped'); });
    }
  };

  const skipBack = () => {
    const wasPlaying = playState === 'playing';
    const prev = Math.max(chunkIndexRef.current - 1, 0);
    console.log(`[PlayerMachine] skipBack → ${prev}, wasPlaying=${wasPlaying}`);
    speechIdRef.current++;
    if (wasPlaying) {
      void speakAt(prev);
    } else {
      void stopSpeech().then(() => { setIndex(prev); setPlayState('stopped'); });
    }
  };

  const jumpToChunk = (index: number) => {
    const wasPlaying = playState === 'playing';
    console.log(`[PlayerMachine] jumpToChunk ${index}, wasPlaying=${wasPlaying}`);
    speechIdRef.current++;
    if (wasPlaying) {
      void speakAt(index);
    } else {
      void stopSpeech().then(() => { setIndex(index); setPlayState('stopped'); });
    }
  };

  // ── Public setters for loading / error states ──────────────────────────

  const setChunks = (chunks: string[]) => {
    chunksRef.current = chunks;
    // Note: we do NOT call setChunks on state because chunk list lives in PlayerScreen
  };

  const setError = (msg: string) => {
    setErrorMsgState(msg);
    setPlayState('error');
  };

  const setLoading = () => setPlayState('loading');
  const setIdle = () => setPlayState('idle');

  return {
    playState,
    chunkIndex,
    totalChunks: chunksRef.current.length,
    errorMsg,
    setChunks,
    jumpToChunk,
    play,
    pause,
    stop,
    skipForward,
    skipBack,
    setError,
    setLoading,
    setIdle,
  };
};
