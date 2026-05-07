// Device TTS wrapper using expo-speech + TTS provider preference storage.
// expo-speech.pause() is iOS-only; on Android we simulate pause by stopping
// and replaying from the beginning of the chunk on resume.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

export type TtsProvider = 'device' | 'openai';

const PROVIDER_KEY = 'bookdrive:tts_provider';

// ---------------------------------------------------------------------------
// Provider preference
// ---------------------------------------------------------------------------

export const getTtsProvider = async (): Promise<TtsProvider> => {
  const stored = await AsyncStorage.getItem(PROVIDER_KEY);
  return (stored as TtsProvider | null) ?? 'device'; // default: device (no API key needed)
};

export const setTtsProvider = async (provider: TtsProvider): Promise<void> => {
  await AsyncStorage.setItem(PROVIDER_KEY, provider);
};

// ---------------------------------------------------------------------------
// Device TTS playback
// ---------------------------------------------------------------------------

/**
 * Speak a text chunk using the device's built-in TTS engine.
 * Chunks longer than expo-speech's maxSpeechInputLength are automatically split.
 */
export const speakText = (
  text: string,
  options: {
    rate?: number;
    onDone?: () => void;
    onError?: (err: Error) => void;
    onStart?: () => void;
  }
): void => {
  // Clamp to device limit (iOS: MAX_VALUE, Android: ~4000 chars)
  const safeText = text.slice(0, Speech.maxSpeechInputLength);

  console.log(`[speechService] Speaking ${safeText.length} chars at rate ${options.rate ?? 1.0}`);

  Speech.speak(safeText, {
    language: 'en-US',
    rate: options.rate ?? 1.0,
    onStart: options.onStart,
    onDone: options.onDone,
    onError: options.onError,
    onStopped: () => {
      // onStopped fires when Speech.stop() is called — do NOT auto-advance
      console.log('[speechService] Speech stopped (user action or skip)');
    },
  });
};

/** Stop any active speech immediately. Safe to call even if not speaking. */
export const stopSpeech = async (): Promise<void> => {
  try {
    await Speech.stop();
  } catch {
    // Already stopped — ignore
  }
};

/** Returns true if device TTS is currently speaking. */
export const isSpeaking = (): Promise<boolean> => Speech.isSpeakingAsync();
