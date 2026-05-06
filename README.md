# BookDrive

BookDrive is an Expo-managed React Native + TypeScript MVP for a premium AI audiobook workflow:

> Turn PDFs and books into AI-ready audiobooks for reading, listening, and driving.

## What this build focuses on

- Reliable demo audio playback with `expo-av` and iOS silent-mode support.
- A polished mobile-first dark UI with Home, Library, Add, and Now Playing tabs.
- Clean mock audiobook data that avoids copyrighted book content.
- A mini-player that appears only after a track is active and sits above the bottom nav.
- Clear import/generation placeholders without adding backend features or scraping.

## Expo Go compatibility

This project intentionally sticks to Expo-compatible libraries. The runtime dependency surface is limited to `expo-av`, `expo-file-system`, `expo-camera`, `@react-navigation`, `zustand`, and `@react-native-async-storage/async-storage` plus React/React Native/Expo.

## Setup

```bash
npm install
npm run start
```

## Demo audio

At least one mock audiobook includes a short public sample MP3 URL. The player uses that URL to validate load, play, pause, seeking, Now Playing state, and the mini-player.

## API keys

Live book search, PDF discovery, and AI narration generation are intentionally disabled in this milestone. Placeholder keys remain documented for future work:

- `YOUR_GOOGLE_BOOKS_API_KEY` in `src/services/googleBooksService.ts`
- `YOUR_OPENAI_API_KEY` in `src/services/ttsService.ts`
