# Writer's Portal NLP Front-End Specification

**Version:** 1.0.0
**Status:** Draft
**Date:** January 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Intent Classification Service](#3-intent-classification-service)
4. [Parameter Extraction Layer](#4-parameter-extraction-layer)
5. [Conversation Context Service](#5-conversation-context-service)
6. [Response Formatter](#6-response-formatter)
7. [Unified NLP Gateway](#7-unified-nlp-gateway)
8. [Chat UI Specification](#8-chat-ui-specification)
9. [API Contracts](#9-api-contracts)
10. [Implementation Phases](#10-implementation-phases)
11. [Appendices](#11-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This specification defines the architecture and implementation requirements for a Natural Language Processing (NLP) front-end to the Writer's Portal. The NLP front-end will provide a conversational interface that allows users to access all agents, skills, and capabilities through natural language commands rather than direct API calls or form-based interfaces.

### 1.2 Goals

- **Unified Access**: Single conversational interface to all Writer's Portal capabilities
- **Natural Interaction**: Users express intent in natural language; system handles routing
- **Context Awareness**: Multi-turn conversations with memory of previous interactions
- **Transparency**: Users understand what the system is doing and why
- **Extensibility**: New agents/skills automatically become accessible through NLP

### 1.3 Existing Foundation

The Writer's Portal already provides:

| Component | Status | Leverage Point |
|-----------|--------|----------------|
| Agent Registry | Ready | Dynamic agent discovery via `getAgent()`, `getAllAgentMetadata()` |
| Skill Registry | Ready | Dynamic skill discovery via `getSkill()`, `getAllSkillMetadata()` |
| Zod Schemas | Ready | Input validation and parameter extraction |
| Workflow Tracking | Ready | Execution progress and decision transparency |
| REST API | Ready | Execution endpoints for all agents/skills |

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CHAT UI LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Message     │  │ File Upload │  │ Progress    │  │ Result          │ │
│  │ Input       │  │ Handler     │  │ Display     │  │ Visualization   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NLP GATEWAY SERVICE                              │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    Intent Classification                             ││
│  │  User Input → Claude LLM → Intent + Confidence + Entities           ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    Parameter Extraction                              ││
│  │  Entities + Context → Zod Schema Mapping → Validated Parameters     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    Conversation Memory                               ││
│  │  Session State + History + Document References + Pending Actions    ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    Response Formatter                                ││
│  │  AgentResult/SkillResult → Natural Language + Structured Data       ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXISTING WRITER'S PORTAL                              │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────────────┐ │
│  │ Agent Registry│  │ Skill Registry│  │ REST API Layer               │ │
│  │ - content-    │  │ - document-   │  │ - /api/agents/{name}/execute │ │
│  │   analysis    │  │   parser      │  │ - /api/skills/{name}/invoke  │ │
│  │ - research-   │  │ - sentiment-  │  │ - /api/health                │ │
│  │   analyst     │  │   analyzer    │  │                              │ │
│  │               │  │ - rhetoric-   │  │                              │ │
│  │               │  │   analyzer    │  │                              │ │
│  │               │  │ - ...         │  │                              │ │
│  └───────────────┘  └───────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Chat UI** | User input, file handling, progress display, result rendering |
| **Intent Classifier** | Map natural language to agent/skill + action |
| **Parameter Extractor** | Extract and validate parameters from user input |
| **Conversation Memory** | Maintain context across conversation turns |
| **Response Formatter** | Convert structured results to natural language |
| **NLP Gateway** | Orchestrate all components, route to existing API |

### 2.3 Data Flow

```
User Message
    │
    ▼
┌──────────────────┐
│ Intent           │──→ Unknown Intent ──→ Clarification Response
│ Classification   │
└────────┬─────────┘
         │ Known Intent
         ▼
┌──────────────────┐
│ Parameter        │──→ Missing Required ──→ Parameter Request
│ Extraction       │
└────────┬─────────┘
         │ Complete Parameters
         ▼
┌──────────────────┐
│ Context          │──→ Add session context, resolve references
│ Enrichment       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Agent/Skill      │──→ Execute via existing API
│ Execution        │
└────────┬─────────┘
         │ AgentResult / SkillResult
         ▼
┌──────────────────┐
│ Response         │──→ Natural Language + Structured Data
│ Formatting       │
└────────┬─────────┘
         │
         ▼
    Chat Response
```

---

## 3. Intent Classification Service

### 3.1 Purpose

Classify natural language user input into structured intents that map to Writer's Portal agents and skills.

### 3.2 Intent Taxonomy

#### 3.2.1 Agent-Level Intents

```typescript
interface AgentIntent {
  type: 'agent';
  agent: 'content-analysis' | 'research-analyst';
  action: 'execute';
  confidence: number;
}
```

| Intent ID | Example Utterances | Maps To |
|-----------|-------------------|---------|
| `analyze_content` | "Analyze this document", "What's the sentiment?", "Check the tone" | `content-analysis` agent |
| `research_document` | "Research this transcript", "Analyze speakers", "Who said what?" | `research-analyst` agent |

#### 3.2.2 Skill-Level Intents

```typescript
interface SkillIntent {
  type: 'skill';
  skill: string;
  action: 'invoke';
  confidence: number;
}
```

| Intent ID | Example Utterances | Maps To |
|-----------|-------------------|---------|
| `parse_document` | "Extract text from this PDF", "Parse this file" | `document-parser` skill |
| `get_metadata` | "How long is this document?", "Word count?", "Is this a dialogue?" | `document-metadata` skill |
| `analyze_sentiment` | "What's the sentiment?", "Is this positive or negative?" | `sentiment-analyzer` skill |
| `analyze_rhetoric` | "What rhetorical moves are used?", "Classify the arguments" | `rhetoric-analyzer` skill |
| `segment_text` | "Break this into paragraphs", "Split by speaker" | `text-segmenter` skill |
| `manage_exemplars` | "Show exemplars", "Add this as an exemplar" | `exemplar-store` skill |

#### 3.2.3 System Intents

```typescript
interface SystemIntent {
  type: 'system';
  action: 'help' | 'status' | 'capabilities' | 'history' | 'clear' | 'cancel';
  confidence: number;
}
```

| Intent ID | Example Utterances |
|-----------|-------------------|
| `help` | "Help", "What can you do?", "How does this work?" |
| `status` | "What's the status?", "Is the server running?" |
| `capabilities` | "List agents", "What skills are available?" |
| `history` | "What did we analyze before?", "Show previous results" |
| `clear` | "Clear context", "Start over", "New conversation" |
| `cancel` | "Stop", "Cancel", "Never mind" |

#### 3.2.4 Clarification Intents

```typescript
interface ClarificationIntent {
  type: 'clarification';
  action: 'provide_file' | 'provide_text' | 'provide_option' | 'confirm' | 'deny';
  confidence: number;
}
```

### 3.3 Intent Classification Prompt

```typescript
const INTENT_CLASSIFICATION_PROMPT = `
You are an intent classifier for the Writer's Portal, a document analysis system.

## Available Agents
${agentMetadataJson}

## Available Skills
${skillMetadataJson}

## Classification Task
Given the user message and conversation context, classify the intent.

User Message: "${userMessage}"
Conversation Context: ${conversationContextJson}
Pending File: ${pendingFileName || 'none'}

## Response Format
Respond with JSON:
{
  "intent": {
    "type": "agent" | "skill" | "system" | "clarification" | "unknown",
    "target": "<agent-name or skill-name or system-action>",
    "action": "<action>",
    "confidence": <0.0-1.0>
  },
  "entities": {
    "emotions": ["joy", "anger", ...] | null,
    "skipRhetoric": boolean | null,
    "forceRhetoric": boolean | null,
    "includeQuotes": boolean | null,
    "documentReference": "current" | "previous" | null,
    "speakerName": string | null
  },
  "requiresFile": boolean,
  "requiresClarification": {
    "needed": boolean,
    "question": string | null,
    "options": string[] | null
  }
}

## Classification Rules
1. If user mentions "sentiment", "tone", "feeling", "emotion" → likely content-analysis or sentiment-analyzer
2. If user mentions "speakers", "dialogue", "who said", "transcript" → likely research-analyst
3. If user mentions "rhetoric", "argument", "persuasion", "moves" → likely rhetoric-analyzer
4. If user asks about the document itself (length, type, structure) → document-metadata
5. If user wants to extract text from a file → document-parser
6. If user's intent is ambiguous between agent and skill, prefer agent (more comprehensive)
7. If no file is provided and the intent requires one, set requiresFile: true
`;
```

### 3.4 Intent Classifier Implementation

```typescript
// Location: /src/nlp/services/intentClassifier.ts

import Anthropic from '@anthropic-ai/sdk';
import { getAllAgentMetadata } from '../../agents/registry.js';
import { getAllSkillMetadata } from '../../skills/registry.js';

export interface ClassifiedIntent {
  intent: {
    type: 'agent' | 'skill' | 'system' | 'clarification' | 'unknown';
    target: string;
    action: string;
    confidence: number;
  };
  entities: ExtractedEntities;
  requiresFile: boolean;
  requiresClarification: {
    needed: boolean;
    question: string | null;
    options: string[] | null;
  };
}

export interface ExtractedEntities {
  emotions: string[] | null;
  skipRhetoric: boolean | null;
  forceRhetoric: boolean | null;
  includeQuotes: boolean | null;
  documentReference: 'current' | 'previous' | null;
  speakerName: string | null;
  customText: string | null;
}

export interface IntentClassifierConfig {
  confidenceThreshold: number;  // Default: 0.7
  fallbackToAgent: boolean;     // Default: true (prefer agent over skill when ambiguous)
}

export class IntentClassifier {
  private client: Anthropic;
  private config: IntentClassifierConfig;

  constructor(config?: Partial<IntentClassifierConfig>) {
    this.client = new Anthropic();
    this.config = {
      confidenceThreshold: config?.confidenceThreshold ?? 0.7,
      fallbackToAgent: config?.fallbackToAgent ?? true,
    };
  }

  async classify(
    userMessage: string,
    conversationContext: ConversationContext
  ): Promise<ClassifiedIntent> {
    const agentMetadata = getAllAgentMetadata();
    const skillMetadata = getAllSkillMetadata();

    const prompt = this.buildPrompt(
      userMessage,
      conversationContext,
      agentMetadata,
      skillMetadata
    );

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    return this.parseResponse(response);
  }

  private buildPrompt(/* ... */): string { /* ... */ }
  private parseResponse(/* ... */): ClassifiedIntent { /* ... */ }
}
```

### 3.5 Confidence Handling

| Confidence Level | Action |
|-----------------|--------|
| ≥ 0.85 | Execute immediately |
| 0.70 - 0.84 | Execute with confirmation option |
| 0.50 - 0.69 | Ask for clarification with top options |
| < 0.50 | Ask open-ended clarification |

---

## 4. Parameter Extraction Layer

### 4.1 Purpose

Extract, validate, and complete parameters from user input and conversation context to satisfy agent/skill input schemas.

### 4.2 Parameter Mapping

#### 4.2.1 Content Analysis Agent Parameters

```typescript
// Existing schema: ContentAnalysisInputSchema
interface ContentAnalysisParams {
  text?: string;                    // From: uploaded file, pasted text, or context
  buffer?: Buffer;                  // From: file upload
  filename?: string;                // From: file upload metadata
  mimetype?: string;                // From: file upload metadata
  exemplarStorePath?: string;       // Default: './data/exemplars/starter.json'
  emotions?: EmotionType[];         // From: NLP extraction
  skipRhetoric?: boolean;           // From: NLP extraction
  forceRhetoric?: boolean;          // From: NLP extraction
  skipSentiment?: boolean;          // From: NLP extraction
}
```

**NLP Extraction Rules:**

| User Says | Extracted Parameter |
|-----------|-------------------|
| "focus on anger and fear" | `emotions: ['anger', 'fear']` |
| "just sentiment, no rhetoric" | `skipRhetoric: true` |
| "include rhetoric analysis" | `forceRhetoric: true` |
| "skip sentiment" | `skipSentiment: true` |
| "analyze for joy and surprise" | `emotions: ['joy', 'surprise']` |

#### 4.2.2 Research Analyst Agent Parameters

```typescript
// Existing schema: ResearchAnalystInputSchema
interface ResearchAnalystParams {
  text?: string;
  buffer?: Buffer;
  filename?: string;
  mimetype?: string;
  exemplarStorePath?: string;
  emotions?: EmotionType[];
  maxSpeakers?: number;             // From: NLP extraction
  includeQuotes?: boolean;          // From: NLP extraction
}
```

**NLP Extraction Rules:**

| User Says | Extracted Parameter |
|-----------|-------------------|
| "limit to 3 speakers" | `maxSpeakers: 3` |
| "include notable quotes" | `includeQuotes: true` |
| "just the analysis, no quotes" | `includeQuotes: false` |

#### 4.2.3 Skill Parameters

Each skill has its own parameter schema. The Parameter Extractor maps entities to these schemas:

```typescript
// Sentiment Analyzer
{ text: string, emotions?: EmotionType[] }

// Rhetoric Analyzer
{ text: string, exemplarStorePath: string, segmentationMethod?: string }

// Text Segmenter
{ text: string, method: 'sentence' | 'paragraph' | 'sliding' | 'speaker_turn' }

// Document Metadata
{ text: string, filename?: string }
```

### 4.3 Parameter Extractor Implementation

```typescript
// Location: /src/nlp/services/parameterExtractor.ts

import { z } from 'zod';
import { ContentAnalysisInputSchema } from '../../agents/content-analysis/schema.js';
import { ResearchAnalystInputSchema } from '../../agents/research-analyst/schema.js';

export interface ExtractionContext {
  entities: ExtractedEntities;
  conversationContext: ConversationContext;
  pendingFile?: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  };
}

export interface ExtractionResult<T> {
  success: boolean;
  params?: T;
  missing?: string[];
  errors?: string[];
}

export class ParameterExtractor {
  /**
   * Extract and validate parameters for content-analysis agent
   */
  extractContentAnalysisParams(
    context: ExtractionContext
  ): ExtractionResult<ContentAnalysisInput> {
    const params: Partial<ContentAnalysisInput> = {};

    // File or text is required
    if (context.pendingFile) {
      params.buffer = context.pendingFile.buffer;
      params.filename = context.pendingFile.filename;
      params.mimetype = context.pendingFile.mimetype;
    } else if (context.conversationContext.lastDocument?.text) {
      params.text = context.conversationContext.lastDocument.text;
    }

    // Extract optional parameters from entities
    if (context.entities.emotions) {
      params.emotions = context.entities.emotions as EmotionType[];
    }
    if (context.entities.skipRhetoric !== null) {
      params.skipRhetoric = context.entities.skipRhetoric;
    }
    if (context.entities.forceRhetoric !== null) {
      params.forceRhetoric = context.entities.forceRhetoric;
    }

    // Default exemplar store path
    params.exemplarStorePath = './data/exemplars/starter.json';

    // Validate against schema
    const result = ContentAnalysisInputSchema.safeParse(params);

    if (result.success) {
      return { success: true, params: result.data };
    } else {
      return {
        success: false,
        missing: this.identifyMissingFields(result.error),
        errors: result.error.errors.map(e => e.message),
      };
    }
  }

  /**
   * Extract parameters for research-analyst agent
   */
  extractResearchAnalystParams(
    context: ExtractionContext
  ): ExtractionResult<ResearchAnalystInput> {
    // Similar implementation...
  }

  /**
   * Generic skill parameter extraction
   */
  extractSkillParams<T>(
    skillName: string,
    schema: z.ZodSchema<T>,
    context: ExtractionContext
  ): ExtractionResult<T> {
    // Map entities to schema fields based on skill requirements
  }

  private identifyMissingFields(error: z.ZodError): string[] {
    return error.errors
      .filter(e => e.code === 'invalid_type' && e.received === 'undefined')
      .map(e => e.path.join('.'));
  }
}
```

### 4.4 Entity-to-Parameter Mapping Table

| Entity Type | Possible Values | Target Parameters |
|-------------|----------------|-------------------|
| `emotions` | joy, anger, sadness, fear, surprise, disgust, love, trust, anticipation, confusion | `emotions` array |
| `skipRhetoric` | true/false | `skipRhetoric` |
| `forceRhetoric` | true/false | `forceRhetoric` |
| `skipSentiment` | true/false | `skipSentiment` |
| `includeQuotes` | true/false | `includeQuotes` |
| `maxSpeakers` | 1-10 | `maxSpeakers` |
| `segmentationMethod` | sentence, paragraph, sliding, speaker_turn | `segmentationMethod` |
| `documentReference` | current, previous, by-name | Resolves to document in context |

### 4.5 Default Values

When parameters are not specified by the user:

| Parameter | Default Value | Rationale |
|-----------|--------------|-----------|
| `exemplarStorePath` | `./data/exemplars/starter.json` | Standard exemplar set |
| `emotions` | `null` (analyze all) | Comprehensive analysis |
| `skipRhetoric` | `false` | Let agent decide based on document |
| `forceRhetoric` | `false` | Let agent decide based on document |
| `includeQuotes` | `true` | More informative output |
| `maxSpeakers` | `5` | Reasonable limit |
| `segmentationMethod` | `sentence` | Fine-grained analysis |

---

## 5. Conversation Context Service

### 5.1 Purpose

Maintain state across conversation turns to enable multi-turn interactions, document references, and contextual understanding.

### 5.2 Context Data Model

```typescript
// Location: /src/nlp/services/conversationContext.ts

export interface ConversationContext {
  /** Unique session identifier */
  sessionId: string;

  /** When session started */
  startedAt: Date;

  /** Last activity timestamp */
  lastActivityAt: Date;

  /** Conversation history (limited to last N turns) */
  history: ConversationTurn[];

  /** Currently active document (most recently uploaded/analyzed) */
  currentDocument?: DocumentReference;

  /** Previously analyzed documents (for "that document" references) */
  documentHistory: DocumentReference[];

  /** Pending file awaiting processing */
  pendingFile?: PendingFile;

  /** Last execution result (for follow-up questions) */
  lastResult?: ExecutionResult;

  /** Pending clarification (waiting for user response) */
  pendingClarification?: PendingClarification;

  /** User preferences learned during session */
  preferences: UserPreferences;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: ClassifiedIntent;
  executionId?: string;
}

export interface DocumentReference {
  id: string;
  filename: string;
  mimetype: string;
  text: string;
  uploadedAt: Date;
  wordCount: number;
  lastAnalyzedAt?: Date;
  analysisResults?: Map<string, ExecutionResult>;
}

export interface PendingFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  uploadedAt: Date;
}

export interface ExecutionResult {
  type: 'agent' | 'skill';
  name: string;
  executionId: string;
  success: boolean;
  data: unknown;
  timestamp: Date;
}

export interface PendingClarification {
  type: 'missing_file' | 'missing_params' | 'ambiguous_intent' | 'confirmation';
  originalIntent: ClassifiedIntent;
  question: string;
  options?: string[];
  expiresAt: Date;
}

export interface UserPreferences {
  preferredEmotions?: string[];
  defaultIncludeRhetoric?: boolean;
  verbosityLevel?: 'brief' | 'normal' | 'detailed';
}
```

### 5.3 Context Manager Implementation

```typescript
// Location: /src/nlp/services/contextManager.ts

export interface ContextManagerConfig {
  maxHistoryTurns: number;        // Default: 20
  maxDocumentHistory: number;     // Default: 5
  sessionTimeoutMs: number;       // Default: 30 minutes
  clarificationTimeoutMs: number; // Default: 5 minutes
}

export class ContextManager {
  private sessions: Map<string, ConversationContext> = new Map();
  private config: ContextManagerConfig;

  constructor(config?: Partial<ContextManagerConfig>) {
    this.config = {
      maxHistoryTurns: config?.maxHistoryTurns ?? 20,
      maxDocumentHistory: config?.maxDocumentHistory ?? 5,
      sessionTimeoutMs: config?.sessionTimeoutMs ?? 30 * 60 * 1000,
      clarificationTimeoutMs: config?.clarificationTimeoutMs ?? 5 * 60 * 1000,
    };
  }

  /**
   * Get or create a session context
   */
  getContext(sessionId: string): ConversationContext {
    let context = this.sessions.get(sessionId);

    if (!context || this.isExpired(context)) {
      context = this.createContext(sessionId);
      this.sessions.set(sessionId, context);
    }

    context.lastActivityAt = new Date();
    return context;
  }

  /**
   * Add a conversation turn
   */
  addTurn(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    intent?: ClassifiedIntent,
    executionId?: string
  ): void {
    const context = this.getContext(sessionId);

    context.history.push({
      role,
      content,
      timestamp: new Date(),
      intent,
      executionId,
    });

    // Trim history if needed
    if (context.history.length > this.config.maxHistoryTurns) {
      context.history = context.history.slice(-this.config.maxHistoryTurns);
    }
  }

  /**
   * Set pending file for processing
   */
  setPendingFile(
    sessionId: string,
    buffer: Buffer,
    filename: string,
    mimetype: string
  ): void {
    const context = this.getContext(sessionId);
    context.pendingFile = {
      buffer,
      filename,
      mimetype,
      uploadedAt: new Date(),
    };
  }

  /**
   * Consume pending file (move to current document after parsing)
   */
  consumePendingFile(sessionId: string, text: string): DocumentReference {
    const context = this.getContext(sessionId);
    const pending = context.pendingFile;

    if (!pending) {
      throw new Error('No pending file to consume');
    }

    const docRef: DocumentReference = {
      id: crypto.randomUUID().slice(0, 8),
      filename: pending.filename,
      mimetype: pending.mimetype,
      text,
      uploadedAt: pending.uploadedAt,
      wordCount: text.split(/\s+/).length,
    };

    // Move current to history
    if (context.currentDocument) {
      context.documentHistory.unshift(context.currentDocument);
      if (context.documentHistory.length > this.config.maxDocumentHistory) {
        context.documentHistory.pop();
      }
    }

    context.currentDocument = docRef;
    context.pendingFile = undefined;

    return docRef;
  }

  /**
   * Resolve a document reference from user language
   */
  resolveDocumentReference(
    sessionId: string,
    reference: 'current' | 'previous' | string
  ): DocumentReference | undefined {
    const context = this.getContext(sessionId);

    if (reference === 'current') {
      return context.currentDocument;
    }

    if (reference === 'previous') {
      return context.documentHistory[0];
    }

    // Search by filename
    if (context.currentDocument?.filename.includes(reference)) {
      return context.currentDocument;
    }

    return context.documentHistory.find(d => d.filename.includes(reference));
  }

  /**
   * Store execution result for follow-up questions
   */
  setLastResult(sessionId: string, result: ExecutionResult): void {
    const context = this.getContext(sessionId);
    context.lastResult = result;

    // Also store in document's analysis results
    if (context.currentDocument) {
      if (!context.currentDocument.analysisResults) {
        context.currentDocument.analysisResults = new Map();
      }
      context.currentDocument.analysisResults.set(result.name, result);
      context.currentDocument.lastAnalyzedAt = new Date();
    }
  }

  /**
   * Set pending clarification
   */
  setPendingClarification(
    sessionId: string,
    clarification: Omit<PendingClarification, 'expiresAt'>
  ): void {
    const context = this.getContext(sessionId);
    context.pendingClarification = {
      ...clarification,
      expiresAt: new Date(Date.now() + this.config.clarificationTimeoutMs),
    };
  }

  /**
   * Clear pending clarification
   */
  clearPendingClarification(sessionId: string): PendingClarification | undefined {
    const context = this.getContext(sessionId);
    const pending = context.pendingClarification;
    context.pendingClarification = undefined;
    return pending;
  }

  /**
   * Clear entire session
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private createContext(sessionId: string): ConversationContext {
    return {
      sessionId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      history: [],
      documentHistory: [],
      preferences: {},
    };
  }

  private isExpired(context: ConversationContext): boolean {
    const elapsed = Date.now() - context.lastActivityAt.getTime();
    return elapsed > this.config.sessionTimeoutMs;
  }
}
```

### 5.4 Reference Resolution Examples

| User Says | Resolution Logic |
|-----------|-----------------|
| "Analyze this" | Use `pendingFile` if exists, else `currentDocument` |
| "What about the previous document?" | Use `documentHistory[0]` |
| "Analyze report.pdf again" | Search `currentDocument` and `documentHistory` by filename |
| "What was the sentiment?" | Retrieve from `lastResult` or `currentDocument.analysisResults` |
| "Focus on anger this time" | Re-run last analysis with updated parameters |

---

## 6. Response Formatter

### 6.1 Purpose

Transform structured `AgentResult` and `SkillResult` objects into natural language responses suitable for conversational display.

### 6.2 Response Types

```typescript
// Location: /src/nlp/services/responseFormatter.ts

export interface FormattedResponse {
  /** Primary conversational message */
  message: string;

  /** Structured data for UI rendering (optional) */
  data?: {
    type: 'sentiment' | 'rhetoric' | 'metadata' | 'research' | 'error';
    payload: unknown;
  };

  /** Suggested follow-up actions */
  suggestions?: string[];

  /** Progress updates (for streaming) */
  progress?: {
    currentStep: string;
    stepsCompleted: number;
    totalSteps: number;
  };
}

export type VerbosityLevel = 'brief' | 'normal' | 'detailed';
```

### 6.3 Response Templates

#### 6.3.1 Content Analysis Response

```typescript
const contentAnalysisTemplate = {
  brief: (result: ContentAnalysisOutput) => `
The document has a **${result.sentiment?.sentiment || 'neutral'}** tone
(${Math.round((result.sentiment?.confidence || 0) * 100)}% confidence).
${result.synthesis.summary}
  `.trim(),

  normal: (result: ContentAnalysisOutput) => `
## Analysis Complete

**Document:** ${result.document.filename} (${result.document.wordCount} words)

### Sentiment
- **Overall:** ${result.sentiment?.sentiment} (${Math.round((result.sentiment?.confidence || 0) * 100)}% confidence)
- **Key Indicators:** ${result.sentiment?.indicators.slice(0, 3).join(', ')}

${result.rhetoric ? `### Rhetoric
- **Top Moves:** ${result.rhetoric.summary.topMoves.slice(0, 3).map(([move, count]) => `${move} (${count})`).join(', ')}
- **Classification Rate:** ${Math.round(result.rhetoric.summary.classificationRate * 100)}%
` : ''}

### Summary
${result.synthesis.summary}

**Key Findings:**
${result.synthesis.keyFindings.map(f => `- ${f}`).join('\n')}
  `.trim(),

  detailed: (result: ContentAnalysisOutput) => {
    // Full detailed output including all segments, emotions, etc.
  },
};
```

#### 6.3.2 Research Analyst Response

```typescript
const researchAnalystTemplate = {
  brief: (result: ResearchAnalystOutput) => `
Analyzed **${result.speakers?.length || 0} speakers** in this ${result.document.isDialogic ? 'dialogue' : 'document'}.
${result.report.executiveSummary}
  `.trim(),

  normal: (result: ResearchAnalystOutput) => `
## Research Analysis Complete

**Document:** ${result.document.filename}
**Type:** ${result.document.isDialogic ? 'Dialogue' : 'Monologue'}
**Speakers Identified:** ${result.speakers?.length || 0}

### Executive Summary
${result.report.executiveSummary}

### Speaker Analysis
${result.speakers?.map(s => `
**${s.speaker}** (${s.wordCount} words)
- Sentiment: ${s.sentiment?.sentiment} (${Math.round((s.sentiment?.confidence || 0) * 100)}%)
${s.notableQuotes?.length ? `- Notable: "${s.notableQuotes[0]}"` : ''}
`).join('\n')}

### Key Findings
${result.report.keyFindings.map(f => `- ${f}`).join('\n')}
  `.trim(),
};
```

#### 6.3.3 Error Response

```typescript
const errorTemplate = (error: { code: string; message: string; details?: unknown }) => `
I encountered an issue: **${error.message}**

${error.code === 'MISSING_FILE' ? 'Please upload a document to analyze.' : ''}
${error.code === 'PARSE_ERROR' ? 'I had trouble reading the file. Is it a valid PDF, DOCX, or text file?' : ''}
${error.code === 'API_ERROR' ? 'There was a problem with the analysis service. Please try again.' : ''}
`.trim();
```

#### 6.3.4 Clarification Response

```typescript
const clarificationTemplate = {
  missingFile: () => `
I'd be happy to help analyze a document. Could you please upload a file (PDF, DOCX, or text)?
  `.trim(),

  ambiguousIntent: (options: string[]) => `
I want to make sure I understand what you're looking for. Did you mean:
${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}
  `.trim(),

  missingParams: (params: string[]) => `
I need a bit more information. Could you specify: ${params.join(', ')}?
  `.trim(),
};
```

### 6.4 Response Formatter Implementation

```typescript
// Location: /src/nlp/services/responseFormatter.ts

export class ResponseFormatter {
  private verbosity: VerbosityLevel = 'normal';

  setVerbosity(level: VerbosityLevel): void {
    this.verbosity = level;
  }

  /**
   * Format an agent result
   */
  formatAgentResult(
    agentName: string,
    result: AgentResult<unknown>
  ): FormattedResponse {
    if (!result.success) {
      return this.formatError(result.error!);
    }

    switch (agentName) {
      case 'content-analysis':
        return this.formatContentAnalysis(result.data as ContentAnalysisOutput);
      case 'research-analyst':
        return this.formatResearchAnalyst(result.data as ResearchAnalystOutput);
      default:
        return this.formatGenericResult(result);
    }
  }

  /**
   * Format a skill result
   */
  formatSkillResult(
    skillName: string,
    result: SkillResult<unknown>
  ): FormattedResponse {
    if (!result.success) {
      return this.formatError(result.error!);
    }

    switch (skillName) {
      case 'sentiment-analyzer':
        return this.formatSentimentResult(result.data as SentimentAnalyzerOutput);
      case 'document-metadata':
        return this.formatMetadataResult(result.data as DocumentMetadataOutput);
      case 'rhetoric-analyzer':
        return this.formatRhetoricResult(result.data as RhetoricAnalyzerOutput);
      default:
        return this.formatGenericResult(result);
    }
  }

  /**
   * Format progress update during execution
   */
  formatProgress(context: AgentContext): FormattedResponse {
    const currentStep = context.steps[context.currentStepIndex];
    const completed = context.steps.filter(s =>
      s.status === 'completed' || s.status === 'skipped'
    ).length;

    return {
      message: `Working on: ${currentStep?.name || 'processing'}...`,
      progress: {
        currentStep: currentStep?.name || 'processing',
        stepsCompleted: completed,
        totalSteps: context.steps.length,
      },
    };
  }

  /**
   * Format clarification request
   */
  formatClarification(clarification: PendingClarification): FormattedResponse {
    return {
      message: clarification.question,
      suggestions: clarification.options,
    };
  }

  /**
   * Generate follow-up suggestions
   */
  generateSuggestions(
    agentName: string,
    result: unknown,
    context: ConversationContext
  ): string[] {
    const suggestions: string[] = [];

    if (agentName === 'content-analysis') {
      const data = result as ContentAnalysisOutput;
      if (!data.rhetoric) {
        suggestions.push('Analyze rhetoric patterns');
      }
      if (data.document.isDialogic) {
        suggestions.push('Analyze by speaker');
      }
      suggestions.push('Focus on specific emotions');
    }

    if (agentName === 'research-analyst') {
      suggestions.push('Compare specific speakers');
      suggestions.push('Show more quotes');
    }

    return suggestions;
  }

  private formatContentAnalysis(data: ContentAnalysisOutput): FormattedResponse {
    const template = contentAnalysisTemplate[this.verbosity];
    return {
      message: template(data),
      data: { type: 'sentiment', payload: data },
      suggestions: this.generateSuggestions('content-analysis', data, {} as ConversationContext),
    };
  }

  // ... other format methods
}
```

---

## 7. Unified NLP Gateway

### 7.1 Purpose

Orchestrate all NLP components and provide a single entry point for natural language queries.

### 7.2 Gateway Implementation

```typescript
// Location: /src/nlp/gateway.ts

import { IntentClassifier } from './services/intentClassifier.js';
import { ParameterExtractor } from './services/parameterExtractor.js';
import { ContextManager } from './services/contextManager.js';
import { ResponseFormatter } from './services/responseFormatter.js';
import { getAgent } from '../agents/registry.js';
import { getSkill } from '../skills/registry.js';

export interface NLPQuery {
  sessionId: string;
  message: string;
  file?: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  };
}

export interface NLPResponse {
  sessionId: string;
  message: string;
  data?: unknown;
  suggestions?: string[];
  progress?: {
    currentStep: string;
    stepsCompleted: number;
    totalSteps: number;
  };
  requiresInput?: {
    type: 'file' | 'text' | 'choice';
    prompt: string;
    options?: string[];
  };
}

export class NLPGateway {
  private intentClassifier: IntentClassifier;
  private paramExtractor: ParameterExtractor;
  private contextManager: ContextManager;
  private responseFormatter: ResponseFormatter;

  constructor() {
    this.intentClassifier = new IntentClassifier();
    this.paramExtractor = new ParameterExtractor();
    this.contextManager = new ContextManager();
    this.responseFormatter = new ResponseFormatter();
  }

  /**
   * Process a natural language query
   */
  async query(input: NLPQuery): Promise<NLPResponse> {
    const context = this.contextManager.getContext(input.sessionId);

    // Handle file upload
    if (input.file) {
      this.contextManager.setPendingFile(
        input.sessionId,
        input.file.buffer,
        input.file.filename,
        input.file.mimetype
      );
    }

    // Record user turn
    this.contextManager.addTurn(input.sessionId, 'user', input.message);

    // Check for pending clarification response
    const pendingClarification = context.pendingClarification;
    if (pendingClarification && !this.isExpired(pendingClarification)) {
      return this.handleClarificationResponse(input, pendingClarification);
    }

    // Classify intent
    const classified = await this.intentClassifier.classify(
      input.message,
      context
    );

    // Handle based on intent type
    let response: NLPResponse;

    switch (classified.intent.type) {
      case 'agent':
        response = await this.executeAgent(input.sessionId, classified, context);
        break;
      case 'skill':
        response = await this.executeSkill(input.sessionId, classified, context);
        break;
      case 'system':
        response = await this.handleSystemIntent(input.sessionId, classified);
        break;
      case 'unknown':
        response = this.handleUnknownIntent(input.sessionId, classified);
        break;
      default:
        response = this.handleUnknownIntent(input.sessionId, classified);
    }

    // Record assistant turn
    this.contextManager.addTurn(input.sessionId, 'assistant', response.message);

    return response;
  }

  /**
   * Execute an agent based on classified intent
   */
  private async executeAgent(
    sessionId: string,
    classified: ClassifiedIntent,
    context: ConversationContext
  ): Promise<NLPResponse> {
    const agent = getAgent(classified.intent.target);

    if (!agent) {
      return {
        sessionId,
        message: `I don't recognize the agent "${classified.intent.target}".`,
      };
    }

    // Check if file is required
    if (classified.requiresFile && !context.pendingFile && !context.currentDocument) {
      this.contextManager.setPendingClarification(sessionId, {
        type: 'missing_file',
        originalIntent: classified,
        question: 'Please upload a document to analyze.',
      });

      return {
        sessionId,
        message: 'I\'d be happy to analyze a document for you. Please upload a file (PDF, DOCX, or text).',
        requiresInput: { type: 'file', prompt: 'Upload a document' },
      };
    }

    // Extract parameters
    const extractionContext = {
      entities: classified.entities,
      conversationContext: context,
      pendingFile: context.pendingFile,
    };

    const extraction = classified.intent.target === 'content-analysis'
      ? this.paramExtractor.extractContentAnalysisParams(extractionContext)
      : this.paramExtractor.extractResearchAnalystParams(extractionContext);

    if (!extraction.success) {
      return {
        sessionId,
        message: `I need more information: ${extraction.missing?.join(', ')}`,
        requiresInput: { type: 'text', prompt: extraction.missing?.join(', ') || '' },
      };
    }

    // Execute agent
    try {
      const result = await agent.execute(extraction.params!, {
        onStepComplete: (step) => {
          // Could emit progress events here for streaming
        },
      });

      // Store result
      this.contextManager.setLastResult(sessionId, {
        type: 'agent',
        name: classified.intent.target,
        executionId: result.metadata.executionId,
        success: result.success,
        data: result.data,
        timestamp: new Date(),
      });

      // Consume pending file if used
      if (context.pendingFile && extraction.params?.buffer) {
        const text = (result.data as any)?.document?.text ||
                     (result.context.state as any)?.text;
        if (text) {
          this.contextManager.consumePendingFile(sessionId, text);
        }
      }

      // Format response
      const formatted = this.responseFormatter.formatAgentResult(
        classified.intent.target,
        result
      );

      return {
        sessionId,
        message: formatted.message,
        data: formatted.data,
        suggestions: formatted.suggestions,
      };

    } catch (error) {
      return {
        sessionId,
        message: `I encountered an error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Execute a skill based on classified intent
   */
  private async executeSkill(
    sessionId: string,
    classified: ClassifiedIntent,
    context: ConversationContext
  ): Promise<NLPResponse> {
    // Similar to executeAgent but for skills
    const skill = getSkill(classified.intent.target);

    if (!skill) {
      return {
        sessionId,
        message: `I don't recognize the skill "${classified.intent.target}".`,
      };
    }

    // ... parameter extraction and execution
  }

  /**
   * Handle system intents (help, status, etc.)
   */
  private async handleSystemIntent(
    sessionId: string,
    classified: ClassifiedIntent
  ): Promise<NLPResponse> {
    switch (classified.intent.target) {
      case 'help':
        return {
          sessionId,
          message: this.getHelpMessage(),
          suggestions: ['Analyze a document', 'Check server status', 'List capabilities'],
        };

      case 'status':
        return {
          sessionId,
          message: 'The Writer\'s Portal is running and ready to analyze documents.',
        };

      case 'capabilities':
        const agents = getAllAgentMetadata();
        const skills = getAllSkillMetadata();
        return {
          sessionId,
          message: `
## Available Capabilities

### Agents
${agents.map(a => `- **${a.name}**: ${a.description}`).join('\n')}

### Skills
${skills.map(s => `- **${s.name}**: ${s.description}`).join('\n')}
          `.trim(),
        };

      case 'clear':
        this.contextManager.clearSession(sessionId);
        return {
          sessionId,
          message: 'Session cleared. Ready to start fresh!',
        };

      default:
        return {
          sessionId,
          message: 'I\'m not sure how to help with that.',
        };
    }
  }

  /**
   * Handle unknown or low-confidence intents
   */
  private handleUnknownIntent(
    sessionId: string,
    classified: ClassifiedIntent
  ): NLPResponse {
    if (classified.requiresClarification.needed) {
      this.contextManager.setPendingClarification(sessionId, {
        type: 'ambiguous_intent',
        originalIntent: classified,
        question: classified.requiresClarification.question!,
        options: classified.requiresClarification.options || undefined,
      });

      return {
        sessionId,
        message: classified.requiresClarification.question!,
        requiresInput: {
          type: 'choice',
          prompt: classified.requiresClarification.question!,
          options: classified.requiresClarification.options || undefined,
        },
      };
    }

    return {
      sessionId,
      message: 'I\'m not sure what you\'d like me to do. You can ask me to analyze documents for sentiment, rhetoric, or research speakers in dialogues.',
      suggestions: ['Analyze document sentiment', 'Research transcript speakers', 'What can you do?'],
    };
  }

  private getHelpMessage(): string {
    return `
# Writer's Portal Assistant

I can help you analyze documents in several ways:

## Content Analysis
Upload a document and I'll analyze its sentiment, emotions, and rhetorical patterns.
- "Analyze this document"
- "What's the tone of this text?"
- "Check for anger and sadness"

## Research Analysis
For dialogues and transcripts, I can analyze each speaker separately.
- "Analyze this transcript"
- "Who said what in this dialogue?"
- "Compare the speakers"

## Quick Commands
- "What can you do?" - See all capabilities
- "Status" - Check system health
- "Clear" - Start a new conversation

Just upload a document and tell me what you'd like to know!
    `.trim();
  }

  private isExpired(clarification: PendingClarification): boolean {
    return new Date() > clarification.expiresAt;
  }

  private handleClarificationResponse(
    input: NLPQuery,
    clarification: PendingClarification
  ): Promise<NLPResponse> {
    // Handle user's response to a clarification request
    this.contextManager.clearPendingClarification(input.sessionId);

    // Re-classify with additional context
    // ...
  }
}
```

### 7.3 Gateway API Endpoints

```typescript
// Location: /src/api/nlpRoutes.ts

import { Router } from 'express';
import multer from 'multer';
import { NLPGateway } from '../nlp/gateway.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const gateway = new NLPGateway();

/**
 * POST /api/nlp/query
 *
 * Main NLP endpoint for conversational queries
 */
router.post('/query', upload.single('file'), async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'sessionId and message are required' }
      });
    }

    const query: NLPQuery = {
      sessionId,
      message,
    };

    if (req.file) {
      query.file = {
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
      };
    }

    const response = await gateway.query(query);
    res.json(response);

  } catch (error) {
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: (error as Error).message }
    });
  }
});

