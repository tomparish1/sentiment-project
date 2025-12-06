import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(emotions = []) {
  let prompt = `You are a sentiment analysis expert. Analyze the given text and provide:
1. Overall sentiment (positive, negative, or neutral)
2. Confidence score (0-1)
3. Key emotional indicators found in the text
4. Brief explanation of your analysis`;

  if (emotions && emotions.length > 0) {
    prompt += `\n5. Emotion analysis for the following emotions: ${emotions.join(', ')}
   - For each emotion, provide an intensity score from 0-1 (0 = not present, 1 = very strong)`;
  }

  prompt += `\n\nFormat your response as JSON with these fields:
- sentiment: string
- confidence: number
- indicators: array of strings
- explanation: string`;

  if (emotions && emotions.length > 0) {
    prompt += `\n- emotions: object with emotion names as keys and intensity scores (0-1) as values`;
  }

  return prompt;
}

app.use(express.json());
app.use(express.static('public'));

app.post('/api/analyze', async (req, res) => {
  try {
    const { text, emotions } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const systemPrompt = buildSystemPrompt(emotions);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1536,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    });

    let responseText = message.content[0].text;

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const result = JSON.parse(responseText);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({
      error: 'Failed to analyze sentiment',
      details: error.message,
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.3.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Sentiment Analyzer v0.3.0`);
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop`);
});
