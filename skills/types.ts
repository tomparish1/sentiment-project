/**
 * Base types for the Skills architecture.
 *
 * A Skill is a focused, self-contained capability with:
 * - Clear Purpose: Does one thing well
 * - Defined Interface: Explicit inputs and outputs
 * - Independence: Works without other skills
 */

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  category: string;
  dependencies?: string[];
}

export interface SkillResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    skillName: string;
    skillVersion: string;
    executionTimeMs: number;
    timestamp: string;
  };
}

export interface Skill<TInput, TOutput> {
  metadata: SkillMetadata;
  invoke(input: TInput): Promise<SkillResult<TOutput>>;
  validate?(input: TInput): { valid: boolean; errors?: string[] };
}

/**
 * Helper to create a skill result
 */
export function createSkillResult<T>(
  skillName: string,
  skillVersion: string,
  startTime: number,
  data?: T,
  error?: { code: string; message: string; details?: unknown }
): SkillResult<T> {
  return {
    success: !error,
    data,
    error,
    metadata: {
      skillName,
      skillVersion,
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    },
  };
}
