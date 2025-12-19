import { randomUUID } from 'crypto';
import type { Skill, SkillResult } from '../types.js';
import { createSkillResult } from '../types.js';
import { textSegmenter } from '../text-segmenter/index.js';
import { exemplarStore } from '../exemplar-store/index.js';
import { embeddingEngine, cosineSimilarity } from '../embedding-engine/index.js';
import {
  RhetoricAnalyzerInputSchema,
  type RhetoricAnalyzerInput,
  type RhetoricAnalyzerOutput,
  type ClassifiedSegment,
  type AlternativeClassification,
  type MatchedExemplar,
  type AnalysisSummary,
} from './schema.js';
import type { Exemplar, ExemplarMatch } from '../exemplar-store/schema.js';

interface VoteData {
  totalScore: number;
  count: number;
  maxScore: number;
  category: string;
}

function voteClassification(
  matches: ExemplarMatch[],
  exemplarTypeCounts: Map<string, number>,
  minExemplarsPerType: number,
  confidenceThreshold: number
): {
  winner: AlternativeClassification | null;
  alternatives: AlternativeClassification[];
} {
  const votes: Map<string, VoteData> = new Map();

  for (const { exemplar, similarity } of matches) {
    const moveType = exemplar.moveType;

    // Skip if not enough exemplars of this type
    const typeCount = exemplarTypeCounts.get(moveType) || 0;
    if (typeCount < minExemplarsPerType) continue;

    if (!votes.has(moveType)) {
      votes.set(moveType, {
        totalScore: 0,
        count: 0,
        maxScore: 0,
        category: exemplar.moveCategory,
      });
    }

    const data = votes.get(moveType)!;
    data.totalScore += similarity;
    data.count++;
    data.maxScore = Math.max(data.maxScore, similarity);
  }

  if (votes.size === 0) {
    return { winner: null, alternatives: [] };
  }

  // Score each move type (weighted voting)
  const scored: AlternativeClassification[] = [];
  for (const [moveType, data] of votes) {
    const avg = data.totalScore / data.count;
    const final = data.maxScore * 0.7 + avg * 0.3;

    scored.push({
      moveType,
      category: data.category,
      confidence: Math.round(final * 1000) / 1000,
    });
  }

  scored.sort((a, b) => b.confidence - a.confidence);

  const winner = scored[0];
  if (!winner || winner.confidence < confidenceThreshold) {
    return { winner: null, alternatives: scored.slice(0, 4) };
  }

  return {
    winner,
    alternatives: scored.slice(1, 4),
  };
}

