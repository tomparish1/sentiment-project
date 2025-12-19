import type { Agent, AgentResult, AgentOptions, WorkflowStep, AgentContext } from '../types.js';
import {
  createAgentContext,
  createAgentResult,
  updateStep,
  recordDecision,
  recordError,
} from '../types.js';
import { documentParser } from '../../skills/document-parser/index.js';
import { documentMetadata } from '../../skills/document-metadata/index.js';
import { sentimentAnalyzer } from '../../skills/sentiment-analyzer/index.js';
import { rhetoricAnalyzer } from '../../skills/rhetoric-analyzer/index.js';
import {
  ContentAnalysisInputSchema,
  type ContentAnalysisInput,
  type ContentAnalysisOutput,
  type ContentAnalysisState,
  type Synthesis,
} from './schema.js';

const DEFAULT_EXEMPLAR_PATH = 'data/exemplars/starter.json';

function shouldRunRhetoricAnalysis(
  input: ContentAnalysisInput,
  state: ContentAnalysisState
): boolean {
  // Explicit flags take precedence
  if (input.skipRhetoric) return false;
  if (input.forceRhetoric) return true;

  // Check if document appears argumentative based on genre markers
  if (state.document?.characteristics) {
    const genres = state.document.characteristics.genreMarkers;
    const argumentativeGenres = ['persuasive', 'academic', 'formal'];

    for (const marker of genres) {
      if (argumentativeGenres.includes(marker.genre) && marker.score > 0.2) {
        return true;
      }
    }

    // Also run for dialogic content (transcripts)
    if (state.document.characteristics.isDialogic) {
      return true;
    }
  }

  return false;
}

