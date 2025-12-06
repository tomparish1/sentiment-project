# Sentiment Analyzer

A sentiment analysis tool with a modern web UI, powered by Claude API to analyze text for emotional content and sentiment.

**Current Version:** v0.3.0

## Features

### Analysis Capabilities
- Analyzes overall sentiment (positive, negative, neutral)
- Provides confidence scores (0-100%)
- **Emotion Analysis**: Detects up to 10 different emotions with intensity scores
  - Joy, Anger, Sadness, Fear, Surprise, Disgust (6 basic emotions)
  - Love, Trust, Anticipation, Confusion (extended emotions)
  - Customizable: Select which emotions to analyze
- Identifies key emotional indicators
- Gives detailed explanations of analysis

### Web Interface
- Modern, responsive design with Tailwind CSS
- Live server status indicator
- Real-time sentiment analysis
- **Emotion Analysis Controls**: Toggle emotions on/off with checkboxes
- **Emotion Visualization**: Color-coded bars showing emotion intensity
- Visual confidence indicators with animated progress bars
- Multiple example texts
- Mobile-friendly interface
- Error handling with user feedback
- Gradient backgrounds and polished UI elements

### API
- RESTful API endpoints
- Health check endpoint with version info
- JSON responses

## Quick Start

### Easy Start (Recommended)
Use the provided shell script to start the server:
```bash
./start-server.sh
```

This script will:
- Check for `.env` file and create if missing
- Install dependencies if needed
- Start the server

### Manual Start

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Configure API Key
Create a `.env` file with your Anthropic API key:
```bash
cp .env.example .env
# Edit .env and add your API key:
# ANTHROPIC_API_KEY=your_api_key_here
```

#### 3. Start the Server
```bash
npm start
```

The web interface will be available at `http://localhost:3000`

### Stopping the Server

Use the stop script:
```bash
./stop-server.sh
```

Or press `Ctrl+C` in the terminal where the server is running

## Usage

### Web Interface
1. Open your browser to `http://localhost:3000`
2. Enter or paste text in the input area
3. Click "Analyze Sentiment" or press Ctrl+Enter
4. View the results including sentiment, confidence, indicators, and explanation

### CLI Mode (Original)
You can still use the command-line version:
```bash
npm run cli
```

### API Endpoints

#### Analyze Text
```bash
POST /api/analyze
Content-Type: application/json

{
  "text": "Your text to analyze here"
}
```

Response:
```json
{
  "sentiment": "positive",
  "confidence": 0.95,
  "indicators": ["loved", "impeccable", "divine"],
  "explanation": "The text expresses strong positive sentiment..."
}
```

#### Health Check
```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "version": "0.2.0",
  "timestamp": "2025-12-06T..."
}
```

## Project Structure

```
sentiment/
├── public/                  # Web UI files
│   ├── index.html          # Main HTML page
│   ├── styles.css          # Styling
│   └── app.js              # Client-side JavaScript
├── server.js               # Express server
├── sentiment-analyzer.js   # CLI version
├── package.json            # Dependencies
├── ROADMAP.md             # Future features
├── CHANGELOG.md           # Version history
├── .env.example           # Environment template
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## Configuration

### Environment Variables
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `PORT`: Server port (default: 3000)

### Customization
- Edit `server.js` to modify the analysis prompt or model
- Edit `public/app.js` to add example texts or modify UI behavior
- Edit `public/styles.css` to customize the appearance

## Development

### Scripts
- `npm start` - Start the web server
- `npm run dev` - Start in development mode (same as start)
- `npm run cli` - Run the CLI version

### Adding New Features
See [ROADMAP.md](./ROADMAP.md) for planned features and version timeline.

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## Roadmap

Planned features include:
- Batch text processing
- File upload support
- Emotion detection
- Multi-language support
- Analytics dashboard

See the full roadmap in [ROADMAP.md](./ROADMAP.md).

## Troubleshooting

### API Key Issues
- Ensure your `.env` file exists and contains a valid `ANTHROPIC_API_KEY`
- Check that the `.env` file is in the root directory

### Port Already in Use
- Change the port by setting `PORT` in your `.env` file:
  ```
  PORT=3001
  ```

### Dependencies Not Found
- Run `npm install` to install all required packages

## License

ISC

## Support

For issues or questions, please check:
- [CHANGELOG.md](./CHANGELOG.md) for recent changes
- [ROADMAP.md](./ROADMAP.md) for planned features
