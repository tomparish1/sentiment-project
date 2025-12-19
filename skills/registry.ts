/**
 * Skill Registry - Discovery and management of available skills
 *
 * Provides:
 * - Skill discovery and loading
 * - Centralized access to all skills
 * - Skill metadata lookup
 */

import type { Skill, SkillMetadata } from './types.js';
import { documentParser } from './document-parser/index.js';
import { documentMetadata } from './document-metadata/index.js';
import { sentimentAnalyzer } from './sentiment-analyzer/index.js';
import { embeddingEngine } from './embedding-engine/index.js';
import { textSegmenter } from './text-segmenter/index.js';
import { exemplarStore } from './exemplar-store/index.js';
import { rhetoricAnalyzer } from './rhetoric-analyzer/index.js';

// Registry of all available skills
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const skills: Map<string, Skill<any, any>> = new Map();

// Register built-in skills - Phase 1
skills.set('document-parser', documentParser);
skills.set('document-metadata', documentMetadata);
skills.set('sentiment-analyzer', sentimentAnalyzer);

// Register built-in skills - Phase 2 (Rhetoric Analysis)
skills.set('embedding-engine', embeddingEngine);
skills.set('text-segmenter', textSegmenter);
skills.set('exemplar-store', exemplarStore);
skills.set('rhetoric-analyzer', rhetoricAnalyzer);

/**
 * Get a skill by name
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSkill<TInput = any, TOutput = any>(
  name: string
): Skill<TInput, TOutput> | undefined {
  return skills.get(name) as Skill<TInput, TOutput> | undefined;
}

/**
 * Get all registered skill names
 */
export function getSkillNames(): string[] {
  return Array.from(skills.keys());
}

/**
 * Get metadata for all registered skills
 */
export function getAllSkillMetadata(): SkillMetadata[] {
  return Array.from(skills.values()).map((skill) => skill.metadata);
}

/**
 * Get skills by category
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSkillsByCategory(category: string): Skill<any, any>[] {
  return Array.from(skills.values()).filter((skill) => skill.metadata.category === category);
}

/**
 * Check if a skill exists
 */
export function hasSkill(name: string): boolean {
  return skills.has(name);
}

/**
 * Register a new skill (for runtime extension)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerSkill<TInput, TOutput>(skill: Skill<TInput, TOutput>): void {
  if (skills.has(skill.metadata.name)) {
    throw new Error(`Skill '${skill.metadata.name}' is already registered`);
  }
  skills.set(skill.metadata.name, skill);
}

/**
 * Unregister a skill
 */
export function unregisterSkill(name: string): boolean {
  return skills.delete(name);
}

// Export individual skills for direct access
export { documentParser } from './document-parser/index.js';
export { documentMetadata } from './document-metadata/index.js';
export { sentimentAnalyzer } from './sentiment-analyzer/index.js';
export { embeddingEngine } from './embedding-engine/index.js';
export { textSegmenter } from './text-segmenter/index.js';
export { exemplarStore } from './exemplar-store/index.js';
export { rhetoricAnalyzer } from './rhetoric-analyzer/index.js';

// Export types
export type { Skill, SkillMetadata, SkillResult } from './types.js';
