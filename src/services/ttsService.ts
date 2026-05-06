import { TtsVoice } from '../types';

const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'; // TODO: replace YOUR_OPENAI_API_KEY with your OpenAI API key when real TTS is in scope.
const DEMO_TTS_AUDIO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

type TtsRequest = {
  text: string;
  voice: TtsVoice;
  speed: number;
};

const logDemoRequest = ({ text, voice, speed }: TtsRequest): void => {
  console.log('[BookDriveTTS] demo audio returned instead of generating TTS', {
    characters: text.length,
    voice,
    speed,
    apiKeyPlaceholder: OPENAI_API_KEY
  });
};

export const generateAudio = async (text: string, voice: TtsVoice, speed: number): Promise<string> => {
  // TODO: Implement real OpenAI TTS generation and local caching in a later backend/audio-generation milestone.
  // SDK 54 file-system APIs changed, and real TTS generation is intentionally out of scope for this UI/audio demo.
  // Return a known public demo MP3 so playback remains testable without broken local file writes.
  logDemoRequest({ text, voice, speed });
  return DEMO_TTS_AUDIO_URL;
};
