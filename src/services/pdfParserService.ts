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
  console.log('[BookDrivePDF] text extraction disabled in demo mode', pdfUrl);
  const placeholderText = 'AI narration generation is coming soon. This placeholder keeps PDF chunking UI-ready without fetching or parsing external files.';
  return splitIntoChunks(placeholderText.repeat(40));
};
