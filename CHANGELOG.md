# Changelog

All notable changes to the Writer's Portal project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.0] - 2026-01-03

### Changed
- **Project Renamed**: `sentiment-project` → `writers-portal`
  - Reflects evolution from simple sentiment analyzer to full document analysis platform
  - Updated package.json name and description
  - Updated all internal version strings and branding

- **Documentation Reorganized**:
  - Moved specifications to `docs/specs/` directory
  - `NLP_FRONTEND_SPECIFICATION.md` - Natural language interface spec
  - `RHETORIC_ANALYZER_SPEC.md` - Rhetoric analysis specification
  - `EMBEDDING_ANALYZER_SPEC.md` - Embedding system specification

- **README Rewritten**: Comprehensive documentation reflecting current architecture
  - Agents & Skills architecture overview
  - API endpoint documentation
  - Project structure guide
  - Development workflow

### Added
- **NLP Front-End Specification** (`docs/specs/NLP_FRONTEND_SPECIFICATION.md`)
  - Intent classification system design
  - Parameter extraction layer
  - Conversation context management
  - Response formatting templates
  - Chat UI wireframes
  - OpenAPI specification for NLP endpoints
  - 5-phase implementation plan

### Technical Details
- Updated external references in `agent-roster` project
- All builds and type checks passing
- No breaking changes to existing API

---

## [0.4.0] - 2025-12-18

### Added
- **Agents Architecture**: Orchestrators for complex multi-step workflows
  - Content Analysis Agent - comprehensive document analysis
  - Research Analyst Agent - speaker-focused analysis for dialogues
  - Agent registry for dynamic discovery

- **Skills Architecture**: Focused, reusable capabilities
  - document-parser - PDF, DOCX, TXT, MD extraction
  - document-metadata - statistics, genre detection, speaker identification
  - sentiment-analyzer - sentiment with 10 emotion types
  - rhetoric-analyzer - rhetorical move classification
  - text-segmenter - sentence, paragraph, speaker turn segmentation
  - embedding-engine - vector embeddings for similarity
  - exemplar-store - rhetoric exemplar management
  - Skill registry for dynamic discovery

- **Portal UI** (`public/portal.html`) - Unified interface for all agents

- **Swagger/OpenAPI Documentation** at `/api/docs`

### Technical Details
- TypeScript throughout
- Zod schema validation
- Workflow tracking with decision recording
- Modular, extensible architecture

---

## [0.3.0] - 2025-12-06

### Added
- **Emotion Analysis Feature**: Comprehensive emotion detection with customizable options
  - 10 emotions available: Joy, Anger, Sadness, Fear, Surprise, Disgust, Love, Trust, Anticipation, Confusion
  - Toggleable emotion selection with checkboxes
  - Default emotions enabled: 6 basic emotions (Joy, Anger, Sadness, Fear, Surprise, Disgust)
  - Optional emotions: Love, Trust, Anticipation, Confusion
  - Show/Hide toggle for emotion options panel

- **Emotion Visualization**: Beautiful color-coded emotion bars
  - Intensity scores from 0-100% for each emotion
  - Sorted by intensity (highest to lowest)
  - Unique color scheme for each emotion
  - Emoji indicators for visual clarity
  - Animated progress bars
  - Purple/pink gradient card design

### Changed
- **Enhanced System Prompt**: Dynamic prompt building based on selected emotions
- **Increased API Token Limit**: Raised from 1024 to 1536 tokens to accommodate emotion analysis
- **UI Layout**: Added emotion options panel above analyze button
- **Results Display**: Emotion results shown in dedicated section when analysis includes emotions

### Technical Details
- Emotion data passed to API via POST request
- Server-side prompt generation with emotion-specific instructions
- Client-side emotion parsing and visualization
- Collapsible emotion options for cleaner interface
- Tailwind CSS classes for emotion bars and styling

---

## [0.2.1] - 2025-12-06

### Added
- **Server Status Indicator**: Live server status badge in UI header
  - Green pulsing indicator when server is online
  - Red indicator when server is offline
  - Automatic health check every 30 seconds
  - Visual feedback for server connectivity

- **Tailwind CSS Integration**: Modern, utility-first CSS framework
  - Replaced custom CSS with Tailwind classes
  - Gradient backgrounds and modern card designs
  - Improved responsive design for all screen sizes
  - Better hover states and transitions
  - Enhanced color schemes and typography

