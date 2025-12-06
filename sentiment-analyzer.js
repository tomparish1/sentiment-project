import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemPrompt = `You are a sentiment analysis expert. Analyze the given text and provide:
1. Overall sentiment (positive, negative, or neutral)
2. Confidence score (0-1)
3. Key emotional indicators found in the text
4. Brief explanation of your analysis

Format your response as JSON with these fields:
- sentiment: string
- confidence: number
- indicators: array of strings
- explanation: string`;

async function analyzeSentiment(text) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: text,
      },
    ],
  });

  return JSON.parse(message.content[0].text);
}

// Example usage
const exampleText =
  "I absolutely loved the new restaurant! The service was impeccable and the food was divine.";

analyzeSentiment(exampleText)
  .then((result) => {
    console.log("Sentiment Analysis Result:");
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error("Error:", error);
  });
