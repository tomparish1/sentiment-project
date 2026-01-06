import { z } from 'zod';

/**
 * Context Graph Trace Schemas
 *
 * Captures decision traces - the "why" behind actions, not just the "what".
 * Three types: source, creation, editorial
 */

// ============================================
// Base Trace Schema
// ============================================

export const TraceTypeSchema = z.enum(['source', 'creation', 'editorial']);
export type TraceType = z.infer<typeof TraceTypeSchema>;

export const BaseTraceSchema = z.object({
  id: z.string().uuid(),
  type: TraceTypeSchema,
  timestamp: z.string().datetime(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type BaseTrace = z.infer<typeof BaseTraceSchema>;

// ============================================
// Source Trace - RSS/Content Discovery Decisions
// ============================================

export const SourceTraceSchema = BaseTraceSchema.extend({
  type: z.literal('source'),

  // What was selected/rejected
  action: z.enum(['selected', 'rejected', 'bookmarked', 'archived']),
  sourceType: z.enum(['rss', 'article', 'paper', 'video', 'podcast', 'other']),

  // The source details
  source: z.object({
    title: z.string(),
    url: z.string().url().optional(),
    feedName: z.string().optional(),
    feedId: z.string().optional(),
    author: z.string().optional(),
    pubDate: z.string().optional(),
  }),

  // The decision context
  reason: z.string().min(1), // WHY you selected/rejected
  alternatives: z
    .array(
      z.object({
        title: z.string(),
        reason: z.string(), // Why rejected
      })
    )
    .optional(),

  // Connections
  crossReferences: z.array(z.string()).optional(), // Links to related sources
  relatedTraceIds: z.array(z.string().uuid()).optional(),

  // Quality signal
  qualitySignal: z
    .object({
      feedUseful: z.boolean().optional(),
      wouldRecommend: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export type SourceTrace = z.infer<typeof SourceTraceSchema>;

// ============================================
// Creation Trace - LLM Output Selection Decisions
// ============================================

export const CreationTraceSchema = BaseTraceSchema.extend({
  type: z.literal('creation'),

  // What task was being done
  task: z.string(), // What you asked the LLM to do

  // The comparison context
  comparison: z.object({
    comparisonId: z.string().optional(), // Link to /api/compare history
    modelsCompared: z.array(z.string()),
    promptUsed: z.string(),
    systemPrompt: z.string().optional(),
  }),

  // The selection
  selection: z.object({
    provider: z.string(),
    model: z.string(),
    reason: z.string(), // WHY this output was chosen
  }),

  // What was rejected and why
  rejections: z
    .array(
      z.object({
        provider: z.string(),
        model: z.string(),
        reason: z.string(),
      })
    )
    .optional(),

  // Modifications made to selected output
  modifications: z
    .object({
      made: z.boolean(),
      description: z.string().optional(),
      examples: z.array(z.string()).optional(),
    })
    .optional(),

  // Reuse signal
  reuseValue: z
    .object({
      promptReusable: z.boolean(),
      promptPattern: z.string().optional(), // e.g., "explain-for-audience"
      notes: z.string().optional(),
    })
    .optional(),
});

export type CreationTrace = z.infer<typeof CreationTraceSchema>;

// ============================================
// Editorial Trace - Writing/Editing Decisions
// ============================================

export const EditorialCategorySchema = z.enum([
  'structure',
  'voice',
  'cut',
  'addition',
  'framing',
  'tone',
  'clarity',
  'pacing',
  'other',
]);

export type EditorialCategory = z.infer<typeof EditorialCategorySchema>;

export const EditorialTraceSchema = BaseTraceSchema.extend({
  type: z.literal('editorial'),

  // The decision
  decision: z.string(), // What you decided to do
  category: EditorialCategorySchema,

  // Context
  section: z.string().optional(), // Which section/chapter
  beforeSnapshot: z.string().optional(), // Text before (for diffs)
  afterSnapshot: z.string().optional(), // Text after

  // The reasoning
  reason: z.string(), // WHY this decision
  alternatives: z
    .array(
      z.object({
        description: z.string(),
        whyRejected: z.string(),
      })
    )
    .optional(),

  // Precedent
  precedent: z
    .object({
      traceId: z.string().uuid().optional(),
      projectId: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),

  // Outcome tracking (can be updated later)
  outcome: z
    .object({
      effective: z.boolean().optional(),
      feedback: z.string().optional(),
      revisedAt: z.string().datetime().optional(),
    })
    .optional(),
});

export type EditorialTrace = z.infer<typeof EditorialTraceSchema>;

// ============================================
// Union Type for All Traces
// ============================================

export const TraceSchema = z.discriminatedUnion('type', [
  SourceTraceSchema,
  CreationTraceSchema,
  EditorialTraceSchema,
]);

export type Trace = z.infer<typeof TraceSchema>;

// ============================================
// Input Schemas (for creating traces)
// ============================================

export const CreateSourceTraceInputSchema = SourceTraceSchema.omit({
  id: true,
  timestamp: true,
}).extend({
  id: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
});

export type CreateSourceTraceInput = z.infer<typeof CreateSourceTraceInputSchema>;

export const CreateCreationTraceInputSchema = CreationTraceSchema.omit({
  id: true,
  timestamp: true,
}).extend({
  id: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
});

export type CreateCreationTraceInput = z.infer<typeof CreateCreationTraceInputSchema>;

export const CreateEditorialTraceInputSchema = EditorialTraceSchema.omit({
  id: true,
  timestamp: true,
}).extend({
  id: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
});

export type CreateEditorialTraceInput = z.infer<typeof CreateEditorialTraceInputSchema>;

export const CreateTraceInputSchema = z.discriminatedUnion('type', [
  CreateSourceTraceInputSchema,
  CreateCreationTraceInputSchema,
  CreateEditorialTraceInputSchema,
]);

export type CreateTraceInput = z.infer<typeof CreateTraceInputSchema>;

// ============================================
// Query Schemas
// ============================================

export const TraceQuerySchema = z.object({
  type: TraceTypeSchema.optional(),
  projectId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.number().min(1).max(500).default(50),
  offset: z.number().min(0).default(0).optional(),
});

export type TraceQuery = z.infer<typeof TraceQuerySchema>;

// ============================================
// Analytics Schemas
// ============================================

export const TraceAnalyticsSchema = z.object({
  totalTraces: z.number(),
  byType: z.object({
    source: z.number(),
    creation: z.number(),
    editorial: z.number(),
  }),
  byProject: z.array(
    z.object({
      projectId: z.string(),
      projectName: z.string().optional(),
      count: z.number(),
    })
  ),
  recentActivity: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    })
  ),
  topTags: z.array(
    z.object({
      tag: z.string(),
      count: z.number(),
    })
  ),
});

export type TraceAnalytics = z.infer<typeof TraceAnalyticsSchema>;