- **Server Control Scripts**: Easy-to-use shell scripts
  - `start-server.sh` - Automated server startup with dependency checks
  - `stop-server.sh` - Clean server shutdown script
  - Both scripts are executable and user-friendly

### Changed
- **UI Redesign**: Complete visual overhaul using Tailwind CSS
  - Modern gradient header with transparent text effect
  - Improved button styling with shadow effects
  - Better spacing and padding throughout
  - Enhanced cards with subtle borders and backgrounds
  - More polished sentiment badges and confidence bars
  - Improved dark mode JSON viewer

### Fixed
- **JSON Parsing Error**: Fixed issue with Claude API returning markdown-wrapped JSON
  - Server now strips markdown code blocks before parsing
  - Handles both plain JSON and markdown-formatted responses
  - More robust error handling

### Technical Details
- Tailwind CSS loaded via CDN (no build step required)
- Server health endpoint returns version and timestamp
- Improved JavaScript with server status monitoring
- Shell scripts for streamlined server management

---

## [0.2.0] - 2025-12-06

### Added
- **Web UI**: Modern, responsive web interface for sentiment analysis
  - Clean, intuitive design with gradient buttons and smooth animations
  - Real-time loading indicators during analysis
  - Visual sentiment badges (positive/negative/neutral)
  - Confidence score displayed as animated progress bar
  - Key emotional indicators shown as tags
  - Detailed explanation section
  - Raw JSON response viewer
  - Example text loader with multiple sample texts
  - Keyboard shortcut (Ctrl+Enter) to analyze
  - Error handling with user-friendly messages
  - Mobile-responsive design

- **Express Web Server**: RESTful API server
  - `/api/analyze` endpoint for sentiment analysis
  - `/api/health` endpoint for health checks
  - Static file serving for web UI
  - Request validation and error handling
  - Environment variable configuration

- **Project Documentation**:
  - ROADMAP.md with planned features through v1.0.0
  - CHANGELOG.md for version tracking
  - Comprehensive feature planning

### Changed
- Project structure reorganized with `public/` directory for web assets
- Version bumped to 0.2.0
- Enhanced error messages and user feedback

### Technical Details
- Express.js server with API routes
- Vanilla JavaScript frontend (no framework dependencies)
- CSS custom properties for theming
- Modular file structure for maintainability

### Security Notes
- **API Key Storage**: Uses `.env` file for local API key storage
  - `.env` file is included in `.gitignore` to prevent accidental commits
  - Suitable for local development on trusted machines
  - User concern noted: storing API keys in local files
  - Current decision: Standard practice for local development, file remains on local MacOS drive only
  - Recommendation: Users can optionally set `chmod 600 .env` for additional file-level protection
  - Future consideration: May add encrypted key storage or system keychain integration in later versions

---

## [0.1.0] - 2025-12-06

### Added
- Initial command-line sentiment analyzer
- Claude API integration using Sonnet 4
- Basic sentiment analysis features:
  - Overall sentiment detection (positive/negative/neutral)
  - Confidence scoring (0-1 scale)
  - Key emotional indicators extraction
  - Detailed analysis explanations
- JSON output format
- Example usage in code
- Environment variable configuration (.env)
- Basic project setup:
  - package.json with dependencies
  - README.md with setup instructions
  - .gitignore for version control
  - .env.example template

### Technical Details
- Node.js ES modules
- @anthropic-ai/sdk v0.32.1
- Claude Sonnet 4 model (claude-sonnet-4-20250514)
- System prompt engineering for structured output

---

## Version History Summary

- **v0.5.0** - Project renamed to Writer's Portal, NLP front-end specification
- **v0.4.0** - Agents & Skills architecture, Portal UI
- **v0.3.0** - Emotion analysis feature
- **v0.2.1** - Server status indicator, Tailwind CSS
- **v0.2.0** - Web UI and API server
- **v0.1.0** - CLI tool initial release

---

## Upgrade Notes

### Upgrading from 0.1.0 to 0.2.0

1. Install new dependencies:
   ```bash
   npm install
   ```

2. The original CLI functionality is preserved in `sentiment-analyzer.js`

3. Start the web server:
   ```bash
   npm run dev
   ```

4. No breaking changes to the core analysis API

---

## Future Releases

See [ROADMAP.md](./ROADMAP.md) for planned features and upcoming versions.

---

**Note:** This project is under active development. Features and APIs may change between minor versions until v1.0.0 is released.
