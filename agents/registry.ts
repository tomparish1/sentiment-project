/**
 * Agent Registry - Discovery and management of available agents
 *
 * Provides:
 * - Agent discovery and loading
 * - Centralized access to all agents
 * - Agent metadata lookup
 */

import type { Agent, AgentMetadata } from './types.js';
import { contentAnalysisAgent } from './content-analysis/index.js';
import { researchAnalystAgent } from './research-analyst/index.js';

// Registry of all available agents
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agents: Map<string, Agent<any, any, any>> = new Map();

// Register built-in agents
agents.set('content-analysis', contentAnalysisAgent);
agents.set('research-analyst', researchAnalystAgent);

/**
 * Get an agent by name
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAgent<TInput = any, TOutput = any, TState = any>(
  name: string
): Agent<TInput, TOutput, TState> | undefined {
  return agents.get(name) as Agent<TInput, TOutput, TState> | undefined;
}

/**
 * Get all registered agent names
 */
export function getAgentNames(): string[] {
  return Array.from(agents.keys());
}

/**
 * Get metadata for all registered agents
 */
export function getAllAgentMetadata(): AgentMetadata[] {
  return Array.from(agents.values()).map((agent) => agent.metadata);
}

/**
 * Get agents by required skill
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAgentsBySkill(skillName: string): Agent<any, any, any>[] {
  return Array.from(agents.values()).filter((agent) =>
    agent.metadata.requiredSkills.includes(skillName)
  );
}

/**
 * Check if an agent exists
 */
export function hasAgent(name: string): boolean {
  return agents.has(name);
}

/**
 * Register a new agent
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerAgent<TInput, TOutput, TState>(
  agent: Agent<TInput, TOutput, TState>
): void {
  if (agents.has(agent.metadata.name)) {
    throw new Error(`Agent '${agent.metadata.name}' is already registered`);
  }
  agents.set(agent.metadata.name, agent);
}

/**
 * Unregister an agent
 */
export function unregisterAgent(name: string): boolean {
  return agents.delete(name);
}

/**
 * Internal function to register built-in agents
 * Called after agent modules are loaded
 */
export function _registerBuiltInAgents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentList: Agent<any, any, any>[]
): void {
  for (const agent of agentList) {
    if (!agents.has(agent.metadata.name)) {
      agents.set(agent.metadata.name, agent);
    }
  }
}

// Export individual agents for direct access
export { contentAnalysisAgent } from './content-analysis/index.js';
export { researchAnalystAgent } from './research-analyst/index.js';

// Export types
export type { Agent, AgentMetadata, AgentResult, AgentContext, AgentOptions } from './types.js';
