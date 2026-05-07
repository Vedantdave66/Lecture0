// OpenAI TTS service with error classification.
// Falls back gracefully — callers should catch TtsQuotaError and TtsAuthError
// to switch to device TTS instead of crashing.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';

export const DEMO_AUDIO_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

const OPENAI_KEY_STORAGE = 'bookdrive:openai_key';
const TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';

export type GenerateAudioInput = {
  bookId?: string;
  title?: string;
  author?: string;
  text?: string;
  voiceId?: string;
  speed?: number;
};

// ---------------------------------------------------------------------------
// Typed error classes so callers can distinguish failure modes
// ---------------------------------------------------------------------------

export class TtsQuotaError extends Error {
  constructor(detail: string) {
    super(`OpenAI TTS quota/rate-limit error: ${detail}`);
    this.name = 'TtsQuotaError';
  }
}

export class TtsAuthError extends Error {
  constructor(detail: string) {
    super(`OpenAI TTS authentication error: ${detail}`);
    this.name = 'TtsAuthError';
  }
}

export class TtsNetworkError extends Error {
  constructor(detail: string) {
    super(`OpenAI TTS network error: ${detail}`);
    this.name = 'TtsNetworkError';
  }
}

/** Classify any caught error into a user-friendly one-liner. */
export const classifyTtsError = (err: unknown): string => {
  const msg = err instanceof Error ? err.message : String(err);

  if (
    err instanceof TtsQuotaError ||
    msg.includes('429') ||
    msg.includes('insufficient_quota') ||
    msg.includes('billing') ||
    msg.includes('rate limit') ||
    msg.includes('Rate limit')
  ) {
    return 'OpenAI API quota exceeded or rate-limited.';
  }
  if (
    err instanceof TtsAuthError ||
    msg.includes('401') ||
    msg.includes('invalid_api_key') ||
    msg.includes('Unauthorized')
  ) {
    return 'Invalid or missing OpenAI API key.';
  }
  if (
    err instanceof TtsNetworkError ||
    msg.includes('Failed to fetch') ||
    msg.includes('Network request failed') ||
    msg.includes('network')
  ) {
    return 'Network error connecting to OpenAI.';
  }
  return 'OpenAI TTS is currently unavailable.';
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const getCacheFile = async (chunk: string, voice: string, speed: number): Promise<File> => {
  const raw = `${chunk}|${voice}|${speed}`;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
  return new File(Paths.cache, `bookdrive_tts_${hash}.mp3`);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate audio via OpenAI TTS and cache the result as a local mp3 URI.
 *
 * Throws:
 * - `TtsQuotaError`   on HTTP 429 or insufficient_quota
 * - `TtsAuthError`    on HTTP 401 or invalid key
 * - `TtsNetworkError` on fetch failure
 * - `Error`           for other server errors
 */
export async function generateAudio(input: GenerateAudioInput = {}): Promise<string> {
  const { text = '', voiceId = 'alloy', speed = 1 } = input;

  if (!text.trim()) return DEMO_AUDIO_URL;

  const apiKey = await AsyncStorage.getItem(OPENAI_KEY_STORAGE);
  if (!apiKey) {
    console.warn('[ttsService] No OpenAI API key saved — throwing TtsAuthError');
    throw new TtsAuthError('No API key saved in the app.');
  }

  const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));
  const voice = voiceId ?? 'alloy';

  // Cache check
  const cacheFile = await getCacheFile(text, voice, clampedSpeed);
  if (cacheFile.exists) {
    console.log('[ttsService] Cache hit:', cacheFile.uri);
    return cacheFile.uri;
  }

  console.log(`[ttsService] Requesting OpenAI TTS — ${text.length} chars, voice=${voice}, speed=${clampedSpeed}`);

  let response: Response;
  try {
    response = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        speed: clampedSpeed,
        response_format: 'mp3',
      }),
    });
  } catch (fetchErr) {
    const detail = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error('[ttsService] Network error:', detail);
    throw new TtsNetworkError(detail);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    console.error(`[ttsService] OpenAI error ${response.status}:`, bodyText);

    if (response.status === 429 || bodyText.includes('insufficient_quota') || bodyText.includes('billing')) {
      throw new TtsQuotaError(`HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
    }
    if (response.status === 401) {
      throw new TtsAuthError(`HTTP 401: ${bodyText.slice(0, 200)}`);
    }
    throw new Error(`OpenAI TTS HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
  }

  // Write binary to cache
  const arrayBuffer = await response.arrayBuffer();
  cacheFile.write(new Uint8Array(arrayBuffer));

  console.log('[ttsService] Cached to:', cacheFile.uri);
  return cacheFile.uri;
}