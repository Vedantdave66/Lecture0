# BookDrive

BookDrive is an Expo managed-workflow React Native + TypeScript MVP for turning public-domain PDFs into drive-friendly AI-voiced audiobooks.

## Highlights

- Dark, warm book-app theme with bottom tabs and persistent mini player.
- Library grid with saved book metadata, listening status, and progress.
- Add Book flow with expo-camera cover-scan placeholder and Google Books manual search.
- Public-domain PDF finder service ordered Project Gutenberg → Open Library → Internet Archive.
- PDF files and generated TTS audio are stored with `expo-file-system`.
- OpenAI `tts-1` TTS service stub with local file caching per text/voice/speed.
- `expo-av` audio backend for Expo Go-compatible playback, pause, resume, and 30-second seeking.
- Minimal Driving Mode with oversized play and 30-second seek targets.

## Expo Go compatibility

This MVP intentionally avoids custom native modules that can cause Expo Go runtime crashes such as `PlatformConstants could not be found`.

Allowed runtime libraries are limited to Expo-compatible pieces: `expo-av`, `expo-file-system`, `expo-camera`, `@react-navigation`, `zustand`, and `@react-native-async-storage/async-storage`.

## Setup

```bash
npm install
npm run start
```

## API keys

Replace these placeholders before calling live APIs:

- `YOUR_GOOGLE_BOOKS_API_KEY` in `src/services/googleBooksService.ts`
- `YOUR_OPENAI_API_KEY` in `src/services/ttsService.ts`

## Local demo mode

If you want to see the product flow without API keys, open the app and tap **Load demo library** on the empty Library screen. This seeds three public-domain books with cover art, PDF URLs, statuses, progress, voices, and playback speeds so you can navigate through:

1. Library grid and progress bars.
2. Book Detail PDF status, upload fallback, voice selector, and speed selector.
3. Player screen and Driving Mode layout.

The demo data is stored locally with AsyncStorage and can be replaced by real Google Books / PDF finder results when API keys are configured.
