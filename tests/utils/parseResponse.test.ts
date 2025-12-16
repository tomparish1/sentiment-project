import { describe, it, expect } from 'vitest';
import { parseClaudeResponse } from '../../src/utils/parseResponse.js';

describe('parseClaudeResponse', () => {
  it('should parse clean JSON response', () => {
    const input = '{"sentiment": "positive", "confidence": 0.95}';
    const result = parseClaudeResponse(input);

    expect(result).toEqual({
      sentiment: 'positive',
      confidence: 0.95,
    });
  });

  it('should parse JSON wrapped in markdown code blocks', () => {
    const input = '```json\n{"sentiment": "negative", "confidence": 0.8}\n```';
    const result = parseClaudeResponse(input);

    expect(result).toEqual({
      sentiment: 'negative',
      confidence: 0.8,
    });
  });

  it('should parse JSON with generic code blocks', () => {
    const input = '```\n{"sentiment": "neutral", "confidence": 0.5}\n```';
    const result = parseClaudeResponse(input);

    expect(result).toEqual({
      sentiment: 'neutral',
      confidence: 0.5,
    });
  });

  it('should handle whitespace around JSON', () => {
    const input = '  \n{"sentiment": "positive"}\n  ';
    const result = parseClaudeResponse(input);

    expect(result).toEqual({
      sentiment: 'positive',
    });
  });

  it('should throw on invalid JSON', () => {
    const input = 'not valid json';

    expect(() => parseClaudeResponse(input)).toThrow();
  });
});
