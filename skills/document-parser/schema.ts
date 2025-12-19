import { z } from 'zod';

export const SupportedMimeTypes = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const SupportedExtensions = ['.txt', '.md', '.markdown', '.pdf', '.docx'] as const;

export const DocumentParserInputSchema = z.object({
  buffer: z.instanceof(Buffer),
  filename: z.string().min(1),
  mimetype: z.string(),
});

export type DocumentParserInput = z.infer<typeof DocumentParserInputSchema>;

export const DocumentParserOutputSchema = z.object({
  text: z.string(),
  format: z.enum(['txt', 'md', 'pdf', 'docx']),
  characterCount: z.number(),
});

export type DocumentParserOutput = z.infer<typeof DocumentParserOutputSchema>;
