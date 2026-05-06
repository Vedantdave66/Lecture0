import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { TtsVoice } from '../types';

export const OPENAI_KEY_STORAGE_KEY = 'bookdrive:openai_key';

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const TTS_CACHE_DIR = new Directory(Paths.cache, 'bookdrive', 'tts');

const ensureCacheDir = (): void => {
  if (!TTS_CACHE_DIR.exists) {
    TTS_CACHE_DIR.create({ intermediates: true, idempotent: true });
  }
};

const hashInput = (text: string, voice: string, speed: number): string => {
  const input = `${voice}:${speed}:${text}`;
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return `tts-${Math.abs(hash).toString(36)}-${input.length.toString(36)}`;
};

const toBytes = (buffer: ArrayBuffer): Uint8Array => new Uint8Array(buffer);

export const getOpenAIKey = async (): Promise<string | null> => {
  const key = await AsyncStorage.getItem(OPENAI_KEY_STORAGE_KEY);
  return key?.trim() ? key.trim() : null;
};

export const saveOpenAIKey = async (key: string): Promise<void> => {
  await AsyncStorage.setItem(OPENAI_KEY_STORAGE_KEY, key.trim());
};

export const generateAudio = async (text: string, voice: TtsVoice, speed: number): Promise<string> => {
  ensureCacheDir();
  const hash = hashInput(text, voice, speed);
  const cachedFile = new File(TTS_CACHE_DIR, `${hash}.mp3`);

  if (cachedFile.exists) {
    console.log('[BookDriveTTS] cache hit', cachedFile.uri);
    return cachedFile.uri;
  }

  const apiKey = await getOpenAIKey();
  if (!apiKey) {
    throw new Error('OpenAI API key is required before generating narration.');
  }

  console.log('[BookDriveTTS] generating chunk', { characters: text.length, voice, speed });
  const response = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      speed
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to generate OpenAI TTS audio: ${response.status} ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  cachedFile.create({ overwrite: true, intermediates: true });
  cachedFile.write(toBytes(audioBuffer));
  console.log('[BookDriveTTS] cached chunk', cachedFile.uri);
  return cachedFile.uri;
};
