/**
 * Agents Module
 *
 * An agent is an orchestrator that:
 * - Coordinates Skills: Calls multiple skills in sequence or parallel
 * - Maintains Context: Tracks state across skill invocations
 * - Makes Decisions: Chooses which skills to invoke based on context
 * - Handles Complexity: Manages multi-step workflows
 *
 * Usage:
 *   import { contentAnalysisAgent, researchAnalystAgent, getAgent } from './agents';
 *
 *   // Direct access
 *   const result = await contentAnalysisAgent.execute({ text: '...' });
 *
 *   // Via registry
 *   const agent = getAgent('research-analyst');
 *   const result = await agent.execute({ text: '...' });
 */

// Registry functions
export {
  getAgent,
  getAgentNames,
  getAllAgentMetadata,
  getAgentsBySkill,
  hasAgent,
  registerAgent,
  unregisterAgent,
} from './registry.js';

// Individual agents
export { contentAnalysisAgent } from './content-analysis/index.js';
export { researchAnalystAgent } from './research-analyst/index.js';

// Types
export type {
  Agent,
  AgentMetadata,
  AgentResult,
  AgentContext,
  AgentOptions,
  WorkflowStep,
} from './types.js';
export {
  createAgentContext,
  createAgentResult,
  updateStep,
  recordDecision,
  recordError,
} from './types.js';

// Agent-specific types
export type {
  ContentAnalysisInput,
  ContentAnalysisOutput,
  Synthesis,
} from './content-analysis/index.js';
export type {
  ResearchAnalystInput,
  ResearchAnalystOutput,
  SpeakerAnalysis,
  SpeakerComparison,
  ResearchReport,
} from './research-analyst/index.js';