/**
 * POST /api/nlp/query/stream
 *
 * Streaming endpoint for real-time progress updates
 */
router.post('/query/stream', upload.single('file'), async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Implementation with Server-Sent Events
  // ...
});

/**
 * GET /api/nlp/session/:sessionId
 *
 * Get session context (for debugging/admin)
 */
router.get('/session/:sessionId', (req, res) => {
  // Return session context
});

/**
 * DELETE /api/nlp/session/:sessionId
 *
 * Clear a session
 */
router.delete('/session/:sessionId', (req, res) => {
  gateway.clearSession(req.params.sessionId);
  res.json({ success: true });
});

export default router;
```

---

## 8. Chat UI Specification

### 8.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Writer's Portal Chat                                    [?] [×]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Welcome! I can help you analyze documents for sentiment, │   │
│  │ rhetoric, and speaker dynamics. Upload a file or paste  │   │
│  │ text to get started.                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📎 report.pdf uploaded                              [×] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                         [User] │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Analyze this document for sentiment, focusing on anger  │   │
│  │ and fear                                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Assistant]                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ## Analysis Complete                                     │   │
│  │                                                          │   │
│  │ **Document:** report.pdf (2,450 words)                   │   │
│  │                                                          │   │
│  │ ### Sentiment                                            │   │
│  │ - **Overall:** Negative (78% confidence)                 │   │
│  │ - **Anger:** 0.65 | **Fear:** 0.42                       │   │
│  │                                                          │   │
│  │ ### Key Findings                                         │   │
│  │ - Strong frustration in paragraphs 3-5                   │   │
│  │ - Fear indicators around financial projections           │   │
│  │                                                          │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ 📊 View Full Analysis  │  📝 Show Rhetoric          │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │ Suggested:                                │                  │
│  │ [Analyze rhetoric] [Compare speakers] [?]│                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐ [📎] │
│  │ Type a message...                                     │ [➤] │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Component Specifications

#### 8.2.1 Message Input

```typescript
interface MessageInputProps {
  onSend: (message: string) => void;
  onFileSelect: (file: File) => void;
  disabled: boolean;
  placeholder: string;
}

