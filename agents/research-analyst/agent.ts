import type { Agent, AgentResult, AgentOptions, WorkflowStep } from '../types.js';
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
import { textSegmenter } from '../../skills/text-segmenter/index.js';
import {
  ResearchAnalystInputSchema,
  type ResearchAnalystInput,
  type ResearchAnalystOutput,
  type ResearchAnalystState,
  type SpeakerAnalysis,
  type SpeakerComparison,
  type ResearchReport,
} from './schema.js';

const DEFAULT_EXEMPLAR_PATH = 'data/exemplars/starter.json';

function extractSpeakerTexts(text: string, speakers: string[]): Map<string, string> {
  const speakerTexts = new Map<string, string>();

  for (const speaker of speakers) {
    speakerTexts.set(speaker, '');
  }

  // Simple extraction: find speaker labels and collect their text
  const lines = text.split('\n');
  let currentSpeaker: string | null = null;

  for (const line of lines) {
    // Check if line starts with a speaker label
    for (const speaker of speakers) {
      const pattern = new RegExp(`^${speaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`, 'i');
      if (pattern.test(line)) {
        currentSpeaker = speaker;
        const content = line.replace(pattern, '').trim();
        if (content) {
          speakerTexts.set(speaker, (speakerTexts.get(speaker) || '') + ' ' + content);
        }
        break;
      }
    }

    // If we have a current speaker and line doesn't start with any speaker label
    if (currentSpeaker && !speakers.some((s) => new RegExp(`^${s}:`, 'i').test(line))) {
      if (line.trim()) {
        speakerTexts.set(
          currentSpeaker,
          (speakerTexts.get(currentSpeaker) || '') + ' ' + line.trim()
        );
      }
    }
  }

  // Trim all values
  for (const [speaker, speakerText] of speakerTexts) {
    speakerTexts.set(speaker, speakerText.trim());
  }

  return speakerTexts;
}

function extractNotableQuotes(text: string, maxQuotes: number = 3): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const quotes: string[] = [];

  // Look for sentences with strong indicators
  const strongIndicators = [
    'important',
    'crucial',
    'believe',
    'think',
    'feel',
    'must',
    'should',
    'amazing',
    'terrible',
    'love',
    'hate',
    'best',
    'worst',
    'never',
    'always',
  ];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (strongIndicators.some((ind) => lower.includes(ind))) {
      quotes.push(sentence.trim() + '.');
      if (quotes.length >= maxQuotes) break;
    }
  }

  // If not enough, take first few sentences
  if (quotes.length < maxQuotes) {
    for (const sentence of sentences) {
      if (!quotes.includes(sentence.trim() + '.')) {
        quotes.push(sentence.trim() + '.');
        if (quotes.length >= maxQuotes) break;
      }
    }
  }

  return quotes.slice(0, maxQuotes);
}

function generateComparison(speakerAnalyses: SpeakerAnalysis[]): SpeakerComparison {
  const sentimentComparison = speakerAnalyses
    .filter((s) => s.sentiment)
    .map((s) => ({
      speaker: s.speaker,
      sentiment: s.sentiment!.sentiment,
      confidence: s.sentiment!.confidence,
    }));

  let dynamics = '';
  let mostPositive: string | undefined;
  let mostNegative: string | undefined;

  if (sentimentComparison.length >= 2) {
    const positive = sentimentComparison.filter((s) => s.sentiment === 'positive');
    const negative = sentimentComparison.filter((s) => s.sentiment === 'negative');

    if (positive.length > 0) {
      const topPositive = positive.sort((a, b) => b.confidence - a.confidence)[0];
      mostPositive = topPositive?.speaker;
    }
    if (negative.length > 0) {
      const topNegative = negative.sort((a, b) => b.confidence - a.confidence)[0];
      mostNegative = topNegative?.speaker;
    }

    if (positive.length === sentimentComparison.length) {
      dynamics = 'All speakers maintain a positive tone throughout the discussion.';
    } else if (negative.length === sentimentComparison.length) {
      dynamics = 'The discussion has a predominantly negative tone across all speakers.';
    } else if (positive.length > 0 && negative.length > 0) {
      dynamics = `The discussion shows contrasting perspectives: ${mostPositive} tends toward positivity while ${mostNegative} expresses more critical views.`;
    } else {
      dynamics = 'Speakers maintain relatively neutral positions with some variation.';
    }
  } else if (sentimentComparison.length === 1) {
    const singleSpeaker = sentimentComparison[0];
    dynamics = `Single speaker analysis: ${singleSpeaker?.speaker ?? 'Unknown'} maintains a ${singleSpeaker?.sentiment ?? 'unknown'} tone.`;
  } else {
    dynamics = 'Unable to compare speaker sentiments.';
  }

  return {
    speakers: speakerAnalyses.map((s) => s.speaker),
    sentimentComparison,
    dynamics,
    mostPositive,
    mostNegative,
  };
}

