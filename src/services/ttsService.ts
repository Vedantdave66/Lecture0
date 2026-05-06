export const DEMO_AUDIO_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export type GenerateAudioInput = {
  bookId?: string;
  title?: string;
  author?: string;
  text?: string;
  voiceId?: string;
};

export async function generateAudio(_input?: GenerateAudioInput): Promise<string> {
  // TODO: Replace this demo URL with real TTS generation once backend/audio generation is in scope.
  return DEMO_AUDIO_URL;
}