/**
 * Base types for the Agents architecture.
 *
 * An Agent is an orchestrator that:
 * - Coordinates Skills: Calls multiple skills in sequence or parallel
 * - Maintains Context: Tracks state across skill invocations
 * - Makes Decisions: Chooses which skills to invoke based on context
 * - Handles Complexity: Manages multi-step workflows
 */

import type { SkillResult } from '../skills/types.js';

/**
 * Metadata describing an agent
 */
export interface AgentMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  requiredSkills: string[];
}

/**
 * A single step in an agent's workflow
 */
export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  skillName?: string;
  startTime?: number;
  endTime?: number;
  result?: SkillResult<unknown>;
  error?: string;
}

/**
 * Context maintained across agent execution
 */
export interface AgentContext<TState = Record<string, unknown>> {
  /** Unique execution ID */
  executionId: string;

  /** When execution started */
  startTime: number;

  /** Workflow steps with their status */
  steps: WorkflowStep[];

  /** Current step index */
  currentStepIndex: number;

  /** Accumulated state from skill results */
  state: TState;

  /** Decision points and their outcomes */
  decisions: Array<{
    point: string;
    condition: string;
    outcome: string;
    timestamp: number;
  }>;

  /** Any errors encountered */
  errors: Array<{
    step: string;
    error: string;
    timestamp: number;
  }>;
}

/**
 * Result returned by an agent
 */
export interface AgentResult<TOutput> {
  success: boolean;
  data?: TOutput | undefined;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    agentName: string;
    agentVersion: string;
    executionId: string;
    executionTimeMs: number;
    timestamp: string;
    stepsCompleted: number;
    totalSteps: number;
  };
  context: AgentContext;
}

/**
 * Configuration options for agent execution
 */
export interface AgentOptions<TState = unknown> {
  /** Enable verbose logging */
  verbose?: boolean;

  /** Timeout for entire agent execution (ms) */
  timeout?: number;

  /** Whether to continue on non-critical errors */
  continueOnError?: boolean;

  /** Callback for step completion */
  onStepComplete?: (step: WorkflowStep, context: AgentContext<TState>) => void;

  /** Callback for decisions */
  onDecision?: (
    point: string,
    condition: string,
    outcome: string,
    context: AgentContext<TState>
  ) => void;
}

/**
 * Base interface for all agents
 */
export interface Agent<TInput, TOutput, TState = Record<string, unknown>> {
  metadata: AgentMetadata;

  /**
   * Define the workflow steps for this agent
   */
  defineWorkflow(input: TInput): WorkflowStep[];

  /**
   * Execute the agent workflow
   */
  execute(input: TInput, options?: AgentOptions<TState>): Promise<AgentResult<TOutput>>;

  /**
   * Validate input before execution
   */
  validate?(input: TInput): { valid: boolean; errors?: string[] };
}

/**
 * Helper to create initial agent context
 */
export function createAgentContext<TState = Record<string, unknown>>(
  steps: WorkflowStep[],
  initialState?: TState
): AgentContext<TState> {
  return {
    executionId: crypto.randomUUID().slice(0, 8),
    startTime: Date.now(),
    steps,
    currentStepIndex: 0,
    state: initialState || ({} as TState),
    decisions: [],
    errors: [],
  };
}

/**
 * Helper to create an agent result
 */
export function createAgentResult<TOutput, TState = unknown>(
  agentName: string,
  agentVersion: string,
  context: AgentContext<TState>,
  data?: TOutput,
  error?: { code: string; message: string; details?: unknown }
): AgentResult<TOutput> {
  const completedSteps = context.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length;

  return {
    success: !error,
    data,
    error,
    metadata: {
      agentName,
      agentVersion,
      executionId: context.executionId,
      executionTimeMs: Date.now() - context.startTime,
      timestamp: new Date().toISOString(),
      stepsCompleted: completedSteps,
      totalSteps: context.steps.length,
    },
    context: context as AgentContext,
  };
}

/**
 * Helper to update a step in context
 */
export function updateStep<TState = unknown>(
  context: AgentContext<TState>,
  stepId: string,
  updates: Partial<WorkflowStep>
): void {
  const step = context.steps.find((s) => s.id === stepId);
  if (step) {
    Object.assign(step, updates);
  }
}

/**
 * Helper to record a decision
 */
export function recordDecision<TState = unknown>(
  context: AgentContext<TState>,
  point: string,
  condition: string,
  outcome: string
): void {
  context.decisions.push({
    point,
    condition,
    outcome,
    timestamp: Date.now(),
  });
}

/**
 * Helper to record an error
 */
export function recordError<TState = unknown>(
  context: AgentContext<TState>,
  step: string,
  error: string
): void {
  context.errors.push({
    step,
    error,
    timestamp: Date.now(),
  });
}
