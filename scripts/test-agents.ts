/**
 * Test script for Phase 3 agents
 * Run with: npx tsx scripts/test-agents.ts
 */

import { contentAnalysisAgent } from '../agents/content-analysis/index.js';
import { researchAnalystAgent } from '../agents/research-analyst/index.js';
import { getAgentNames, getAllAgentMetadata } from '../agents/registry.js';

const EXEMPLAR_STORE_PATH = 'data/exemplars/starter.json';

// Test text - a simple argumentative passage
const SIMPLE_TEXT = `
The evidence clearly demonstrates that early intervention programs yield significant benefits.
Admittedly, critics have raised valid concerns about implementation costs.
However, longitudinal studies consistently show positive outcomes across diverse populations.

In my experience as a researcher in this field, I've observed these patterns repeatedly.
The data shows a statistically significant correlation between program participation and success.
Now more than ever, we need to prioritize these initiatives.
`;

// Test text - a transcript with multiple speakers
const TRANSCRIPT_TEXT = `
HOST: Welcome to our discussion on technology ethics. Today we have two experts joining us.

DR. SMITH: Thank you for having me. I believe we're at a critical juncture in AI development.

PROF. JONES: I must respectfully disagree with some of the alarmist narratives we're seeing.

HOST: Interesting perspectives. Dr. Smith, could you elaborate on your concerns?

DR. SMITH: Certainly. The research clearly demonstrates potential risks that we cannot ignore. In my twenty years of studying AI safety, I've consistently observed these warning signs.

PROF. JONES: To be fair, there are valid concerns. However, the evidence also shows tremendous benefits. We need a balanced approach, not fear-mongering.

HOST: It sounds like there's some common ground here. Thank you both for this illuminating discussion.
`;

async function testRegistryFunctions() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST: Agent Registry');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const names = getAgentNames();
  console.log(`✓ Registered agents: ${names.join(', ')}`);

  const metadata = getAllAgentMetadata();
  console.log(`\n  Agent details:`);
  for (const meta of metadata) {
    console.log(`  - ${meta.name} v${meta.version}`);
    console.log(`    ${meta.description}`);
    console.log(`    Skills: ${meta.requiredSkills.join(', ')}`);
  }

  return names.length === 2;
}

async function testContentAnalysisAgent() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST: content-analysis agent');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = await contentAnalysisAgent.execute(
    {
      text: SIMPLE_TEXT,
      filename: 'test-article.txt',
      exemplarStorePath: EXEMPLAR_STORE_PATH,
      emotions: ['trust', 'anticipation'],
    },
    {
      onStepComplete: (step) => {
        console.log(`  → ${step.name}: ${step.status}`);
      },
      onDecision: (point, condition, outcome) => {
        console.log(`  ⚡ Decision [${point}]: ${condition} → ${outcome}`);
      },
    }
  );

  if (result.success && result.data) {
    console.log(`\n✓ Analysis complete`);
    console.log(`  Execution ID: ${result.metadata.executionId}`);
    console.log(`  Steps: ${result.metadata.stepsCompleted}/${result.metadata.totalSteps}`);
    console.log(`  Time: ${result.metadata.executionTimeMs}ms`);

    console.log(`\n  Document:`);
    console.log(`    Words: ${result.data.document.statistics.wordCount}`);
    console.log(`    Genre: ${result.data.document.characteristics.genreMarkers[0]?.genre || 'unknown'}`);

    if (result.data.sentiment) {
      console.log(`\n  Sentiment:`);
      console.log(`    ${result.data.sentiment.sentiment} (${result.data.sentiment.confidence.toFixed(2)})`);
    }

    if (result.data.rhetoric) {
      console.log(`\n  Rhetoric:`);
      console.log(`    Moves detected: ${result.data.rhetoric.summary.classifiedSegments}`);
      console.log(`    ${result.data.rhetoric.summary.narrative}`);
    }

    console.log(`\n  Synthesis:`);
    console.log(`    ${result.data.synthesis.summary}`);

    return true;
  } else {
    console.log(`✗ Analysis failed: ${result.error?.message}`);
    console.log(`  Details:`, result.error?.details);
    return false;
  }
}

