/**
 * Test script for Phase 2 rhetoric analysis skills
 * Run with: npx tsx scripts/test-skills.ts
 */

import { textSegmenter } from '../skills/text-segmenter/index.js';
import { embeddingEngine } from '../skills/embedding-engine/index.js';
import { exemplarStore } from '../skills/exemplar-store/index.js';
import { rhetoricAnalyzer } from '../skills/rhetoric-analyzer/index.js';

const EXEMPLAR_STORE_PATH = 'data/exemplars/starter.json';

// Test text with various rhetorical moves
const TEST_TEXT = `
Admittedly, there are valid concerns about this approach. Critics have raised important points that deserve consideration. However, the evidence strongly suggests that the benefits outweigh the risks.

In my twenty years of research in this field, I've consistently observed this pattern. The data shows a statistically significant correlation between early intervention and positive outcomes.

Now more than ever, we need to address this issue. Given the current crisis, this matter demands our immediate attention. The implications of inaction cannot be overstated.
`;

async function testTextSegmenter() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST: text-segmenter');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = await textSegmenter.invoke({
    text: TEST_TEXT,
    method: 'sentence',
    minWords: 5,
  });

  if (result.success && result.data) {
    console.log(`✓ Segmented into ${result.data.totalSegments} segments`);
    console.log(`  Method: ${result.data.method}`);
    console.log(`  Execution time: ${result.metadata.executionTimeMs}ms`);
    console.log('\n  Sample segments:');
    result.data.segments.slice(0, 3).forEach((seg, i) => {
      console.log(`  ${i + 1}. "${seg.text.slice(0, 60)}..." (${seg.wordCount} words)`);
    });
    return true;
  } else {
    console.log('✗ Segmentation failed:', result.error?.message);
    return false;
  }
}

async function testEmbeddingEngine() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST: embedding-engine');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('  (First run downloads model ~30MB, please wait...)\n');

  const result = await embeddingEngine.invoke({
    texts: [
      'Admittedly, there are valid concerns.',
      'However, the evidence suggests otherwise.',
      'The data shows a significant correlation.',
    ],
  });

  if (result.success && result.data) {
    console.log(`✓ Generated ${result.data.embeddings.length} embeddings`);
    console.log(`  Dimensions: ${result.data.dimensions}`);
    console.log(`  Model: ${result.data.model}`);
    console.log(`  Execution time: ${result.metadata.executionTimeMs}ms`);

    // Test similarity
    const { cosineSimilarity } = await import('../skills/embedding-engine/index.js');
    const sim12 = cosineSimilarity(result.data.embeddings[0], result.data.embeddings[1]);
    const sim13 = cosineSimilarity(result.data.embeddings[0], result.data.embeddings[2]);
    console.log(`\n  Similarity scores:`);
    console.log(`  - "Admittedly..." vs "However...": ${sim12.toFixed(3)}`);
    console.log(`  - "Admittedly..." vs "The data...": ${sim13.toFixed(3)}`);
    return true;
  } else {
    console.log('✗ Embedding failed:', result.error?.message);
    return false;
  }
}

async function testExemplarStore() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST: exemplar-store');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load store
  const loadResult = await exemplarStore.invoke({
    operation: 'load',
    storePath: EXEMPLAR_STORE_PATH,
  });

  if (!loadResult.success) {
    console.log('✗ Failed to load store:', loadResult.error?.message);
    return false;
  }

  console.log(`✓ Loaded ${loadResult.data?.exemplars?.length} exemplars`);

  // Get stats
  const statsResult = await exemplarStore.invoke({
    operation: 'stats',
    storePath: EXEMPLAR_STORE_PATH,
  });

  if (statsResult.success && statsResult.data?.stats) {
    const stats = statsResult.data.stats;
    console.log(`  Move types: ${Object.keys(stats.moveTypeCounts).join(', ')}`);
  }

  // Search for similar
  console.log('\n  Searching for similar exemplars to "I must admit this is true"...');
  const searchResult = await exemplarStore.invoke({
    operation: 'search',
    storePath: EXEMPLAR_STORE_PATH,
    text: 'I must admit this is true',
    topK: 3,
  });

  if (searchResult.success && searchResult.data?.matches) {
    console.log(`  Found ${searchResult.data.matches.length} matches:`);
    searchResult.data.matches.forEach((match, i) => {
      console.log(
        `  ${i + 1}. [${match.exemplar.moveType}] "${match.exemplar.text.slice(0, 40)}..." (${match.similarity.toFixed(3)})`
      );
    });
    console.log(`  Execution time: ${searchResult.metadata.executionTimeMs}ms`);
    return true;
  } else {
    console.log('✗ Search failed:', searchResult.error?.message);
    return false;
  }
}

async function testRhetoricAnalyzer() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST: rhetoric-analyzer (end-to-end)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = await rhetoricAnalyzer.invoke({
    text: TEST_TEXT,
    exemplarStorePath: EXEMPLAR_STORE_PATH,
    inputFile: 'test-input.txt',
    segmentationMethod: 'sentence',
    confidenceThreshold: 0.4,
    topK: 5,
    minExemplarsPerType: 2,
  });

  if (result.success && result.data) {
    const data = result.data;
    console.log(`✓ Analysis complete`);
    console.log(`  ID: ${data.id}`);
    console.log(`  Word count: ${data.wordCount}`);
    console.log(`  Total segments: ${data.summary.totalSegments}`);
    console.log(`  Classified: ${data.summary.classifiedSegments}`);
    console.log(`  Classification rate: ${(data.summary.classificationRate * 100).toFixed(1)}%`);
    console.log(`  Avg confidence: ${data.summary.averageConfidence.toFixed(3)}`);
    console.log(`  Execution time: ${result.metadata.executionTimeMs}ms`);

    console.log(`\n  Move counts:`);
    Object.entries(data.summary.moveCounts).forEach(([move, count]) => {
      console.log(`    - ${move}: ${count}`);
    });

    console.log(`\n  Narrative: ${data.summary.narrative}`);

    if (data.segments.length > 0) {
      console.log(`\n  Sample classified segments:`);
      data.segments.slice(0, 3).forEach((seg, i) => {
        console.log(
          `  ${i + 1}. [${seg.moveType}] (${seg.confidence.toFixed(2)}) "${seg.text.slice(0, 50)}..."`
        );
      });
    }

    return true;
  } else {
    console.log('✗ Analysis failed:', result.error?.message);
    console.log('  Details:', JSON.stringify(result.error?.details, null, 2));
    return false;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     Phase 2 Skills Test Suite                         ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  const results: Record<string, boolean> = {};

  // Test each skill
  results['text-segmenter'] = await testTextSegmenter();
  results['embedding-engine'] = await testEmbeddingEngine();
  results['exemplar-store'] = await testExemplarStore();
  results['rhetoric-analyzer'] = await testRhetoricAnalyzer();

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
