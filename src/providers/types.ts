/**
 * LLM Provider Abstraction Types
 *
 * Defines a common interface for interacting with different LLM providers
 * (Claude, OpenAI, Gemini, Ollama, etc.)
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
  latencyMs: number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
}

export interface ProviderMetadata {
  name: string;
  displayName: string;
  models: ModelInfo[];
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

/**
 * Common interface for all LLM providers
 */
export interface LLMProvider {
  /** Provider metadata */
  readonly metadata: ProviderMetadata;

  /** Check if the provider is available (API key set, service reachable) */
  isAvailable(): Promise<boolean>;

  /** Send a chat completion request */
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  /** Generate embeddings (optional - not all providers support this) */
  embed?(texts: string[]): Promise<number[][]>;

  /** List available models */
  getModels(): ModelInfo[];

  /** Get the default model for this provider */
  getDefaultModel(): string;
}

/**
 * Error thrown by providers
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