// Features:
// - Multi-line text input (auto-expand)
// - File attachment button
// - Send button (Enter to send, Shift+Enter for newline)
// - Disabled state during processing
```

#### 8.2.2 Message Bubble

```typescript
interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;                    // Markdown content
  timestamp: Date;
  attachments?: FileAttachment[];
  data?: StructuredData;              // For expandable analysis results
  suggestions?: string[];             // Quick action buttons
  progress?: ProgressIndicator;       // For in-progress messages
}

interface FileAttachment {
  filename: string;
  mimetype: string;
  size: number;
}

interface StructuredData {
  type: 'sentiment' | 'rhetoric' | 'metadata' | 'research';
  payload: unknown;
  expandable: boolean;
}

interface ProgressIndicator {
  currentStep: string;
  stepsCompleted: number;
  totalSteps: number;
  showSpinner: boolean;
}
```

#### 8.2.3 Suggestion Chips

```typescript
interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

// Display as horizontal scrollable row of clickable chips
// Clicking sends the suggestion as user message
```

#### 8.2.4 File Upload Handler

```typescript
interface FileUploadProps {
  onUpload: (file: File) => void;
  accept: string[];  // ['.pdf', '.docx', '.txt', '.md']
  maxSize: number;   // 10MB
}

// Features:
// - Drag & drop zone
// - Click to browse
// - File type validation
// - Size validation
// - Upload progress indicator
```

#### 8.2.5 Analysis Visualization

```typescript
interface AnalysisVisualizationProps {
  type: 'sentiment' | 'rhetoric' | 'speakers';
  data: unknown;
  expanded: boolean;
  onToggle: () => void;
}

