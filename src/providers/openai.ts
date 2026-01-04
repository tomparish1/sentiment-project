/**
 * OpenAI Provider
 *
 * OpenAI GPT API integration
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

const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    contextWindow: 16385,
    maxOutputTokens: 4096,
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
  },
];

const DEFAULT_MODEL = 'gpt-4o';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements LLMProvider {
  private config: ProviderConfig;

  readonly metadata: ProviderMetadata = {
    name: 'openai',
    displayName: 'OpenAI',
    models: OPENAI_MODELS,
    supportsStreaming: true,
    supportsEmbeddings: true,
  };

  constructor(config: ProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env['OPENAI_API_KEY'],
      baseUrl: config.baseUrl ?? 'https://api.openai.com/v1',
      defaultModel: config.defaultModel ?? DEFAULT_MODEL,
      timeout: config.timeout ?? 60000,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.apiKey) return false;
      // Could add a ping check here
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
        'OPENAI_API_KEY not configured',
        'openai',
        'CONFIG_ERROR'
      );
    }

    try {
      const openaiMessages: OpenAIMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: openaiMessages,
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature,
          top_p: options.topP,
          stop: options.stopSequences,
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          `OpenAI API error: ${response.status} ${error}`,
          'openai',
          'API_ERROR'
        );
      }

      const data = (await response.json()) as OpenAIResponse;
      const choice = data.choices[0];

      if (!choice) {
        throw new ProviderError(
          'No response from OpenAI',
          'openai',
          'RESPONSE_ERROR'
        );
      }

      return {
        content: choice.message.content,
        model,
        provider: 'openai',
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason: choice.finish_reason === 'stop' ? 'stop' : 'length',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      throw new ProviderError(
        error instanceof Error ? error.message : 'OpenAI API error',
        'openai',
        'API_ERROR',
        error
      );
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.config.apiKey) {
      throw new ProviderError(
        'OPENAI_API_KEY not configured',
        'openai',
        'CONFIG_ERROR'
      );
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          `OpenAI embeddings error: ${response.status} ${error}`,
          'openai',
          'API_ERROR'
        );
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };

      return data.data.map((d) => d.embedding);
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      throw new ProviderError(
        error instanceof Error ? error.message : 'OpenAI embeddings error',
        'openai',
        'API_ERROR',
        error
      );
    }
  }

  getModels(): ModelInfo[] {
    return OPENAI_MODELS;
  }

  getDefaultModel(): string {
    return this.config.defaultModel ?? DEFAULT_MODEL;
  }
}

// Singleton instance
let defaultInstance: OpenAIProvider | null = null;

export function getOpenAIProvider(config?: ProviderConfig): OpenAIProvider {
  if (!defaultInstance || config) {
    defaultInstance = new OpenAIProvider(config);
  }
  return defaultInstance;
}