function generateNarrative(
  moveCounts: Record<string, number>,
  categoryCounts: Record<string, number>,
  total: number,
  avgConf: number
): string {
  if (total === 0) {
    return 'No rhetorical moves detected above confidence threshold.';
  }

  const topMoves = Object.entries(moveCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topCats = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  let narrative = `Detected ${total} rhetorical moves (avg confidence: ${avgConf.toFixed(2)}). `;

  if (topMoves.length > 0) {
    const movesStr = topMoves.map(([m, c]) => `${m} (${c})`).join(', ');
    narrative += `Most frequent: ${movesStr}. `;
  }

  if (topCats.length > 0) {
    const topCat = topCats[0];
    if (topCat) {
      narrative += `Primary mode: ${topCat[0]}.`;
    }
  }

  return narrative;
}

export const rhetoricAnalyzer: Skill<RhetoricAnalyzerInput, RhetoricAnalyzerOutput> = {
  metadata: {
    name: 'rhetoric-analyzer',
    version: '1.0.0',
    description: 'Analyze text for rhetorical moves using exemplar-based classification',
    category: 'analysis',
    dependencies: ['text-segmenter', 'embedding-engine', 'exemplar-store'],
  },

  validate(input: RhetoricAnalyzerInput) {
    const result = RhetoricAnalyzerInputSchema.safeParse(input);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  async invoke(input: RhetoricAnalyzerInput): Promise<SkillResult<RhetoricAnalyzerOutput>> {
    const startTime = Date.now();
    const { name, version } = this.metadata;

    const validation = this.validate!(input);
    if (!validation.valid) {
      return createSkillResult<RhetoricAnalyzerOutput>(name, version, startTime, undefined, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors,
      });
    }

    try {
      const {
        text,
        exemplarStorePath,
        inputFile = '<stdin>',
        segmentationMethod = 'sentence',
        confidenceThreshold = 0.5,
        topK = 5,
        minExemplarsPerType = 3,
        includeAlternatives = true,
        includeExemplarMatches = true,
        maxAlternatives = 3,
      } = input;

      const analysisId = randomUUID().slice(0, 8);
      const timestamp = new Date().toISOString();

      // Step 1: Load exemplar store
      const loadResult = await exemplarStore.invoke({
        operation: 'load',
        storePath: exemplarStorePath,
        topK: 5,
        threshold: 0,
      });

      if (!loadResult.success || !loadResult.data?.exemplars) {
        return createSkillResult<RhetoricAnalyzerOutput>(name, version, startTime, undefined, {
          code: 'STORE_ERROR',
          message: 'Failed to load exemplar store',
          details: loadResult.error,
        });
      }

      const exemplars = loadResult.data.exemplars;
      if (exemplars.length === 0) {
        return createSkillResult<RhetoricAnalyzerOutput>(name, version, startTime, undefined, {
          code: 'NO_EXEMPLARS',
          message: 'Exemplar store is empty',
        });
      }

      // Count exemplars per type
      const exemplarTypeCounts = new Map<string, number>();
      for (const e of exemplars) {
        exemplarTypeCounts.set(e.moveType, (exemplarTypeCounts.get(e.moveType) || 0) + 1);
      }

      // Step 2: Segment the text
      const segmentResult = await textSegmenter.invoke({
        text,
        method: segmentationMethod,
        minWords: 5,
        maxWords: 100,
        overlapWords: 25,
        speakerPattern: '^([A-Z][A-Z\\s.]+):',
      });

      if (!segmentResult.success || !segmentResult.data) {
        return createSkillResult<RhetoricAnalyzerOutput>(name, version, startTime, undefined, {
          code: 'SEGMENTATION_ERROR',
          message: 'Failed to segment text',
          details: segmentResult.error,
        });
      }

      const textSegments = segmentResult.data.segments;

      if (textSegments.length === 0) {
        // Return empty result
        return createSkillResult(name, version, startTime, {
          id: analysisId,
          timestamp,
          inputFile,
          inputTextPreview: text.slice(0, 200),
          wordCount: text.split(/\s+/).length,
          config: { segmentationMethod, confidenceThreshold, topK },
          exemplarStore: { path: exemplarStorePath, exemplarCount: exemplars.length },
          segments: [],
          summary: {
            totalSegments: 0,
            classifiedSegments: 0,
            classificationRate: 0,
            averageConfidence: 0,
            moveCounts: {},
            categoryCounts: {},
            topMoves: [],
            narrative: 'No text segments to analyze.',
          },
        });
      }

      // Step 3: Classify each segment
      const classifiedSegments: ClassifiedSegment[] = [];
      const moveCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      let confidenceSum = 0;

      for (const segment of textSegments) {
        // Search for similar exemplars
        const searchResult = await exemplarStore.invoke({
          operation: 'search',
          storePath: exemplarStorePath,
          text: segment.text,
          topK,
          threshold: 0,
        });

        if (!searchResult.success || !searchResult.data?.matches) {
          continue;
        }

        const matches = searchResult.data.matches;
        if (matches.length === 0) continue;

        // Vote for classification
        const { winner, alternatives } = voteClassification(
          matches,
          exemplarTypeCounts,
          minExemplarsPerType,
          confidenceThreshold
        );

        if (!winner) continue;

        const classifiedSegment: ClassifiedSegment = {
          text: segment.text,
          start: segment.start,
          end: segment.end,
          moveType: winner.moveType,
          moveCategory: winner.category,
          confidence: winner.confidence,
          speaker: segment.speaker,
        };

        if (includeAlternatives && alternatives.length > 0) {
          classifiedSegment.alternatives = alternatives.slice(0, maxAlternatives);
        }

        if (includeExemplarMatches) {
          classifiedSegment.matchedExemplars = matches.slice(0, 3).map((m) => ({
            id: m.exemplar.id.slice(0, 8),
            text: m.exemplar.text.slice(0, 50),
            score: Math.round(m.similarity * 1000) / 1000,
          }));
        }

        classifiedSegments.push(classifiedSegment);

        // Update counts
        moveCounts[winner.moveType] = (moveCounts[winner.moveType] || 0) + 1;
        categoryCounts[winner.category] = (categoryCounts[winner.category] || 0) + 1;
        confidenceSum += winner.confidence;
      }

      // Step 4: Generate summary
      const avgConfidence =
        classifiedSegments.length > 0 ? confidenceSum / classifiedSegments.length : 0;

      const topMoves: [string, number][] = Object.entries(moveCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const summary: AnalysisSummary = {
        totalSegments: textSegments.length,
        classifiedSegments: classifiedSegments.length,
        classificationRate:
          textSegments.length > 0 ? classifiedSegments.length / textSegments.length : 0,
        averageConfidence: Math.round(avgConfidence * 1000) / 1000,
        moveCounts,
        categoryCounts,
        topMoves,
        narrative: generateNarrative(
          moveCounts,
          categoryCounts,
          classifiedSegments.length,
          avgConfidence
        ),
      };

      return createSkillResult(name, version, startTime, {
        id: analysisId,
        timestamp,
        inputFile,
        inputTextPreview: text.slice(0, 200),
        wordCount: text.split(/\s+/).length,
        config: { segmentationMethod, confidenceThreshold, topK },
        exemplarStore: { path: exemplarStorePath, exemplarCount: exemplars.length },
        segments: classifiedSegments,
        summary,
      });
    } catch (error) {
      return createSkillResult<RhetoricAnalyzerOutput>(name, version, startTime, undefined, {
        code: 'ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Rhetoric analysis failed',
        details: error,
      });
    }
  },
};

export default rhetoricAnalyzer;