// Sentiment: Gauge chart + emotion bars
// Rhetoric: Move distribution pie chart + segment list
// Speakers: Speaker comparison cards + quote highlights
```

### 8.3 State Management

```typescript
interface ChatState {
  sessionId: string;
  messages: Message[];
  pendingFile: File | null;
  isLoading: boolean;
  error: string | null;
  suggestions: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  data?: StructuredData;
  progress?: ProgressIndicator;
}

// Actions:
// - sendMessage(text: string)
// - uploadFile(file: File)
// - selectSuggestion(suggestion: string)
// - clearChat()
// - retryLastMessage()
```

### 8.4 API Integration

```typescript
// Location: /public/chat.js

class ChatClient {
  constructor(baseUrl = '/api/nlp') {
    this.baseUrl = baseUrl;
    this.sessionId = this.getOrCreateSessionId();
  }

  async sendMessage(message: string, file?: File): Promise<NLPResponse> {
    const formData = new FormData();
    formData.append('sessionId', this.sessionId);
    formData.append('message', message);

    if (file) {
      formData.append('file', file);
    }

    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      body: formData,
    });

    return response.json();
  }

  async streamMessage(message: string, file?: File): AsyncGenerator<NLPResponse> {
    // SSE implementation for streaming responses
  }

  clearSession(): void {
    fetch(`${this.baseUrl}/session/${this.sessionId}`, { method: 'DELETE' });
    this.sessionId = crypto.randomUUID();
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('chatSessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('chatSessionId', sessionId);
    }
    return sessionId;
  }
}
```

---

## 9. API Contracts

### 9.1 OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: Writer's Portal NLP API
  version: 1.0.0
  description: Natural Language Processing interface for Writer's Portal

paths:
  /api/nlp/query:
    post:
      summary: Process a natural language query
      operationId: nlpQuery
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - sessionId
                - message
              properties:
                sessionId:
                  type: string
                  format: uuid
                  description: Unique session identifier
                message:
                  type: string
                  description: Natural language query
                file:
                  type: string
                  format: binary
                  description: Optional file to analyze
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NLPResponse'
        '400':
          description: Invalid request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/nlp/query/stream:
    post:
      summary: Stream a natural language query response
      operationId: nlpQueryStream
      requestBody:
        $ref: '#/paths/~1api~1nlp~1query/post/requestBody'
      responses:
        '200':
          description: Server-Sent Events stream
          content:
            text/event-stream:
              schema:
                type: string

  /api/nlp/session/{sessionId}:
    get:
      summary: Get session context
      operationId: getSession
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Session context
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionContext'
        '404':
          description: Session not found

    delete:
      summary: Clear session
      operationId: clearSession
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Session cleared
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean

components:
  schemas:
    NLPResponse:
      type: object
      required:
        - sessionId
        - message
      properties:
        sessionId:
          type: string
          format: uuid
        message:
          type: string
          description: Natural language response
        data:
          type: object
          description: Structured analysis data
          properties:
            type:
              type: string
              enum: [sentiment, rhetoric, metadata, research, error]
            payload:
              type: object
        suggestions:
          type: array
          items:
            type: string
          description: Suggested follow-up actions
        progress:
          type: object
          properties:
            currentStep:
              type: string
            stepsCompleted:
              type: integer
            totalSteps:
              type: integer
        requiresInput:
          type: object
          properties:
            type:
              type: string
              enum: [file, text, choice]
            prompt:
              type: string
            options:
              type: array
              items:
                type: string

    SessionContext:
      type: object
      properties:
        sessionId:
          type: string
        startedAt:
          type: string
          format: date-time
        lastActivityAt:
          type: string
          format: date-time
        messageCount:
          type: integer
        currentDocument:
          type: object
          properties:
            filename:
              type: string
            wordCount:
              type: integer
        hasResults:
          type: boolean

    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
```