async function testResearchAnalystAgent() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST: research-analyst agent (transcript)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = await researchAnalystAgent.execute(
    {
      text: TRANSCRIPT_TEXT,
      filename: 'panel-discussion.txt',
      exemplarStorePath: EXEMPLAR_STORE_PATH,
      emotions: ['trust', 'fear'],
      includeQuotes: true,
    },
    {
      onStepComplete: (step) => {
        console.log(`  → ${step.name}: ${step.status}`);
      },
      onDecision: (point, condition, outcome) => {
        console.log(`  ⚡ Decision [${point}]: ${condition} → ${outcome}`);
      },
    }
  );

  if (result.success && result.data) {
    console.log(`\n✓ Research analysis complete`);
    console.log(`  Execution ID: ${result.metadata.executionId}`);
    console.log(`  Steps: ${result.metadata.stepsCompleted}/${result.metadata.totalSteps}`);
    console.log(`  Time: ${result.metadata.executionTimeMs}ms`);

    console.log(`\n  Document:`);
    console.log(`    Words: ${result.data.document.statistics.wordCount}`);
    console.log(`    Dialogic: ${result.data.document.characteristics.isDialogic}`);
    console.log(`    Speakers: ${result.data.document.characteristics.speakers.join(', ')}`);

    if (result.data.speakers && result.data.speakers.length > 0) {
      console.log(`\n  Speaker Analysis:`);
      for (const speaker of result.data.speakers) {
        let line = `    ${speaker.speaker}: ${speaker.wordCount} words`;
        if (speaker.sentiment) {
          line += `, ${speaker.sentiment.sentiment} sentiment`;
        }
        console.log(line);
        if (speaker.notableQuotes && speaker.notableQuotes.length > 0) {
          console.log(`      Quote: "${speaker.notableQuotes[0].slice(0, 60)}..."`);
        }
      }
    }

    if (result.data.comparison) {
      console.log(`\n  Comparison:`);
      console.log(`    ${result.data.comparison.dynamics}`);
    }

    console.log(`\n  Report:`);
    console.log(`    Title: ${result.data.report.title}`);
    console.log(`    Summary: ${result.data.report.executiveSummary.slice(0, 200)}...`);

    console.log(`\n  Key Findings:`);
    result.data.report.keyFindings.slice(0, 3).forEach((finding, i) => {
      console.log(`    ${i + 1}. ${finding}`);
    });

    return true;
  } else {
    console.log(`✗ Analysis failed: ${result.error?.message}`);
    console.log(`  Details:`, result.error?.details);
    return false;
  }
}

async function testWorkflowContext() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST: Workflow Context & Decision Tracking');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test with skipRhetoric to see decision tracking
  const result = await contentAnalysisAgent.execute({
    text: 'This is a simple positive message. I love this!',
    filename: 'simple.txt',
    skipRhetoric: true,
  });

  if (result.success) {
    console.log(`✓ Workflow completed`);

    console.log(`\n  Steps executed:`);
    for (const step of result.context.steps) {
      const time = step.endTime && step.startTime ? `${step.endTime - step.startTime}ms` : '-';
      console.log(`    [${step.status}] ${step.name} (${time})`);
    }

    console.log(`\n  Decisions made:`);
    for (const decision of result.context.decisions) {
      console.log(`    ${decision.point}: ${decision.condition} → ${decision.outcome}`);
    }

    if (result.context.errors.length > 0) {
      console.log(`\n  Errors:`);
      for (const error of result.context.errors) {
        console.log(`    ${error.step}: ${error.error}`);
      }
    }

    return true;
  } else {
    console.log(`✗ Failed: ${result.error?.message}`);
    return false;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     Phase 3 Agents Test Suite                         ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  const results: Record<string, boolean> = {};

  results['registry'] = await testRegistryFunctions();
  results['content-analysis'] = await testContentAnalysisAgent();
  results['research-analyst'] = await testResearchAnalystAgent();
  results['workflow-context'] = await testWorkflowContext();

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let failed = 0;

  Object.entries(results).forEach(([name, success]) => {
    if (success) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name}`);
      failed++;
    }
  });

  console.log(`\n  Total: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
