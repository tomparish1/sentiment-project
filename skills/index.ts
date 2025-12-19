/**
 * Skills Module
 *
 * A skill is a focused, self-contained capability with:
 * - Clear Purpose: Does one thing well
 * - Defined Interface: Explicit inputs and outputs
 * - Independence: Works without other skills
 *
 * Usage:
 *   import { documentParser, sentimentAnalyzer, getSkill } from './skills';
 *
 *   // Direct access
 *   const result = await documentParser.invoke({ buffer, filename, mimetype });
 *
 *   // Via registry
 *   const skill = getSkill('sentiment-analyzer');
 *   const result = await skill.invoke({ text: '...' });
 */

// Registry functions
export {
  getSkill,
  getSkillNames,
  getAllSkillMetadata,
  getSkillsByCategory,
  hasSkill,
  registerSkill,
  unregisterSkill,
} from './registry.js';

// Individual skills - Phase 1
export { documentParser } from './document-parser/index.js';
export { documentMetadata } from './document-metadata/index.js';
export { sentimentAnalyzer } from './sentiment-analyzer/index.js';

// Individual skills - Phase 2 (Rhetoric Analysis)
export { embeddingEngine, cosineSimilarity } from './embedding-engine/index.js';
export { textSegmenter } from './text-segmenter/index.js';
export { exemplarStore } from './exemplar-store/index.js';
export { rhetoricAnalyzer } from './rhetoric-analyzer/index.js';

// Types
export type { Skill, SkillMetadata, SkillResult } from './types.js';
export { createSkillResult } from './types.js';

// Skill-specific types - Phase 1
export type { DocumentParserInput, DocumentParserOutput } from './document-parser/index.js';
export type {
  DocumentMetadataInput,
  DocumentMetadataOutput,
  DocumentHeader,
  DocumentStatistics,
  DocumentCharacteristics,
  GenreMarker,
} from './document-metadata/index.js';
export type {
  SentimentAnalyzerInput,
  SentimentAnalyzerOutput,
  EmotionType,
  SentimentType,
} from './sentiment-analyzer/index.js';

// Skill-specific types - Phase 2 (Rhetoric Analysis)
export type { EmbeddingEngineInput, EmbeddingEngineOutput } from './embedding-engine/index.js';
export type {
  TextSegmenterInput,
  TextSegmenterOutput,
  TextSegment,
  SegmentationMethod,
} from './text-segmenter/index.js';
export type {
  ExemplarStoreInput,
  ExemplarStoreOutput,
  Exemplar,
  ExemplarMatch,
  ExemplarStoreStats,
} from './exemplar-store/index.js';
export type {
  RhetoricAnalyzerInput,
  RhetoricAnalyzerOutput,
  ClassifiedSegment,
  AnalysisSummary,
} from './rhetoric-analyzer/index.js';
