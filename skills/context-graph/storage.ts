/**
 * Context Graph Storage
 *
 * Persists decision traces to JSONL files for append-friendly storage.
 * Supports querying, analytics, and project-based organization.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type {
  Trace,
  TraceType,
  SourceTrace,
  CreationTrace,
  EditorialTrace,
  CreateTraceInput,
  TraceQuery,
  TraceAnalytics,
} from './schema.js';
import { TraceSchema } from './schema.js';

// Storage location
const DATA_DIR = join(process.cwd(), 'data', 'traces');
const TRACES_FILE = join(DATA_DIR, 'traces.jsonl');
const INDEX_FILE = join(DATA_DIR, 'index.json');

// In-memory cache for faster queries
interface TraceIndex {
  totalCount: number;
  byType: Record<TraceType, string[]>; // trace IDs by type
  byProject: Record<string, string[]>; // trace IDs by project
  byTag: Record<string, string[]>; // trace IDs by tag
  lastUpdated: string;
}

let indexCache: TraceIndex | null = null;
let tracesCache: Map<string, Trace> | null = null;

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load index from disk
 */
function loadIndex(): TraceIndex {
  ensureDataDir();

  if (!existsSync(INDEX_FILE)) {
    const emptyIndex: TraceIndex = {
      totalCount: 0,
      byType: { source: [], creation: [], editorial: [] },
      byProject: {},
      byTag: {},
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(INDEX_FILE, JSON.stringify(emptyIndex, null, 2));
    return emptyIndex;
  }

  try {
    const data = readFileSync(INDEX_FILE, 'utf-8');
    return JSON.parse(data) as TraceIndex;
  } catch {
    // Rebuild index from traces file
    return rebuildIndex();
  }
}

/**
 * Save index to disk
 */
function saveIndex(index: TraceIndex): void {
  ensureDataDir();
  index.lastUpdated = new Date().toISOString();
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  indexCache = index;
}

/**
 * Load all traces from disk
 */
function loadTraces(): Map<string, Trace> {
  ensureDataDir();

  const traces = new Map<string, Trace>();

  if (!existsSync(TRACES_FILE)) {
    return traces;
  }

  try {
    const content = readFileSync(TRACES_FILE, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const validated = TraceSchema.safeParse(parsed);
        if (validated.success) {
          traces.set(validated.data.id, validated.data);
        }
      } catch {
        // Skip invalid lines
      }
    }
  } catch {
    // Return empty map on error
  }

  return traces;
}

/**
 * Rebuild index from traces file
 */
function rebuildIndex(): TraceIndex {
  const traces = loadTraces();
  tracesCache = traces;

  const index: TraceIndex = {
    totalCount: traces.size,
    byType: { source: [], creation: [], editorial: [] },
    byProject: {},
    byTag: {},
    lastUpdated: new Date().toISOString(),
  };

  for (const trace of traces.values()) {
    // Index by type
    index.byType[trace.type].push(trace.id);

    // Index by project
    if (trace.projectId) {
      const projectId = trace.projectId;
      if (!index.byProject[projectId]) {
        index.byProject[projectId] = [];
      }
      index.byProject[projectId]!.push(trace.id);
    }

    // Index by tags
    for (const tag of trace.tags) {
      if (!index.byTag[tag]) {
        index.byTag[tag] = [];
      }
      index.byTag[tag]!.push(trace.id);
    }
  }

  saveIndex(index);
  return index;
}

/**
 * Get cached index
 */
function getIndex(): TraceIndex {
  if (!indexCache) {
    indexCache = loadIndex();
  }
  return indexCache;
}

/**
 * Get cached traces
 */
function getTraces(): Map<string, Trace> {
  if (!tracesCache) {
    tracesCache = loadTraces();
  }
  return tracesCache;
}

// ============================================
// Public API
// ============================================

/**
 * Create a new trace
 */
export function createTrace(input: CreateTraceInput): Trace {
  ensureDataDir();

  const trace: Trace = {
    ...input,
    id: input.id || randomUUID(),
    timestamp: input.timestamp || new Date().toISOString(),
  } as Trace;

  // Append to JSONL file
  const line = JSON.stringify(trace) + '\n';
  appendFileSync(TRACES_FILE, line);

  // Update cache
  const traces = getTraces();
  traces.set(trace.id, trace);

  // Update index
  const index = getIndex();
  index.totalCount++;
  index.byType[trace.type].push(trace.id);

  if (trace.projectId) {
    const projectId = trace.projectId;
    if (!index.byProject[projectId]) {
      index.byProject[projectId] = [];
    }
    index.byProject[projectId]!.push(trace.id);
  }

  for (const tag of trace.tags) {
    if (!index.byTag[tag]) {
      index.byTag[tag] = [];
    }
    index.byTag[tag]!.push(trace.id);
  }

  saveIndex(index);

  return trace;
}

/**
 * Get a trace by ID
 */
export function getTrace(id: string): Trace | undefined {
  return getTraces().get(id);
}

/**
 * Query traces
 */
