/**
 * LLM Provider Registry
 *
 * Central registry for all LLM providers.
 * Provides factory functions and discovery.
 */

import type { LLMProvider, ProviderConfig, ProviderMetadata } from './types.js';
import { ClaudeProvider, getClaudeProvider } from './claude.js';
import { OpenAIProvider, getOpenAIProvider } from './openai.js';
import { GeminiProvider, getGeminiProvider } from './gemini.js';
import { OllamaProvider, getOllamaProvider } from './ollama.js';

export * from './types.js';
export { ClaudeProvider, getClaudeProvider } from './claude.js';
export { OpenAIProvider, getOpenAIProvider } from './openai.js';
export { GeminiProvider, getGeminiProvider } from './gemini.js';
export { OllamaProvider, getOllamaProvider } from './ollama.js';

/**
 * Supported provider names
 */
export type ProviderName = 'claude' | 'openai' | 'gemini' | 'ollama';

/**
 * Provider factory functions
 */
const providerFactories: Record<ProviderName, (config?: ProviderConfig) => LLMProvider> = {
  claude: getClaudeProvider,
  openai: getOpenAIProvider,
  gemini: getGeminiProvider,
  ollama: getOllamaProvider,
};

/**
 * Get a provider by name
 */
export function getProvider(name: ProviderName, config?: ProviderConfig): LLMProvider {
  const factory = providerFactories[name];
  if (!factory) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return factory(config);
}

/**
 * Get all registered provider names
 */
export function getProviderNames(): ProviderName[] {
  return Object.keys(providerFactories) as ProviderName[];
}

/**
 * Get metadata for all providers
 */
export function getAllProviderMetadata(): ProviderMetadata[] {
  return getProviderNames().map((name) => getProvider(name).metadata);
}

/**
 * Check which providers are available (have API keys configured)
 */
export async function getAvailableProviders(): Promise<ProviderName[]> {
  const names = getProviderNames();
  const available: ProviderName[] = [];

  for (const name of names) {
    const provider = getProvider(name);
    if (await provider.isAvailable()) {
      available.push(name);
    }
  }

  return available;
}

/**
 * Get provider availability status
 */
export async function getProviderStatus(): Promise<
  Record<ProviderName, { available: boolean; reason?: string }>
> {
  const status: Record<string, { available: boolean; reason?: string }> = {};

  for (const name of getProviderNames()) {
    try {
      const provider = getProvider(name);
      const available = await provider.isAvailable();
      status[name] = {
        available,
        reason: available ? undefined : 'API key not configured or service unavailable',
      };
    } catch (error) {
      status[name] = {
        available: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return status as Record<ProviderName, { available: boolean; reason?: string }>;
}

/**
 * Create a new provider instance (not singleton)
 */
export function createProvider(name: ProviderName, config?: ProviderConfig): LLMProvider {
  switch (name) {
    case 'claude':
      return new ClaudeProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
