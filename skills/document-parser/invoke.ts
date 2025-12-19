import { createRequire } from 'module';
import mammoth from 'mammoth';
import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import {
  DocumentParserInputSchema,
  SupportedExtensions,
  SupportedMimeTypes,
  type DocumentParserInput,
  type DocumentParserOutput,
} from './schema.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

type FormatType = 'txt' | 'md' | 'pdf' | 'docx';

function getExtension(filename: string): string {
  return filename.toLowerCase().slice(filename.lastIndexOf('.'));
}

function detectFormat(filename: string, mimetype: string): FormatType | null {
  const ext = getExtension(filename);

  if (ext === '.txt' || mimetype === 'text/plain') return 'txt';
  if (ext === '.md' || ext === '.markdown' || mimetype === 'text/markdown') return 'md';
  if (ext === '.pdf' || mimetype === 'application/pdf') return 'pdf';
  if (
    ext === '.docx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'docx';

  return null;
}

async function extractText(buffer: Buffer, format: FormatType): Promise<string> {
  switch (format) {
    case 'txt':
    case 'md':
      return buffer.toString('utf-8').trim();

    case 'pdf': {
      const data = await pdfParse(buffer);
      return data.text.trim();
    }

    case 'docx': {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }
  }
}

export const documentParser: Skill<DocumentParserInput, DocumentParserOutput> = {
  metadata: {
    name: 'document-parser',
    version: '1.0.0',
    description: 'Extract text content from various document formats',
    category: 'document',
  },

  validate(input: DocumentParserInput) {
    const result = DocumentParserInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    const ext = getExtension(input.filename);
    const isSupported =
      SupportedExtensions.includes(ext as (typeof SupportedExtensions)[number]) ||
      SupportedMimeTypes.includes(input.mimetype as (typeof SupportedMimeTypes)[number]);

    if (!isSupported) {
      return {
        valid: false,
        errors: [`Unsupported file type: ${ext} (${input.mimetype})`],
      };
    }

    return { valid: true };
  },

  async invoke(input: DocumentParserInput): Promise<SkillResult<DocumentParserOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    // Validate input
    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<DocumentParserOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      const format = detectFormat(input.filename, input.mimetype);
      if (!format) {
        return createSkillResult<DocumentParserOutput>(name, version, startTime, undefined, {
          code: 'UNSUPPORTED_FORMAT',
          message: `Unsupported file format: ${input.filename}`,
        });
      }

      const text = await extractText(input.buffer, format);

      return createSkillResult(name, version, startTime, {
        text,
        format,
        characterCount: text.length,
      });
    } catch (error) {
      return createSkillResult<DocumentParserOutput>(name, version, startTime, undefined, {
        code: 'EXTRACTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to extract text',
        details: error,
      });
    }
  },
};

// Utility functions for compatibility
export function isSupportedFile(filename: string, mimetype: string): boolean {
  const ext = getExtension(filename);
  return (
    SupportedExtensions.includes(ext as (typeof SupportedExtensions)[number]) ||
    SupportedMimeTypes.includes(mimetype as (typeof SupportedMimeTypes)[number])
  );
}

export function getSupportedExtensions(): readonly string[] {
  return SupportedExtensions;
}

export default documentParser;