---

## 10. Implementation Phases

### Phase 1: Core NLP Infrastructure

**Goal:** Basic natural language query processing

**Components:**
- Intent Classifier (rule-based + Claude fallback)
- Parameter Extractor (content-analysis only)
- Basic Context Manager (single document)
- Response Formatter (content-analysis only)
- NLP Gateway (basic routing)

**Endpoints:**
- `POST /api/nlp/query` (basic)

**Deliverables:**
- Users can type "analyze this document" and get content-analysis results
- File upload works
- Basic error handling

### Phase 2: Full Agent Support

**Goal:** Support all agents with full parameter extraction

**Components:**
- Extended Parameter Extractor (all agents)
- Extended Response Formatter (all agents)
- Clarification handling
- System intents (help, status, capabilities)

**Endpoints:**
- Enhanced `/api/nlp/query`
- `GET /api/nlp/session/:id`

**Deliverables:**
- Research analyst support
- "What can you do?" works
- Missing parameter prompts

### Phase 3: Context & Memory

**Goal:** Multi-turn conversations with document memory

**Components:**
- Full Context Manager
- Document history
- Result caching
- Follow-up query handling

**Deliverables:**
- "Analyze it again with anger"
- "What about the previous document?"
- Session persistence

### Phase 4: Chat UI

