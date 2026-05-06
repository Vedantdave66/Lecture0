# BookDrive

BookDrive is an Expo managed-workflow React Native + TypeScript MVP for turning public-domain PDFs into drive-friendly AI-voiced audiobooks.

## Highlights

- Dark, warm book-app theme with bottom tabs and persistent mini player.
- Library grid with saved book metadata, listening status, and progress.
- Add Book flow with expo-camera cover-scan placeholder and Google Books manual search.
- Public-domain PDF finder service ordered Project Gutenberg → Open Library → Internet Archive.
- PDF upload fallback via Expo Document Picker and local storage via `expo-file-system`.
- OpenAI `tts-1` TTS service stub with local SHA-256 cache per text/voice/speed.
- `expo-av` audio backend for Expo Go-compatible playback, pause, resume, and 30-second seeking.
- Minimal Driving Mode with oversized play and 30-second seek targets.

## Setup

```bash
npm install
npm run start
```

Audio playback now uses `expo-av`, so the player can run in Expo Go without a custom native development build. `react-native-pdf` is still listed for the future PDF viewer path; if you wire native PDF rendering, use an Expo development build for that portion.

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
