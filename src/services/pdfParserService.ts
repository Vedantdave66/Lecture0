const CHUNK_SIZE = 3000;

const splitIntoChunks = (text: string): string[] => {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  sentences.forEach((sentence) => {
    if (`${current} ${sentence}`.length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
      return;
    }
    current = `${current} ${sentence}`.trim();
  });

  if (current.length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
};

export const extractTextFromPDF = async (pdfUrl: string): Promise<string[]> => {
  // TODO: Wire a real Expo-compatible PDF text extraction path after the generation backend is scoped.
  console.log('[BookDrivePDF] demo text extraction used', pdfUrl);
  const demoText = [
    'Welcome to BookDrive. This short generated narration demonstrates the complete listening pipeline for imported books.',
    'The app finds a demo PDF reference, prepares readable chunks, sends each chunk to text to speech, caches the resulting audio, and plays the chunks in order.',
    'Future releases will replace this placeholder with real public-domain PDF extraction and richer chapter detection.'
  ].join(' ');
  return splitIntoChunks(demoText.repeat(8));
};