function generateSynthesis(state: ContentAnalysisState): Synthesis {
  const keyFindings: string[] = [];
  const analysisPerformed: string[] = ['document-metadata'];

  // Document findings
  if (state.document) {
    const stats = state.document.statistics;
    keyFindings.push(`Document contains ${stats.wordCount} words across ${stats.paragraphCount} paragraphs`);

    if (state.document.characteristics.isDialogic) {
      const speakers = state.document.characteristics.speakers;
      keyFindings.push(`Dialogic content with ${speakers.length} speakers: ${speakers.join(', ')}`);
    }

    const topGenre = state.document.characteristics.genreMarkers[0];
    if (topGenre) {
      keyFindings.push(`Primary genre: ${topGenre.genre} (score: ${topGenre.score.toFixed(2)})`);
    }
  }

  // Sentiment findings
  let primaryTone = 'neutral';
  if (state.sentiment) {
    analysisPerformed.push('sentiment-analyzer');
    primaryTone = state.sentiment.sentiment;
    keyFindings.push(
      `Overall sentiment: ${state.sentiment.sentiment} (confidence: ${state.sentiment.confidence.toFixed(2)})`
    );

    if (state.sentiment.emotions) {
      const topEmotions = Object.entries(state.sentiment.emotions)
        .filter(([, score]) => score > 0.3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (topEmotions.length > 0) {
        const emotionStr = topEmotions.map(([e, s]) => `${e} (${s.toFixed(2)})`).join(', ');
        keyFindings.push(`Dominant emotions: ${emotionStr}`);
      }
    }
  }

  // Rhetoric findings
  if (state.rhetoric) {
    analysisPerformed.push('rhetoric-analyzer');
    const summary = state.rhetoric.summary;
    keyFindings.push(
      `Detected ${summary.classifiedSegments} rhetorical moves (${(summary.classificationRate * 100).toFixed(0)}% of segments)`
    );

    if (summary.topMoves.length > 0) {
      const topMovesStr = summary.topMoves
        .slice(0, 3)
        .map(([move, count]) => `${move} (${count})`)
        .join(', ');
      keyFindings.push(`Top rhetorical moves: ${topMovesStr}`);
    }
  }

  // Generate summary
  let summary = `Analysis of "${state.filename}": `;

  if (state.document) {
    summary += `A ${state.document.statistics.wordCount}-word `;

    const topGenre = state.document.characteristics.genreMarkers[0];
    if (topGenre) {
      summary += `${topGenre.genre} `;
    }

    summary += `document with ${primaryTone} sentiment. `;
  }

  if (state.rhetoric && state.rhetoric.summary.classifiedSegments > 0) {
    summary += state.rhetoric.summary.narrative;
  }

  return {
    summary: summary.trim(),
    primaryTone,
    keyFindings,
    analysisPerformed,
  };
}

export const contentAnalysisAgent: Agent<
  ContentAnalysisInput,
  ContentAnalysisOutput,
  ContentAnalysisState
> = {
  metadata: {
    name: 'content-analysis',
    version: '1.0.0',
    description: 'Comprehensive content analysis combining multiple analysis skills',
    capabilities: [
      'Document parsing (PDF, DOCX, TXT, MD)',
      'Metadata and statistics extraction',
      'Sentiment and emotion analysis',
      'Rhetoric analysis (conditional)',
      'Synthesis report generation',
    ],
    requiredSkills: ['document-parser', 'document-metadata', 'sentiment-analyzer', 'rhetoric-analyzer'],
  },

  validate(input: ContentAnalysisInput) {
    const result = ContentAnalysisInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  defineWorkflow(input: ContentAnalysisInput): WorkflowStep[] {
    const steps: WorkflowStep[] = [];

    // Step 1: Parse document (if buffer provided)
    if (input.buffer) {
      steps.push({
        id: 'parse-document',
        name: 'Parse Document',
        status: 'pending',
        skillName: 'document-parser',
      });
    }

    // Step 2: Extract metadata
    steps.push({
      id: 'extract-metadata',
      name: 'Extract Metadata',
      status: 'pending',
      skillName: 'document-metadata',
    });

    // Step 3: Sentiment analysis
    if (!input.skipSentiment) {
      steps.push({
        id: 'analyze-sentiment',
        name: 'Analyze Sentiment',
        status: 'pending',
        skillName: 'sentiment-analyzer',
      });
    }

    // Step 4: Rhetoric analysis (conditional - will be decided at runtime)
    steps.push({
      id: 'analyze-rhetoric',
      name: 'Analyze Rhetoric',
      status: 'pending',
      skillName: 'rhetoric-analyzer',
    });

    // Step 5: Synthesis
    steps.push({
      id: 'synthesize',
      name: 'Generate Synthesis',
      status: 'pending',
    });

    return steps;
  },

  async execute(
    input: ContentAnalysisInput,
    options?: AgentOptions
  ): Promise<AgentResult<ContentAnalysisOutput>> {
    const { name, version } = this.metadata;

    // Validate input
    const validation = this.validate!(input);
    if (!validation.valid) {
      const steps = this.defineWorkflow(input);
      const context = createAgentContext<ContentAnalysisState>(steps, {
        filename: input.filename || 'document.txt',
        shouldAnalyzeRhetoric: false,
      });

      return createAgentResult<ContentAnalysisOutput>(name, version, context, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    // Initialize workflow
    const steps = this.defineWorkflow(input);
    const context = createAgentContext<ContentAnalysisState>(steps, {
      text: input.text,
      filename: input.filename || 'document.txt',
      shouldAnalyzeRhetoric: false,
    });

    try {
      // Step 1: Parse document (if buffer provided)
      if (input.buffer) {
        const parseStep = context.steps.find((s) => s.id === 'parse-document')!;
        updateStep(context, 'parse-document', { status: 'running', startTime: Date.now() });

        const parseResult = await documentParser.invoke({
          buffer: input.buffer,
          filename: input.filename || 'document.txt',
          mimetype: input.mimetype || 'text/plain',
        });

        if (!parseResult.success || !parseResult.data) {
          updateStep(context, 'parse-document', {
            status: 'failed',
            endTime: Date.now(),
            error: parseResult.error?.message,
          });
          recordError(context, 'parse-document', parseResult.error?.message || 'Parse failed');

          return createAgentResult<ContentAnalysisOutput>(name, version, context, undefined, {
            code: 'PARSE_ERROR',
            message: 'Failed to parse document',
            details: parseResult.error,
          });
        }

        context.state.text = parseResult.data.text;
        updateStep(context, 'parse-document', {
          status: 'completed',
          endTime: Date.now(),
          result: parseResult,
        });

        options?.onStepComplete?.(parseStep, context);
      }

      // Ensure we have text to analyze
      const textToAnalyze = context.state.text || input.text;
      if (!textToAnalyze) {
        return createAgentResult<ContentAnalysisOutput>(name, version, context, undefined, {
          code: 'NO_TEXT',
          message: 'No text available for analysis',
        });
      }

      // Step 2: Extract metadata
      updateStep(context, 'extract-metadata', { status: 'running', startTime: Date.now() });

      const metadataResult = await documentMetadata.invoke({
        text: textToAnalyze,
        filename: context.state.filename,
      });

      if (!metadataResult.success || !metadataResult.data) {
        updateStep(context, 'extract-metadata', {
          status: 'failed',
          endTime: Date.now(),
          error: metadataResult.error?.message,
        });
        recordError(context, 'extract-metadata', metadataResult.error?.message || 'Metadata extraction failed');

        return createAgentResult<ContentAnalysisOutput>(name, version, context, undefined, {
          code: 'METADATA_ERROR',
          message: 'Failed to extract metadata',
          details: metadataResult.error,
        });
      }

      context.state.document = metadataResult.data;
      updateStep(context, 'extract-metadata', {
        status: 'completed',
        endTime: Date.now(),
        result: metadataResult,
      });

      options?.onStepComplete?.(
        context.steps.find((s) => s.id === 'extract-metadata')!,
        context
      );

      // Step 3: Sentiment analysis
      const sentimentStep = context.steps.find((s) => s.id === 'analyze-sentiment');
      if (sentimentStep && !input.skipSentiment) {
        updateStep(context, 'analyze-sentiment', { status: 'running', startTime: Date.now() });

        const sentimentResult = await sentimentAnalyzer.invoke({
          text: textToAnalyze.slice(0, 10000), // Limit to 10k chars
          emotions: input.emotions,
        });

        if (sentimentResult.success && sentimentResult.data) {
          context.state.sentiment = sentimentResult.data;
          updateStep(context, 'analyze-sentiment', {
            status: 'completed',
            endTime: Date.now(),
            result: sentimentResult,
          });
        } else {
          // Non-critical error, continue
          updateStep(context, 'analyze-sentiment', {
            status: 'failed',
            endTime: Date.now(),
            error: sentimentResult.error?.message,
          });
          recordError(
            context,
            'analyze-sentiment',
            sentimentResult.error?.message || 'Sentiment analysis failed'
          );
        }

        options?.onStepComplete?.(sentimentStep, context);
      }

      // Step 4: Decide on rhetoric analysis
      context.state.shouldAnalyzeRhetoric = shouldRunRhetoricAnalysis(input, context.state);

      const rhetorDecision = context.state.shouldAnalyzeRhetoric ? 'run' : 'skip';
      const rhetorCondition = input.forceRhetoric
        ? 'forceRhetoric=true'
        : input.skipRhetoric
          ? 'skipRhetoric=true'
          : context.state.document?.characteristics.isDialogic
            ? 'document is dialogic'
            : 'genre markers suggest argumentative content';

      recordDecision(context, 'rhetoric-analysis', rhetorCondition, rhetorDecision);
      options?.onDecision?.('rhetoric-analysis', rhetorCondition, rhetorDecision, context);

      const rhetoricStep = context.steps.find((s) => s.id === 'analyze-rhetoric')!;

      if (context.state.shouldAnalyzeRhetoric) {
        updateStep(context, 'analyze-rhetoric', { status: 'running', startTime: Date.now() });

        const exemplarPath = input.exemplarStorePath || DEFAULT_EXEMPLAR_PATH;

        // Determine segmentation method
        const segMethod = context.state.document?.characteristics.isDialogic
          ? 'speaker_turn'
          : 'sentence';

        const rhetoricResult = await rhetoricAnalyzer.invoke({
          text: textToAnalyze,
          exemplarStorePath: exemplarPath,
          inputFile: context.state.filename,
          segmentationMethod: segMethod as 'sentence' | 'speaker_turn',
          confidenceThreshold: 0.4,
        });

        if (rhetoricResult.success && rhetoricResult.data) {
          context.state.rhetoric = rhetoricResult.data;
          updateStep(context, 'analyze-rhetoric', {
            status: 'completed',
            endTime: Date.now(),
            result: rhetoricResult,
          });
        } else {
          // Non-critical error, continue
          updateStep(context, 'analyze-rhetoric', {
            status: 'failed',
            endTime: Date.now(),
            error: rhetoricResult.error?.message,
          });
          recordError(
            context,
            'analyze-rhetoric',
            rhetoricResult.error?.message || 'Rhetoric analysis failed'
          );
        }
      } else {
        updateStep(context, 'analyze-rhetoric', { status: 'skipped', endTime: Date.now() });
      }

      options?.onStepComplete?.(rhetoricStep, context);

      // Step 5: Synthesis
      updateStep(context, 'synthesize', { status: 'running', startTime: Date.now() });

      const synthesis = generateSynthesis(context.state);

      updateStep(context, 'synthesize', { status: 'completed', endTime: Date.now() });

      options?.onStepComplete?.(
        context.steps.find((s) => s.id === 'synthesize')!,
        context
      );

      // Return result
      const output: ContentAnalysisOutput = {
        document: context.state.document!,
        sentiment: context.state.sentiment,
        rhetoric: context.state.rhetoric,
        synthesis,
      };

      return createAgentResult(name, version, context, output);
    } catch (error) {
      recordError(context, 'unknown', error instanceof Error ? error.message : 'Unknown error');

      return createAgentResult<ContentAnalysisOutput>(name, version, context, undefined, {
        code: 'AGENT_ERROR',
        message: error instanceof Error ? error.message : 'Agent execution failed',
        details: error,
      });
    }
  },
};

export default contentAnalysisAgent;
