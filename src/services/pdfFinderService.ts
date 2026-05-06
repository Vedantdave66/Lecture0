const DEMO_PDF_URL = 'bookdrive://demo-pdf/sample-import';

export const findPDF = async (title: string, author: string): Promise<string | null> => {
  // TODO: Replace this demo resolver with an approved public-domain catalog integration.
  // The listening pipeline expects a PDF URL, so demo books receive a stable placeholder URI for now.
  console.log('[BookDrivePDF] demo PDF resolver used', { title, author, pdfUrl: DEMO_PDF_URL });
  return DEMO_PDF_URL;
};
