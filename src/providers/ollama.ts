/**
 * Ollama Provider
 *
 * Local Ollama API integration for running models locally
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

// Common Ollama models - actual availability depends on what's installed
const OLLAMA_MODELS: ModelInfo[] = [
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    contextWindow: 128000,
    maxOutputTokens: 4096,
  },
  {
    id: 'llama3.1',
    name: 'Llama 3.1',
    contextWindow: 128000,
    maxOutputTokens: 4096,
  },
  {
    id: 'mistral',
    name: 'Mistral 7B',
    contextWindow: 32000,
    maxOutputTokens: 4096,
  },
  {
    id: 'mixtral',
    name: 'Mixtral 8x7B',
    contextWindow: 32000,
    maxOutputTokens: 4096,
  },
  {
    id: 'phi3',
    name: 'Phi-3',
    contextWindow: 128000,
    maxOutputTokens: 4096,
  },
  {
    id: 'qwen2.5',
    name: 'Qwen 2.5',
    contextWindow: 32000,
    maxOutputTokens: 4096,
  },
];

const DEFAULT_MODEL = 'llama3.2';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements LLMProvider {
  private config: ProviderConfig;
  private installedModels: ModelInfo[] | null = null;

  readonly metadata: ProviderMetadata = {
    name: 'ollama',
    displayName: 'Ollama (Local)',
    models: OLLAMA_MODELS,
    supportsStreaming: true,
    supportsEmbeddings: true,
  };

  constructor(config: ProviderConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434',
      defaultModel: config.defaultModel ?? DEFAULT_MODEL,
      timeout: config.timeout ?? 120000, // Longer timeout for local models
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch the list of models installed in Ollama
   */
  async fetchInstalledModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as {
        models: Array<{
          name: string;
          size: number;
          details?: { parameter_size?: string };
        }>;
      };

      this.installedModels = data.models.map((m) => ({
        id: m.name,
        name: m.name,
        contextWindow: 32000, // Default estimate
        maxOutputTokens: 4096,
      }));

      return this.installedModels;
    } catch {
      return [];
    }
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
    const startTime = Date.now();
    const model = options.model ?? this.config.defaultModel ?? DEFAULT_MODEL;

    try {
      const ollamaMessages: OllamaMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: ollamaMessages,
          stream: false,
          options: {
            num_predict: options.maxTokens ?? 4096,
            temperature: options.temperature,
            top_p: options.topP,
            stop: options.stopSequences,
          },
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 120000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          `Ollama error: ${response.status} ${error}`,
          'ollama',
          'API_ERROR'
        );
      }

      const data = (await response.json()) as OllamaResponse;

      return {
        content: data.message.content,
        model,
        provider: 'ollama',
        usage: {
          inputTokens: data.prompt_eval_count ?? 0,
          outputTokens: data.eval_count ?? 0,
          totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        },
        finishReason: data.done ? 'stop' : 'length',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      // Check if Ollama is not running
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ProviderError(
          'Ollama is not running. Start it with: ollama serve',
          'ollama',
          'CONNECTION_ERROR'
        );
      }

      throw new ProviderError(
        error instanceof Error ? error.message : 'Ollama error',
        'ollama',
        'API_ERROR',
        error
      );
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];

      for (const text of texts) {
        const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'nomic-embed-text', // Common embedding model
            prompt: text,
          }),
          signal: AbortSignal.timeout(this.config.timeout ?? 60000),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new ProviderError(
            `Ollama embeddings error: ${response.status} ${error}`,
            'ollama',
            'API_ERROR'
          );
        }

        const data = (await response.json()) as { embedding: number[] };
        embeddings.push(data.embedding);
      }

      return embeddings;
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      throw new ProviderError(
        error instanceof Error ? error.message : 'Ollama embeddings error',
        'ollama',
        'API_ERROR',
        error
      );
    }
  }

  getModels(): ModelInfo[] {
    return this.installedModels ?? OLLAMA_MODELS;
  }

  getDefaultModel(): string {
    return this.config.defaultModel ?? DEFAULT_MODEL;
  }
}

// Singleton instance
let defaultInstance: OllamaProvider | null = null;

export function getOllamaProvider(config?: ProviderConfig): OllamaProvider {
  if (!defaultInstance || config) {
    defaultInstance = new OllamaProvider(config);
  }
  return defaultInstance;
}
