# Prompt Tester Skill

## Overview

The Prompt Tester skill enables multi-provider comparison and A/B testing for prompts. Run the same prompt across Claude, GPT-4, Gemini, and Ollama to compare results, track quality, and identify the best provider for different tasks.

## Operations

### `compare`

Compare a prompt across multiple LLM providers.

**Input:**
```typescript
{
  operation: 'compare',
  prompt: string,              // The prompt to test
  systemPrompt?: string,       // Optional system prompt
  providers?: ProviderName[],  // Specific providers (default: all available)
  maxTokens?: number,          // Max tokens per response
  temperature?: number,        // Temperature (0-2)
  context?: string,            // Context for tracking
  saveResult?: boolean         // Save to history (default: true)
}
```

**Output:**
```typescript
{
  id: string,
  prompt: string,
  results: [{
    provider: 'claude' | 'openai' | 'gemini' | 'ollama',
    model: string,
    content: string,
    latencyMs: number,
    tokens?: number,
    success: boolean,
    error?: string
  }],
  analysis: {
    agreementScore: number,    // 0-1 how similar responses are
    fastestProvider: string,
    cheapestProvider?: string,
    differences: [{ type, description }]
  },
  totalTimeMs: number
}
```

### `ab-test`

Run A/B test with different prompt variants.

**Input:**
```typescript
{
  operation: 'ab-test',
  testName: string,
  variants: [{
    id: string,
    name: string,
    prompt: string,
    systemPrompt?: string
  }],
  providers?: ProviderName[],
  runsPerVariant?: number,     // Runs per variant (default: 1)
  maxTokens?: number,
  temperature?: number
}
```

### `providers`

List available LLM providers and their status.

**Input:**
```typescript
{
  operation: 'providers',
  checkAvailability?: boolean  // Check API keys (default: true)
}
```

**Output:**
```typescript
{
  providers: [{
    name: 'claude' | 'openai' | 'gemini' | 'ollama',
    displayName: string,
    available: boolean,
    reason?: string,
    models: [{ id, name }]
  }],
  availableCount: number
}
```

### `history`

Get comparison history.

**Input:**
```typescript
{
  operation: 'history',
  limit?: number,              // Max results (default: 10)
  context?: string             // Filter by context
}
```

### `quality`

Get quality metrics for providers.

**Input:**
```typescript
{
  operation: 'quality',
  provider?: ProviderName,     // Specific provider or all
  context?: string             // Filter by context
}
```

**Output:**
```typescript
{
  quality: [{
    provider: string,
    context: string,
    successRate: number,       // 0-1
    avgLatencyMs: number,
    avgAgreement: number,      // 0-1
    sampleSize: number
  }]
}
```

## Supported Providers

| Provider | Models | API Key Env Var |
|----------|--------|-----------------|
| `claude` | Claude Sonnet 4, Claude 3.5 Sonnet, Haiku, Opus | `ANTHROPIC_API_KEY` |
| `openai` | GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo | `OPENAI_API_KEY` |
| `gemini` | Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash | `GOOGLE_API_KEY` |
| `ollama` | Llama 3.2, Mistral, Mixtral, Phi-3, Qwen | Local (no key) |

## Example Usage

```typescript
// Compare providers for a sentiment analysis prompt
const result = await promptTester.invoke({
  operation: 'compare',
  prompt: 'Analyze the sentiment of: "I love this product!"',
  systemPrompt: 'You are a sentiment analysis expert. Return JSON.',
  providers: ['claude', 'openai', 'gemini'],
  context: 'sentiment-analysis'
});

// List available providers
const providers = await promptTester.invoke({
  operation: 'providers'
});

// A/B test different prompt styles
const abResult = await promptTester.invoke({
  operation: 'ab-test',
  testName: 'sentiment-prompt-style',
  variants: [
    { id: 'formal', name: 'Formal', prompt: 'Please analyze the sentiment...' },
    { id: 'casual', name: 'Casual', prompt: 'What vibe does this give...' }
  ],
  providers: ['claude', 'openai']
});

// Get quality metrics
const quality = await promptTester.invoke({
  operation: 'quality',
  context: 'sentiment-analysis'
});
```

## Storage

Comparison results are stored in:
- `/data/comparisons/comparisons.json` - Comparison history
- `/data/comparisons/quality.json` - Quality metrics
- `/data/comparisons/ab-tests.json` - A/B test results
