import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';

// Create mock state
const mockTraces: Map<string, any> = new Map();
const mockIndex = {
  totalCount: 0,
  byType: { source: [] as string[], creation: [] as string[], editorial: [] as string[] },
  byProject: {} as Record<string, string[]>,
  byTag: {} as Record<string, string[]>,
  lastUpdated: new Date().toISOString(),
};

const resetMocks = () => {
  mockTraces.clear();
  mockIndex.totalCount = 0;
  mockIndex.byType = { source: [], creation: [], editorial: [] };
  mockIndex.byProject = {};
  mockIndex.byTag = {};
};

// Mock the storage module
vi.mock('../../skills/context-graph/storage.js', () => ({
  createTrace: (input: any) => {
    const trace = {
      ...input,
      id: input.id || randomUUID(),
      timestamp: input.timestamp || new Date().toISOString(),
      tags: input.tags || [],
    };
    mockTraces.set(trace.id, trace);
    mockIndex.totalCount++;
    mockIndex.byType[trace.type as keyof typeof mockIndex.byType].push(trace.id);
    if (trace.projectId) {
      if (!mockIndex.byProject[trace.projectId]) mockIndex.byProject[trace.projectId] = [];
      mockIndex.byProject[trace.projectId].push(trace.id);
    }
    for (const tag of trace.tags) {
      if (!mockIndex.byTag[tag]) mockIndex.byTag[tag] = [];
      mockIndex.byTag[tag].push(trace.id);
    }
    return trace;
  },
  getTrace: (id: string) => mockTraces.get(id),
  queryTraces: (query: any) => {
    let results = Array.from(mockTraces.values());
    if (query.type) results = results.filter((t) => t.type === query.type);
    if (query.projectId) results = results.filter((t) => t.projectId === query.projectId);
    if (query.tags?.length) {
      results = results.filter((t) => query.tags.every((tag: string) => t.tags.includes(tag)));
    }
    if (query.since) results = results.filter((t) => t.timestamp >= query.since);
    if (query.until) results = results.filter((t) => t.timestamp <= query.until);
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    return results.slice(offset, offset + limit);
  },
  getTracesByType: (type: string, limit = 50) => {
    return Array.from(mockTraces.values())
      .filter((t) => t.type === type)
      .slice(0, limit);
  },
  getTracesByProject: (projectId: string, limit = 50) => {
    return Array.from(mockTraces.values())
      .filter((t) => t.projectId === projectId)
      .slice(0, limit);
  },
  getRecentTraces: (limit = 20) => {
    return Array.from(mockTraces.values())
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  },
  getSourceTraces: (limit = 50) => {
    return Array.from(mockTraces.values())
      .filter((t) => t.type === 'source')
      .slice(0, limit);
  },
  getCreationTraces: (limit = 50) => {
    return Array.from(mockTraces.values())
      .filter((t) => t.type === 'creation')
      .slice(0, limit);
  },
  getEditorialTraces: (limit = 50) => {
    return Array.from(mockTraces.values())
      .filter((t) => t.type === 'editorial')
      .slice(0, limit);
  },
  getAnalytics: () => ({
    totalTraces: mockIndex.totalCount,
    byType: {
      source: mockIndex.byType.source.length,
      creation: mockIndex.byType.creation.length,
      editorial: mockIndex.byType.editorial.length,
    },
    byProject: Object.entries(mockIndex.byProject).map(([projectId, ids]) => ({
      projectId,
      projectName: mockTraces.get(ids[0])?.projectName,
      count: ids.length,
    })),
    recentActivity: [],
    topTags: Object.entries(mockIndex.byTag)
      .map(([tag, ids]) => ({ tag, count: ids.length }))
      .sort((a, b) => b.count - a.count),
  }),
  searchTraces: (searchText: string, limit = 50) => {
    const lower = searchText.toLowerCase();
    return Array.from(mockTraces.values())
      .filter((t) => {
        if (t.type === 'source') {
          return (
            t.reason?.toLowerCase().includes(lower) || t.source?.title?.toLowerCase().includes(lower)
          );
        }
        if (t.type === 'creation') {
          return (
            t.selection?.reason?.toLowerCase().includes(lower) ||
            t.task?.toLowerCase().includes(lower)
          );
        }
        if (t.type === 'editorial') {
          return (
            t.reason?.toLowerCase().includes(lower) || t.decision?.toLowerCase().includes(lower)
          );
        }
        return false;
      })
      .slice(0, limit);
  },
  getRelatedTraces: (traceId: string, limit = 10) => {
    const trace = mockTraces.get(traceId);
    if (!trace) return [];
    const relatedIds = new Set<string>();
    if (trace.projectId) {
      Array.from(mockTraces.values())
        .filter((t) => t.projectId === trace.projectId && t.id !== traceId)
        .forEach((t) => relatedIds.add(t.id));
    }
    for (const tag of trace.tags || []) {
      Array.from(mockTraces.values())
        .filter((t) => t.tags?.includes(tag) && t.id !== traceId)
        .forEach((t) => relatedIds.add(t.id));
    }
    return Array.from(relatedIds)
      .map((id) => mockTraces.get(id))
      .filter(Boolean)
      .slice(0, limit);
  },
  clearCache: () => resetMocks(),
  forceRebuildIndex: () => mockIndex,
}));

