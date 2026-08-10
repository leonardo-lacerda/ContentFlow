declare module 'pdf-parse' {
  type PdfParseResult = {
    text: string;
    numpages?: number;
    info?: Record<string, unknown>;
  };

  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export = pdfParse;
}