**Goal:** Production-ready chat interface

**Components:**
- React/Vue/Vanilla chat component
- Markdown rendering
- File upload UI
- Progress indicators
- Suggestion chips
- Analysis visualizations

**Deliverables:**
- `/chat` route with full chat UI
- Mobile-responsive design
- Accessible (WCAG 2.1 AA)

### Phase 5: Streaming & Polish

**Goal:** Real-time feedback and production hardening

**Components:**
- SSE streaming endpoint
- Progress callbacks
- Error recovery
- Rate limiting
- Session cleanup

**Endpoints:**
- `POST /api/nlp/query/stream`

**Deliverables:**
- Real-time step progress in UI
- Graceful degradation
- Production-ready performance

---

## 11. Appendices

### Appendix A: Emotion Types

```typescript
type EmotionType =
  | 'joy'
  | 'anger'
  | 'sadness'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'love'
  | 'trust'
  | 'anticipation'
  | 'confusion';
```

### Appendix B: Example Conversations

#### B.1 Basic Document Analysis

```
User: [uploads report.pdf]
User: What's the sentiment of this document?
Assistant: I analyzed **report.pdf** and found:

## Analysis Complete

**Document:** report.pdf (2,450 words)

### Sentiment
- **Overall:** Negative (78% confidence)
- **Key Indicators:** concerning trends, significant challenges, declining metrics

### Key Findings
- Strong negative sentiment around financial projections
- Cautious tone throughout executive summary

Would you like me to analyze the rhetoric patterns as well?

---
[Suggestions: "Analyze rhetoric" | "Focus on specific emotions" | "Upload another document"]
```