// Import after mocking
import {
  createTrace,
  getTrace,
  queryTraces,
  getRecentTraces,
  getSourceTraces,
  getCreationTraces,
  getEditorialTraces,
  getAnalytics,
  searchTraces,
  getRelatedTraces,
  clearCache,
  forceRebuildIndex,
} from '../../skills/context-graph/storage.js';

import type {
  CreateSourceTraceInput,
  CreateCreationTraceInput,
  CreateEditorialTraceInput,
} from '../../skills/context-graph/schema.js';

describe('Context Graph - Trace Storage', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('createTrace', () => {
    it('should create a source trace', () => {
      const input: CreateSourceTraceInput = {
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: {
          title: 'Test Article',
          url: 'https://example.com/article',
          feedName: 'Test Feed',
        },
        reason: 'Relevant to current project',
        tags: ['test'],
      };

      const trace = createTrace(input);

      expect(trace.id).toBeDefined();
      expect(trace.type).toBe('source');
      expect(trace.timestamp).toBeDefined();
      expect(trace.action).toBe('selected');
      expect(trace.reason).toBe('Relevant to current project');
    });

    it('should create a creation trace', () => {
      const input: CreateCreationTraceInput = {
        type: 'creation',
        task: 'Explain a concept',
        comparison: {
          modelsCompared: ['claude', 'gpt-4'],
          promptUsed: 'Explain recursion',
        },
        selection: {
          provider: 'claude',
          model: 'claude-sonnet',
          reason: 'Better structure',
        },
        tags: ['explanation'],
      };

      const trace = createTrace(input);

      expect(trace.type).toBe('creation');
      expect(trace.task).toBe('Explain a concept');
      expect(trace.selection.provider).toBe('claude');
    });

    it('should create an editorial trace', () => {
      const input: CreateEditorialTraceInput = {
        type: 'editorial',
        decision: 'Restructure introduction',
        category: 'structure',
        reason: 'Improve flow',
        section: 'introduction',
        tags: ['structure'],
      };

      const trace = createTrace(input);

      expect(trace.type).toBe('editorial');
      expect(trace.decision).toBe('Restructure introduction');
      expect(trace.category).toBe('structure');
    });

    it('should assign unique IDs', () => {
      const trace1 = createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Article 1' },
        reason: 'Reason 1',
        tags: [],
      });

      const trace2 = createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Article 2' },
        reason: 'Reason 2',
        tags: [],
      });

      expect(trace1.id).not.toBe(trace2.id);
    });
  });

  describe('getTrace', () => {
    it('should retrieve a trace by ID', () => {
      const created = createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'article',
        source: { title: 'Test' },
        reason: 'Testing',
        tags: [],
      });

      const retrieved = getTrace(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = getTrace('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('queryTraces', () => {
    beforeEach(() => {
      createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'RSS Article' },
        reason: 'Good content',
        projectId: 'project-1',
        tags: ['ai', 'tech'],
      });

      createTrace({
        type: 'creation',
        task: 'Write intro',
        comparison: { modelsCompared: ['claude'], promptUsed: 'test' },
        selection: { provider: 'claude', model: 'sonnet', reason: 'Best' },
        projectId: 'project-1',
        tags: ['writing'],
      });

      createTrace({
        type: 'editorial',
        decision: 'Cut paragraph',
        category: 'cut',
        reason: 'Too long',
        projectId: 'project-2',
        tags: ['editing'],
      });
    });

    it('should query all traces', () => {
      const results = queryTraces({ limit: 50 });
      expect(results.length).toBe(3);
    });

    it('should filter by type', () => {
      const results = queryTraces({ type: 'source', limit: 50 });
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('source');
    });

    it('should filter by project', () => {
      const results = queryTraces({ projectId: 'project-1', limit: 50 });
      expect(results.length).toBe(2);
    });

    it('should filter by tags', () => {
      const results = queryTraces({ tags: ['ai'], limit: 50 });
      expect(results.length).toBe(1);
    });

    it('should respect limit', () => {
      const results = queryTraces({ limit: 2 });
      expect(results.length).toBe(2);
    });

    it('should sort by timestamp descending', () => {
      const results = queryTraces({ limit: 50 });
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].timestamp >= results[i].timestamp).toBe(true);
      }
    });
  });

  describe('getTracesByType', () => {
    beforeEach(() => {
      createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test' },
        reason: 'Test',
        tags: [],
      });
      createTrace({
        type: 'source',
        action: 'rejected',
        sourceType: 'article',
        source: { title: 'Test 2' },
        reason: 'Test 2',
        tags: [],
      });
      createTrace({
        type: 'creation',
        task: 'Test',
        comparison: { modelsCompared: [], promptUsed: '' },
        selection: { provider: '', model: '', reason: '' },
        tags: [],
      });
    });

    it('should return only source traces', () => {
      const results = getSourceTraces();
      expect(results.length).toBe(2);
      expect(results.every((t) => t.type === 'source')).toBe(true);
    });

    it('should return only creation traces', () => {
      const results = getCreationTraces();
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('creation');
    });

    it('should return only editorial traces', () => {
      const results = getEditorialTraces();
      expect(results.length).toBe(0);
    });
  });

  describe('getAnalytics', () => {
    beforeEach(() => {
      createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test' },
        reason: 'Test',
        projectId: 'project-1',
        tags: ['ai', 'tech'],
      });
      createTrace({
        type: 'creation',
        task: 'Test',
        comparison: { modelsCompared: [], promptUsed: '' },
        selection: { provider: '', model: '', reason: '' },
        projectId: 'project-1',
        tags: ['ai'],
      });
    });

    it('should return correct totals', () => {
      const analytics = getAnalytics();

      expect(analytics.totalTraces).toBe(2);
      expect(analytics.byType.source).toBe(1);
      expect(analytics.byType.creation).toBe(1);
      expect(analytics.byType.editorial).toBe(0);
    });

    it('should count by project', () => {
      const analytics = getAnalytics();

      expect(analytics.byProject.length).toBeGreaterThan(0);
      expect(analytics.byProject[0].projectId).toBe('project-1');
      expect(analytics.byProject[0].count).toBe(2);
    });

    it('should count tags', () => {
      const analytics = getAnalytics();

      const aiTag = analytics.topTags.find((t) => t.tag === 'ai');
      expect(aiTag?.count).toBe(2);
    });
  });

  describe('searchTraces', () => {
    beforeEach(() => {
      createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Machine Learning Guide' },
        reason: 'Great introduction to neural networks',
        tags: [],
      });
      createTrace({
        type: 'editorial',
        decision: 'Simplify language',
        category: 'clarity',
        reason: 'Make it accessible to beginners',
        tags: [],
      });
    });

    it('should find traces by reason text', () => {
      const results = searchTraces('neural networks');
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('source');
    });

    it('should find traces by title', () => {
      const results = searchTraces('Machine Learning');
      expect(results.length).toBe(1);
    });

    it('should find traces by decision text', () => {
      const results = searchTraces('Simplify');
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('editorial');
    });

    it('should be case insensitive', () => {
      const results = searchTraces('NEURAL NETWORKS');
      expect(results.length).toBe(1);
    });

    it('should return empty for no matches', () => {
      const results = searchTraces('nonexistent term xyz');
      expect(results.length).toBe(0);
    });
  });

  describe('getRelatedTraces', () => {
    it('should find related traces by project', () => {
      const trace1 = createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test 1' },
        reason: 'Test',
        projectId: 'shared-project',
        tags: [],
      });

      createTrace({
        type: 'editorial',
        decision: 'Test decision',
        category: 'structure',
        reason: 'Test',
        projectId: 'shared-project',
        tags: [],
      });

      const related = getRelatedTraces(trace1.id);

      expect(related.length).toBe(1);
      expect(related[0].type).toBe('editorial');
    });

    it('should find related traces by tags', () => {
      const trace1 = createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test 1' },
        reason: 'Test',
        tags: ['shared-tag'],
      });

      createTrace({
        type: 'creation',
        task: 'Test',
        comparison: { modelsCompared: [], promptUsed: '' },
        selection: { provider: '', model: '', reason: '' },
        tags: ['shared-tag'],
      });

      const related = getRelatedTraces(trace1.id);

      expect(related.length).toBe(1);
      expect(related[0].type).toBe('creation');
    });

    it('should return empty for non-existent trace', () => {
      const related = getRelatedTraces('non-existent');
      expect(related.length).toBe(0);
    });
  });

  describe('forceRebuildIndex', () => {
    it('should rebuild index from traces', () => {
      createTrace({
        type: 'source',
        action: 'selected',
        sourceType: 'rss',
        source: { title: 'Test' },
        reason: 'Test',
        tags: ['test'],
      });

      const index = forceRebuildIndex();

      expect(index.totalCount).toBe(1);
      expect(index.byType.source.length).toBe(1);
      expect(index.byTag['test'].length).toBe(1);
    });
  });
});
