// Real OpenAI TTS service.
// - Reads the API key from AsyncStorage key 'bookdrive:openai_key'
// - Hashes chunk + voice + speed with expo-crypto to create a stable cache filename
// - Returns a cached local file URI if it already exists
// - Otherwise POSTs to OpenAI /v1/audio/speech, receives the binary, and writes it
//   to the cache directory using expo-file-system v19 (File/Paths API)

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
 * Converts a text chunk to speech using OpenAI TTS and caches the result.
 *
 * Returns a local file:// URI pointing to the cached .mp3.
 * Falls back to DEMO_AUDIO_URL if no API key is saved or text is empty.
 */
export async function generateAudio(input: GenerateAudioInput = {}): Promise<string> {
  const { text = '', voiceId = 'alloy', speed = 1 } = input;

  if (!text.trim()) {
    return DEMO_AUDIO_URL;
  }

  const apiKey = await AsyncStorage.getItem(OPENAI_KEY_STORAGE);
  if (!apiKey) {
    console.warn('[ttsService] No OpenAI API key found — using demo audio.');
    return DEMO_AUDIO_URL;
  }

  // Clamp speed to OpenAI allowed range [0.25, 4.0]
  const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));
  const voice = voiceId ?? 'alloy';

  // Check cache — if file already exists, return immediately
  const cacheFile = await getCacheFile(text, voice, clampedSpeed);
  if (cacheFile.exists) {
    console.log('[ttsService] Cache hit:', cacheFile.uri);
    return cacheFile.uri;
  }

  // POST to OpenAI TTS endpoint and read the response as binary
  console.log('[ttsService] Requesting TTS for chunk of length', text.length);

  const response = await fetch(TTS_ENDPOINT, {
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

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI TTS error ${response.status}: ${errText}`);
  }

  // Read binary and write to cache using expo-file-system v19 File API
  const arrayBuffer = await response.arrayBuffer();
  cacheFile.write(new Uint8Array(arrayBuffer));

  console.log('[ttsService] Saved to cache:', cacheFile.uri);
  return cacheFile.uri;
}