export function queryTraces(query: TraceQuery): Trace[] {
  const traces = getTraces();
  const index = getIndex();

  // Start with all trace IDs or filtered by type
  let candidateIds: Set<string>;

  if (query.type) {
    candidateIds = new Set(index.byType[query.type]);
  } else {
    candidateIds = new Set(traces.keys());
  }

  // Filter by project
  if (query.projectId) {
    const projectIds = new Set(index.byProject[query.projectId] || []);
    candidateIds = new Set([...candidateIds].filter((id) => projectIds.has(id)));
  }

  // Filter by tags (AND logic - must have all tags)
  if (query.tags && query.tags.length > 0) {
    for (const tag of query.tags) {
      const tagIds = new Set(index.byTag[tag] || []);
      candidateIds = new Set([...candidateIds].filter((id) => tagIds.has(id)));
    }
  }

  // Get actual traces and apply date filters
  let results: Trace[] = [];
  for (const id of candidateIds) {
    const trace = traces.get(id);
    if (!trace) continue;

    // Date filters
    if (query.since && trace.timestamp < query.since) continue;
    if (query.until && trace.timestamp > query.until) continue;

    results.push(trace);
  }

  // Sort by timestamp descending (newest first)
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Apply pagination
  const offset = query.offset || 0;
  const limit = query.limit || 50;
  results = results.slice(offset, offset + limit);

  return results;
}

/**
 * Get traces by type
 */
export function getTracesByType(type: TraceType, limit = 50): Trace[] {
  return queryTraces({ type, limit });
}

/**
 * Get traces by project
 */
export function getTracesByProject(projectId: string, limit = 50): Trace[] {
  return queryTraces({ projectId, limit });
}

/**
 * Get recent traces
 */
export function getRecentTraces(limit = 20): Trace[] {
  return queryTraces({ limit });
}

/**
 * Get source traces (for RSS decisions)
 */
export function getSourceTraces(limit = 50): SourceTrace[] {
  return queryTraces({ type: 'source', limit }) as SourceTrace[];
}

/**
 * Get creation traces (for LLM decisions)
 */
export function getCreationTraces(limit = 50): CreationTrace[] {
  return queryTraces({ type: 'creation', limit }) as CreationTrace[];
}

/**
 * Get editorial traces (for writing decisions)
 */
export function getEditorialTraces(limit = 50): EditorialTrace[] {
  return queryTraces({ type: 'editorial', limit }) as EditorialTrace[];
}

/**
 * Get analytics
 */
export function getAnalytics(): TraceAnalytics {
  const traces = getTraces();
  const index = getIndex();

  // Count by type
  const byType = {
    source: index.byType.source.length,
    creation: index.byType.creation.length,
    editorial: index.byType.editorial.length,
  };

  // Count by project
  const byProject = Object.entries(index.byProject)
    .map(([projectId, ids]) => {
      // Get project name from first trace
      const firstId = ids[0];
      const firstTrace = firstId ? traces.get(firstId) : undefined;
      return {
        projectId,
        projectName: firstTrace?.projectName,
        count: ids.length,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Recent activity (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const activityByDate: Record<string, number> = {};

  for (const trace of traces.values()) {
    const traceDate = new Date(trace.timestamp);
    if (traceDate >= thirtyDaysAgo) {
      const dateKey = trace.timestamp.split('T')[0] ?? trace.timestamp.slice(0, 10);
      activityByDate[dateKey] = (activityByDate[dateKey] ?? 0) + 1;
    }
  }

  const recentActivity = Object.entries(activityByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top tags
  const topTags = Object.entries(index.byTag)
    .map(([tag, ids]) => ({ tag, count: ids.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    totalTraces: index.totalCount,
    byType,
    byProject,
    recentActivity,
    topTags,
  };
}

/**
 * Search traces by reason/description text
 */
export function searchTraces(searchText: string, limit = 50): Trace[] {
  const traces = getTraces();
  const lowerSearch = searchText.toLowerCase();
  const results: Trace[] = [];

  for (const trace of traces.values()) {
    // Search in reason field (all trace types have this)
    let matches = false;

    if (trace.type === 'source') {
      const st = trace as SourceTrace;
      matches =
        st.reason.toLowerCase().includes(lowerSearch) ||
        st.source.title.toLowerCase().includes(lowerSearch);
    } else if (trace.type === 'creation') {
      const ct = trace as CreationTrace;
      matches =
        ct.selection.reason.toLowerCase().includes(lowerSearch) ||
        ct.task.toLowerCase().includes(lowerSearch);
    } else if (trace.type === 'editorial') {
      const et = trace as EditorialTrace;
      matches =
        et.reason.toLowerCase().includes(lowerSearch) ||
        et.decision.toLowerCase().includes(lowerSearch);
    }

    if (matches) {
      results.push(trace);
      if (results.length >= limit) break;
    }
  }

  return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Get related traces (by project, tags, or cross-references)
 */
export function getRelatedTraces(traceId: string, limit = 10): Trace[] {
  const trace = getTrace(traceId);
  if (!trace) return [];

  const relatedIds = new Set<string>();

  // Add traces from same project
  if (trace.projectId) {
    const projectTraces = queryTraces({ projectId: trace.projectId, limit: 20 });
    for (const t of projectTraces) {
      if (t.id !== traceId) relatedIds.add(t.id);
    }
  }

  // Add traces with same tags
  for (const tag of trace.tags) {
    const index = getIndex();
    const tagIds = index.byTag[tag] || [];
    for (const id of tagIds) {
      if (id !== traceId) relatedIds.add(id);
    }
  }

  // Add explicitly related traces (for source traces)
  if (trace.type === 'source') {
    const st = trace as SourceTrace;
    for (const id of st.relatedTraceIds || []) {
      relatedIds.add(id);
    }
  }

  // Get actual traces
  const traces = getTraces();
  const results: Trace[] = [];
  for (const id of relatedIds) {
    const t = traces.get(id);
    if (t) results.push(t);
    if (results.length >= limit) break;
  }

  return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  indexCache = null;
  tracesCache = null;
}

/**
 * Force rebuild index
 */
export function forceRebuildIndex(): TraceIndex {
  clearCache();
  return rebuildIndex();
}
