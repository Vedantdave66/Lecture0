import * as FileSystem from 'expo-file-system';

import { TtsVoice } from '../types';

const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'; // TODO: replace YOUR_OPENAI_API_KEY with your OpenAI API key.
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const CACHE_DIR = `${FileSystem.documentDirectory ?? ''}bookdrive/tts/`;

const ensureCacheDir = async (): Promise<void> => {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
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

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return globalThis.btoa(binary);
};

export const generateAudio = async (text: string, voice: TtsVoice, speed: number): Promise<string> => {
  await ensureCacheDir();
  const hash = hashInput(text, voice, speed);
  const filePath = `${CACHE_DIR}${hash}.mp3`;
  const cached = await FileSystem.getInfoAsync(filePath);

  if (cached.exists) {
    return filePath;
  }

  const response = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
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
    throw new Error('Unable to generate OpenAI TTS audio.');
  }

  const audioBuffer = await response.arrayBuffer();
  await FileSystem.writeAsStringAsync(filePath, arrayBufferToBase64(audioBuffer), {
    encoding: FileSystem.EncodingType.Base64
  });

  return filePath;
};
