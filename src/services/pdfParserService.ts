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
  // TODO: wire pdf.js extraction for local/device builds. react-native-pdf renders PDFs while pdf.js extracts text.
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error('Unable to download PDF for text extraction.');
  }

  const placeholderText = `PDF text extraction placeholder for ${pdfUrl}. Connect pdf.js here to extract selectable text from each page, then chunk at sentence boundaries.`;
  return splitIntoChunks(placeholderText.repeat(80));
};
