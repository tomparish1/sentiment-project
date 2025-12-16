import { createRequire } from 'module';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export type SupportedMimeType =
  | 'text/plain'
  | 'text/markdown'
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.pdf', '.docx'];

export function isSupportedFile(filename: string, mimetype: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  const supportedMimes: string[] = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  return SUPPORTED_EXTENSIONS.includes(ext) || supportedMimes.includes(mimetype);
}

export async function extractText(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));

  // Plain text files
  if (ext === '.txt' || mimetype === 'text/plain') {
    return buffer.toString('utf-8').trim();
  }

  // Markdown files - just read as text
  if (ext === '.md' || ext === '.markdown' || mimetype === 'text/markdown') {
    return buffer.toString('utf-8').trim();
  }

  // PDF files
  if (ext === '.pdf' || mimetype === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  // Word documents (.docx)
  if (
    ext === '.docx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export function getSupportedExtensions(): string[] {
  return SUPPORTED_EXTENSIONS;
}
