export async function parsePDF(buffer: Buffer): Promise<string> {
  const pdfParse = await import('pdf-parse')
  const data = await pdfParse.default(buffer)
  return data.text
}