function generateReport(
  state: ResearchAnalystState,
  comparison?: SpeakerComparison
): ResearchReport {
  const keyFindings: string[] = [];
  const speakerInsights: string[] = [];
  const rhetoricalPatterns: string[] = [];
  const conclusions: string[] = [];
  const methodology: string[] = [
    'Document parsing and metadata extraction',
    'Sentiment analysis using Claude API',
  ];

  // Document findings
  if (state.document) {
    keyFindings.push(
      `Document contains ${state.document.statistics.wordCount} words across ${state.document.statistics.paragraphCount} paragraphs.`
    );
    keyFindings.push(
      `Estimated reading time: ${state.document.statistics.estimatedReadingTimeMinutes} minutes.`
    );
  }

  // Overall sentiment
  if (state.overallSentiment) {
    keyFindings.push(
      `Overall document sentiment: ${state.overallSentiment.sentiment} (confidence: ${state.overallSentiment.confidence.toFixed(2)}).`
    );
  }

  // Rhetoric findings
  if (state.overallRhetoric) {
    methodology.push('Rhetoric analysis using embedding-based exemplar matching');
    const summary = state.overallRhetoric.summary;

    rhetoricalPatterns.push(
      `Identified ${summary.classifiedSegments} rhetorical moves across ${summary.totalSegments} segments.`
    );

    if (summary.topMoves.length > 0) {
      const topMovesStr = summary.topMoves
        .slice(0, 3)
        .map(([move, count]) => `${move} (${count})`)
        .join(', ');
      rhetoricalPatterns.push(`Dominant rhetorical strategies: ${topMovesStr}.`);
    }

    // Category insights
    const categories = Object.entries(summary.categoryCounts);
    if (categories.length > 0) {
      const topCategory = categories.sort((a, b) => b[1] - a[1])[0];
      if (topCategory) {
        rhetoricalPatterns.push(
          `Primary rhetorical mode: ${topCategory[0]} (${topCategory[1]} instances).`
        );
      }
    }
  }

  // Speaker insights
  if (state.isDialogic && state.speakerAnalyses.length > 0) {
    methodology.push('Per-speaker sentiment analysis');
    methodology.push('Comparative speaker dynamics analysis');

    for (const analysis of state.speakerAnalyses) {
      let insight = `${analysis.speaker}: ${analysis.wordCount} words`;
      if (analysis.sentiment) {
        insight += `, ${analysis.sentiment.sentiment} sentiment`;
      }
      speakerInsights.push(insight);
    }

    if (comparison) {
      speakerInsights.push(comparison.dynamics);
    }
  }

  // Generate executive summary
  let executiveSummary = `Analysis of "${state.filename}": `;

  if (state.isDialogic) {
    executiveSummary += `This is a dialogic document featuring ${state.speakerAnalyses.length} speakers. `;
  }

  if (state.overallSentiment) {
    executiveSummary += `The overall tone is ${state.overallSentiment.sentiment}. `;
  }

  if (state.overallRhetoric && state.overallRhetoric.summary.classifiedSegments > 0) {
    executiveSummary += state.overallRhetoric.summary.narrative + ' ';
  }

  if (comparison && state.speakerAnalyses.length >= 2) {
    executiveSummary += comparison.dynamics;
  }

  // Conclusions
  if (state.overallSentiment?.sentiment === 'positive') {
    conclusions.push('The document maintains a constructive and positive tone overall.');
  } else if (state.overallSentiment?.sentiment === 'negative') {
    conclusions.push('The document expresses critical or negative perspectives.');
  }

  if (state.overallRhetoric) {
    const topMove = state.overallRhetoric.summary.topMoves[0];
    if (topMove) {
      conclusions.push(
        `The primary rhetorical strategy employed is "${topMove[0]}", suggesting a ${topMove[0] === 'concession' ? 'nuanced argumentative' : topMove[0] === 'logos' ? 'evidence-based' : topMove[0] === 'ethos' ? 'credibility-focused' : 'structured'} approach.`
      );
    }
  }

  if (conclusions.length === 0) {
    conclusions.push('Further analysis may be needed for more specific conclusions.');
  }

  return {
    title: `Research Analysis: ${state.filename}`,
    executiveSummary: executiveSummary.trim(),
    methodology,
    keyFindings,
    speakerInsights,
    rhetoricalPatterns,
    conclusions,
    generatedAt: new Date().toISOString(),
  };
}

