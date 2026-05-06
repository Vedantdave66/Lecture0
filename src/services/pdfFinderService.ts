// Public-domain PDF discovery is intentionally disabled in this UI/audio milestone.
// Keep this service boundary for a future approved public-domain catalog integration.

export const findPDF = async (title: string, author: string): Promise<string | null> => {
  console.log('[BookDrivePDF] PDF search disabled in demo mode', { title, author });
  return null;
};