#### B.2 Multi-Turn with Context

```
User: [uploads transcript.docx]
User: Who are the speakers and what are their positions?
Assistant: I found **3 speakers** in this transcript:

## Research Analysis Complete

**Document:** transcript.docx (Dialogue)
**Speakers Identified:** 3

### Speaker Analysis

**Dr. Sarah Chen** (1,245 words)
- Sentiment: Positive (82%)
- Role: Appears to be leading the discussion

**Michael Torres** (876 words)
- Sentiment: Neutral (65%)
- Role: Technical contributor

**Jennifer Walsh** (543 words)
- Sentiment: Negative (71%)
- Role: Raising concerns

Would you like me to compare their positions in detail?

User: Yes, and focus on the areas of disagreement
Assistant: Analyzing areas of disagreement between speakers...

### Comparison: Areas of Disagreement

**Topic: Budget Allocation**
- Dr. Chen: Advocates for increased R&D spending (positive framing)
- Jennifer Walsh: Concerned about financial sustainability (negative framing)
- Michael Torres: Suggests phased approach (neutral)

**Topic: Timeline**
- Dr. Chen: Optimistic about Q2 delivery
- Jennifer Walsh: Cites previous delays, skeptical
- Michael Torres: Provides technical constraints

The primary tension appears to be between Dr. Chen's optimism and Jennifer Walsh's risk-focused perspective.
```