export const researchAnalystAgent: Agent<
  ResearchAnalystInput,
  ResearchAnalystOutput,
  ResearchAnalystState
> = {
  metadata: {
    name: 'research-analyst',
    version: '1.0.0',
    description: 'In-depth research analysis with speaker-level insights and comparative analysis',
    capabilities: [
      'Document parsing and metadata extraction',
      'Overall sentiment and rhetoric analysis',
      'Per-speaker sentiment analysis',
      'Speaker comparison and dynamics',
      'Research report generation',
    ],
    requiredSkills: [
      'document-parser',
      'document-metadata',
      'sentiment-analyzer',
      'text-segmenter',
      'rhetoric-analyzer',
    ],
  },

  validate(input: ResearchAnalystInput) {
    const result = ResearchAnalystInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  defineWorkflow(input: ResearchAnalystInput): WorkflowStep[] {
    const steps: WorkflowStep[] = [];

    if (input.buffer) {
      steps.push({
        id: 'parse-document',
        name: 'Parse Document',
        status: 'pending',
        skillName: 'document-parser',
      });
    }

    steps.push({
      id: 'extract-metadata',
      name: 'Extract Metadata',
      status: 'pending',
      skillName: 'document-metadata',
    });

    steps.push({
      id: 'overall-sentiment',
      name: 'Overall Sentiment Analysis',
      status: 'pending',
      skillName: 'sentiment-analyzer',
    });

    steps.push({
      id: 'overall-rhetoric',
      name: 'Overall Rhetoric Analysis',
      status: 'pending',
      skillName: 'rhetoric-analyzer',
    });

    steps.push({
      id: 'speaker-analysis',
      name: 'Per-Speaker Analysis',
      status: 'pending',
    });

    steps.push({
      id: 'generate-report',
      name: 'Generate Research Report',
      status: 'pending',
    });

    return steps;
  },

  async execute(
    input: ResearchAnalystInput,
    options?: AgentOptions
  ): Promise<AgentResult<ResearchAnalystOutput>> {
    const { name, version } = this.metadata;

    const validation = this.validate!(input);
    if (!validation.valid) {
      const steps = this.defineWorkflow(input);
      const context = createAgentContext<ResearchAnalystState>(steps, {
        filename: input.filename || 'document.txt',
        speakerTexts: new Map(),
        speakerAnalyses: [],
        isDialogic: false,
      });

      return createAgentResult<ResearchAnalystOutput>(name, version, context, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    const steps = this.defineWorkflow(input);
    const context = createAgentContext<ResearchAnalystState>(steps, {
      text: input.text,
      filename: input.filename || 'document.txt',
      speakerTexts: new Map(),
      speakerAnalyses: [],
      isDialogic: false,
    });

    try {
      // Step 1: Parse document (if buffer)
      if (input.buffer) {
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
          return createAgentResult<ResearchAnalystOutput>(name, version, context, undefined, {
            code: 'PARSE_ERROR',
            message: 'Failed to parse document',
            details: parseResult.error,
          });
        }

        context.state.text = parseResult.data.text;
        updateStep(context, 'parse-document', { status: 'completed', endTime: Date.now() });
      }

      const textToAnalyze = context.state.text || input.text;
      if (!textToAnalyze) {
        return createAgentResult<ResearchAnalystOutput>(name, version, context, undefined, {
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
        return createAgentResult<ResearchAnalystOutput>(name, version, context, undefined, {
          code: 'METADATA_ERROR',
          message: 'Failed to extract metadata',
          details: metadataResult.error,
        });
      }

      context.state.document = metadataResult.data;
      context.state.isDialogic = metadataResult.data.characteristics.isDialogic;
      updateStep(context, 'extract-metadata', { status: 'completed', endTime: Date.now() });

      // Step 3: Overall sentiment
      updateStep(context, 'overall-sentiment', { status: 'running', startTime: Date.now() });

      const sentimentResult = await sentimentAnalyzer.invoke({
        text: textToAnalyze.slice(0, 10000),
        emotions: input.emotions,
      });

      if (sentimentResult.success && sentimentResult.data) {
        context.state.overallSentiment = sentimentResult.data;
        updateStep(context, 'overall-sentiment', { status: 'completed', endTime: Date.now() });
      } else {
        updateStep(context, 'overall-sentiment', {
          status: 'failed',
          endTime: Date.now(),
          error: sentimentResult.error?.message,
        });
        recordError(context, 'overall-sentiment', sentimentResult.error?.message || 'Failed');
      }

      // Step 4: Overall rhetoric
      updateStep(context, 'overall-rhetoric', { status: 'running', startTime: Date.now() });

      const exemplarPath = input.exemplarStorePath || DEFAULT_EXEMPLAR_PATH;
      const segMethod = context.state.isDialogic ? 'speaker_turn' : 'sentence';

      const rhetoricResult = await rhetoricAnalyzer.invoke({
        text: textToAnalyze,
        exemplarStorePath: exemplarPath,
        inputFile: context.state.filename,
        segmentationMethod: segMethod as 'sentence' | 'speaker_turn',
        confidenceThreshold: 0.4,
      });

      if (rhetoricResult.success && rhetoricResult.data) {
        context.state.overallRhetoric = rhetoricResult.data;
        updateStep(context, 'overall-rhetoric', { status: 'completed', endTime: Date.now() });
      } else {
        updateStep(context, 'overall-rhetoric', {
          status: 'failed',
          endTime: Date.now(),
          error: rhetoricResult.error?.message,
        });
        recordError(context, 'overall-rhetoric', rhetoricResult.error?.message || 'Failed');
      }

      // Step 5: Per-speaker analysis (if dialogic)
      updateStep(context, 'speaker-analysis', { status: 'running', startTime: Date.now() });

      if (context.state.isDialogic && context.state.document) {
        const speakers = context.state.document.characteristics.speakers.slice(
          0,
          input.maxSpeakers || 5
        );

        recordDecision(
          context,
          'speaker-analysis',
          `Document is dialogic with ${speakers.length} speakers`,
          'run per-speaker analysis'
        );

        context.state.speakerTexts = extractSpeakerTexts(textToAnalyze, speakers);

        for (const speaker of speakers) {
          const speakerText = context.state.speakerTexts.get(speaker) || '';
          const wordCount = speakerText.split(/\s+/).filter((w) => w.length > 0).length;

          const analysis: SpeakerAnalysis = {
            speaker,
            wordCount,
            segmentCount: 0,
          };

          // Analyze speaker sentiment if they have enough text
          if (wordCount >= 20) {
            const speakerSentiment = await sentimentAnalyzer.invoke({
              text: speakerText.slice(0, 5000),
              emotions: input.emotions,
            });

            if (speakerSentiment.success && speakerSentiment.data) {
              analysis.sentiment = speakerSentiment.data;
            }

            if (input.includeQuotes !== false) {
              analysis.notableQuotes = extractNotableQuotes(speakerText, 2);
            }
          }

          context.state.speakerAnalyses.push(analysis);
        }

        updateStep(context, 'speaker-analysis', { status: 'completed', endTime: Date.now() });
      } else {
        recordDecision(
          context,
          'speaker-analysis',
          'Document is not dialogic',
          'skip per-speaker analysis'
        );
        updateStep(context, 'speaker-analysis', { status: 'skipped', endTime: Date.now() });
      }

      // Step 6: Generate report
      updateStep(context, 'generate-report', { status: 'running', startTime: Date.now() });

      const comparison =
        context.state.speakerAnalyses.length >= 2
          ? generateComparison(context.state.speakerAnalyses)
          : undefined;

      const report = generateReport(context.state, comparison);

      updateStep(context, 'generate-report', { status: 'completed', endTime: Date.now() });

      // Build output
      const output: ResearchAnalystOutput = {
        document: context.state.document!,
        overall: {
          sentiment: context.state.overallSentiment,
          rhetoric: context.state.overallRhetoric,
        },
        speakers: context.state.speakerAnalyses.length > 0 ? context.state.speakerAnalyses : undefined,
        comparison,
        report,
      };

      return createAgentResult(name, version, context, output);
    } catch (error) {
      recordError(context, 'unknown', error instanceof Error ? error.message : 'Unknown error');

      return createAgentResult<ResearchAnalystOutput>(name, version, context, undefined, {
        code: 'AGENT_ERROR',
        message: error instanceof Error ? error.message : 'Agent execution failed',
        details: error,
      });
    }
  },
};

export default researchAnalystAgent;
