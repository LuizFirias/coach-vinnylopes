import "server-only";

/**
 * Extrai o texto de um PDF (servidor) — usado pra reaproveitar o mesmo
 * caminho de importação por IA do texto colado: PDF vira texto, texto vai
 * pro mesmo prompt (ver parseWorkoutImport.ts).
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return (result.text || "").trim();
  } finally {
    await parser.destroy();
  }
}