#### B.3 Parameter Refinement

```
User: Analyze that document again but focus only on anger and fear
Assistant: Re-analyzing transcript.docx focusing on anger and fear...

## Focused Emotion Analysis

**Anger Indicators:** 0.34 (moderate)
- Found in Jennifer Walsh's statements about past failures
- Peak in paragraph 12: "...completely unacceptable delays..."

**Fear Indicators:** 0.52 (significant)
- Concentrated in discussion of market risks
- Dr. Chen shows fear around competitor moves
- Jennifer Walsh expresses fear about resource constraints

Would you like me to extract the specific quotes showing these emotions?
```

#### B.4 Clarification Flow

```
User: Analyze this
Assistant: I'd be happy to analyze something for you! Could you please upload a document (PDF, DOCX, or text file)?

User: [uploads memo.txt]
User: Go ahead
Assistant: I see you've uploaded memo.txt. What type of analysis would you like?

1. **Content Analysis** - Sentiment, emotions, and overall tone
2. **Research Analysis** - Speaker identification and comparison (for dialogues)
3. **Quick Sentiment** - Just the sentiment score

User: 1
Assistant: Running content analysis on memo.txt...
[proceeds with analysis]
```

---

### Appendix C: Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| `MISSING_FILE` | No file provided for analysis | "Please upload a document to analyze." |
| `UNSUPPORTED_FORMAT` | File type not supported | "I can only analyze PDF, DOCX, TXT, and MD files." |
| `PARSE_ERROR` | Failed to extract text | "I had trouble reading the file. Is it corrupted?" |
| `EMPTY_DOCUMENT` | Document has no text | "The document appears to be empty." |
| `TOO_LARGE` | Document exceeds size limit | "The document is too large. Maximum size is 10MB." |
| `API_ERROR` | Claude API error | "Analysis service temporarily unavailable." |
| `RATE_LIMITED` | Too many requests | "Please wait a moment before trying again." |
| `SESSION_EXPIRED` | Session timed out | "Your session expired. Starting fresh." |
| `INVALID_EMOTION` | Unknown emotion requested | "I don't recognize that emotion. Available: joy, anger, ..." |

---

### Appendix D: File Structure

```
/src/nlp/
  gateway.ts                    # Main NLP gateway
  /services/
    intentClassifier.ts         # Intent classification
    parameterExtractor.ts       # Parameter extraction
    contextManager.ts           # Conversation context
    responseFormatter.ts        # Response formatting
  /prompts/
    intentClassification.ts     # Claude prompts
    responseGeneration.ts
  /types/
    index.ts                    # Type definitions

/src/api/
  nlpRoutes.ts                  # API endpoints

/public/
  chat.html                     # Chat UI
  chat.js                       # Chat client
  /components/
    MessageBubble.js
    SuggestionChips.js
    FileUpload.js
    AnalysisVisualization.js
```

---

### Appendix E: Configuration Options

```typescript
// /src/nlp/config.ts

export const NLP_CONFIG = {
  // Intent Classification
  intent: {
    confidenceThreshold: 0.7,
    fallbackToAgent: true,
    model: 'claude-sonnet-4-20250514',
  },

  // Context Management
  context: {
    maxHistoryTurns: 20,
    maxDocumentHistory: 5,
    sessionTimeoutMs: 30 * 60 * 1000,      // 30 minutes
    clarificationTimeoutMs: 5 * 60 * 1000,  // 5 minutes
  },

  // Response Formatting
  response: {
    defaultVerbosity: 'normal' as const,
    maxSuggestions: 3,
  },

  // File Handling
  files: {
    maxSizeBytes: 10 * 1024 * 1024,  // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ],
  },
};
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | January 2026 | Writer's Portal Team | Initial specification |

---

*End of Specification*
