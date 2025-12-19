# Skill: document-parser

## Purpose

Extract text content from various document formats (PDF, DOCX, TXT, Markdown).
This is a foundational skill that prepares documents for downstream analysis.

## When to Use

- User uploads a document file for analysis
- Any workflow that needs to convert a document to plain text
- Before sentiment, rhetoric, or metadata analysis

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| buffer | Buffer | yes | Raw file content as Buffer |
| filename | string | yes | Original filename with extension |
| mimetype | string | yes | MIME type of the file |

## Outputs

| Name | Type | Description |
|------|------|-------------|
| text | string | Extracted plain text content |
| format | string | Detected format (txt, md, pdf, docx) |
| characterCount | number | Length of extracted text |

## Supported Formats

- `.txt` - Plain text (text/plain)
- `.md`, `.markdown` - Markdown (text/markdown)
- `.pdf` - PDF documents (application/pdf)
- `.docx` - Word documents (application/vnd.openxmlformats-officedocument.wordprocessingml.document)

## Example Usage

```typescript
import { documentParser } from '../skills/document-parser';

const result = await documentParser.invoke({
  buffer: fileBuffer,
  filename: 'report.pdf',
  mimetype: 'application/pdf',
});

if (result.success) {
  console.log(result.data.text);
  // "This is the extracted text from the PDF..."
}
```

## Dependencies

- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction

## Error Handling

- Returns error if file format is unsupported
- Returns error if file is corrupted or unreadable
- Returns empty text (not error) for empty files
