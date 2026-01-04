/**
 * Gemini Provider
 *
 * Google Gemini API integration
 */

import type {
  LLMProvider,
  Message,
  ChatOptions,
  ChatResponse,
  ProviderMetadata,
  ModelInfo,
  ProviderConfig,
} from './types.js';
import { ProviderError } from './types.js';

const GEMINI_MODELS: ModelInfo[] = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.0,
    costPer1kOutput: 0.0,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
  },
];

const DEFAULT_MODEL = 'gemini-2.0-flash-exp';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProvider implements LLMProvider {
  private config: ProviderConfig;

  readonly metadata: ProviderMetadata = {
    name: 'gemini',
    displayName: 'Google Gemini',
    models: GEMINI_MODELS,
    supportsStreaming: true,
    supportsEmbeddings: true,
  };

  constructor(config: ProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env['GOOGLE_API_KEY'],
      baseUrl: config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: config.defaultModel ?? DEFAULT_MODEL,
      timeout: config.timeout ?? 60000,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.apiKey) return false;
      return true;
    } catch {
      return false;
    }
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
    const startTime = Date.now();
    const model = options.model ?? this.config.defaultModel ?? DEFAULT_MODEL;

    if (!this.config.apiKey) {
      throw new ProviderError(
        'GOOGLE_API_KEY not configured',
        'gemini',
        'CONFIG_ERROR'
      );
    }

    try {
      // Convert messages to Gemini format
      // Gemini doesn't have a system role, so prepend it to first user message
      const systemMessage = messages.find((m) => m.role === 'system');
      const chatMessages = messages.filter((m) => m.role !== 'system');

      const contents: GeminiContent[] = chatMessages.map((m, i) => {
        let text = m.content;
        // Prepend system message to first user message
        if (i === 0 && m.role === 'user' && systemMessage) {
          text = `${systemMessage.content}\n\n${m.content}`;
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text }],
        };
      });

      const url = `${this.config.baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: options.maxTokens ?? 4096,
            temperature: options.temperature,
            topP: options.topP,
            stopSequences: options.stopSequences,
          },
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          `Gemini API error: ${response.status} ${error}`,
          'gemini',
          'API_ERROR'
        );
      }

      const data = (await response.json()) as GeminiResponse;
      const candidate = data.candidates?.[0];

      if (!candidate) {
        throw new ProviderError(
          'No response from Gemini',
          'gemini',
          'RESPONSE_ERROR'
        );
      }

      const text = candidate.content.parts.map((p) => p.text).join('');

      return {
        content: text,
        model,
        provider: 'gemini',
        usage: data.usageMetadata
          ? {
              inputTokens: data.usageMetadata.promptTokenCount,
              outputTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined,
        finishReason: candidate.finishReason === 'STOP' ? 'stop' : 'length',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      throw new ProviderError(
        error instanceof Error ? error.message : 'Gemini API error',
        'gemini',
        'API_ERROR',
        error
      );
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.config.apiKey) {
      throw new ProviderError(
        'GOOGLE_API_KEY not configured',
        'gemini',
        'CONFIG_ERROR'
      );
    }

    try {
      const embeddings: number[][] = [];

      // Gemini embeddings API processes one text at a time
      for (const text of texts) {
        const url = `${this.config.baseUrl}/models/text-embedding-004:embedContent?key=${this.config.apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: {
              parts: [{ text }],
            },
          }),
          signal: AbortSignal.timeout(this.config.timeout ?? 60000),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new ProviderError(
            `Gemini embeddings error: ${response.status} ${error}`,
            'gemini',
            'API_ERROR'
          );
        }

        const data = (await response.json()) as {
          embedding: { values: number[] };
        };

        embeddings.push(data.embedding.values);
      }

      return embeddings;
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      throw new ProviderError(
        error instanceof Error ? error.message : 'Gemini embeddings error',
        'gemini',
        'API_ERROR',
        error
      );
    }
  }

  getModels(): ModelInfo[] {
    return GEMINI_MODELS;
  }

  getDefaultModel(): string {
    return this.config.defaultModel ?? DEFAULT_MODEL;
  }
}

// Singleton instance
let defaultInstance: GeminiProvider | null = null;

export function getGeminiProvider(config?: ProviderConfig): GeminiProvider {
  if (!defaultInstance || config) {
    defaultInstance = new GeminiProvider(config);
  }
  return defaultInstance;
}
