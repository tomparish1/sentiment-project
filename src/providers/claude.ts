/**
 * Claude Provider
 *
 * Anthropic Claude API integration
 */

import Anthropic from '@anthropic-ai/sdk';
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

const CLAUDE_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },
];

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic | null = null;
  private config: ProviderConfig;

  readonly metadata: ProviderMetadata = {
    name: 'claude',
    displayName: 'Anthropic Claude',
    models: CLAUDE_MODELS,
    supportsStreaming: true,
    supportsEmbeddings: false,
  };

  constructor(config: ProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env['ANTHROPIC_API_KEY'],
      defaultModel: config.defaultModel ?? DEFAULT_MODEL,
      timeout: config.timeout ?? 60000,
    };
  }

  private getClient(): Anthropic {
    if (!this.client) {
      if (!this.config.apiKey) {
        throw new ProviderError(
          'ANTHROPIC_API_KEY not configured',
          'claude',
          'CONFIG_ERROR'
        );
      }
      this.client = new Anthropic({ apiKey: this.config.apiKey });
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.apiKey) return false;
      // Quick test - just verify the client can be created
      this.getClient();
      return true;
    } catch {
      return false;
    }
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
    const startTime = Date.now();
    const model = options.model ?? this.config.defaultModel ?? DEFAULT_MODEL;

    try {
      const client = this.getClient();

      // Extract system message if present
      const systemMessage = messages.find((m) => m.role === 'system');
      const chatMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await client.messages.create({
        model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature,
        top_p: options.topP,
        system: systemMessage?.content,
        messages: chatMessages,
        stop_sequences: options.stopSequences,
      });

      const content = response.content[0];
      if (content?.type !== 'text') {
        throw new ProviderError(
          'Unexpected response type',
          'claude',
          'RESPONSE_ERROR'
        );
      }

      return {
        content: content.text,
        model,
        provider: 'claude',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      throw new ProviderError(
        error instanceof Error ? error.message : 'Claude API error',
        'claude',
        'API_ERROR',
        error
      );
    }
  }

  getModels(): ModelInfo[] {
    return CLAUDE_MODELS;
  }

  getDefaultModel(): string {
    return this.config.defaultModel ?? DEFAULT_MODEL;
  }
}

// Singleton instance
let defaultInstance: ClaudeProvider | null = null;

export function getClaudeProvider(config?: ProviderConfig): ClaudeProvider {
  if (!defaultInstance || config) {
    defaultInstance = new ClaudeProvider(config);
  }
  return defaultInstance;
}
