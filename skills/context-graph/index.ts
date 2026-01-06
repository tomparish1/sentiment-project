// Schema exports
export type {
  TraceType,
  BaseTrace,
  SourceTrace,
  CreationTrace,
  EditorialTrace,
  EditorialCategory,
  Trace,
  CreateSourceTraceInput,
  CreateCreationTraceInput,
  CreateEditorialTraceInput,
  CreateTraceInput,
  TraceQuery,
  TraceAnalytics,
} from './schema.js';

export {
  TraceTypeSchema,
  BaseTraceSchema,
  SourceTraceSchema,
  CreationTraceSchema,
  EditorialTraceSchema,
  EditorialCategorySchema,
  TraceSchema,
  CreateSourceTraceInputSchema,
  CreateCreationTraceInputSchema,
  CreateEditorialTraceInputSchema,
  CreateTraceInputSchema,
  TraceQuerySchema,
  TraceAnalyticsSchema,
} from './schema.js';

// Storage exports
export {
  createTrace,
  getTrace,
  queryTraces,
  getTracesByType,
  getTracesByProject,
  getRecentTraces,
  getSourceTraces,
  getCreationTraces,
  getEditorialTraces,
  getAnalytics,
  searchTraces,
  getRelatedTraces,
  clearCache,
  forceRebuildIndex,
} from './storage.js';
