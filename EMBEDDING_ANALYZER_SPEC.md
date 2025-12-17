# Embedding-Based Writing Analyzer

## Implementation Specification

**Version:** 1.0  
**Date:** December 9, 2025  
**Author:** Claude (Opus 4.5) with Tom Dison  
**Status:** Ready for implementation  
**Target:** Additional analyzer module for sentiment-analyzer project

---

## 1. Overview

### Purpose

This analyzer uses sentence embeddings and exemplar-based classification to detect patterns in writing. Unlike lexicon or rule-based analyzers, it learns from examples you provide, making it adaptable to any analytical framework you want to apply.

### Core Concept

You define analysis categories by collecting examples. The analyzer computes vector representations of those examples, then classifies new text by finding which examples it most resembles. This approach works for any writing analysis task where you can provide representative samples.

### Why Embedding-Based?

Lexicon approaches require you to enumerate words and phrases. Pattern-based approaches require you to specify rules. Embedding approaches require only examples. This makes them ideal for detecting qualities that are easier to recognize than to define: intellectual rigor, emotional authenticity, hedged versus confident claims, narrative momentum, and so on.

---

## 2. Analysis Domains

The analyzer supports multiple analysis domains. Each domain has its own taxonomy of categories and its own exemplar collection. Users can enable one or more domains for any analysis run.

### Built-in Domains

**rhetorical_moves** — Discourse-level patterns in argumentation
- Categories: concession, contrast, elaboration, evidence_citation, question_raising, reframing, summary, transition, appeal_ethos, appeal_pathos, appeal_logos

**epistemic_stance** — How writers position their certainty and knowledge claims
- Categories: assertion, hedged_claim, speculation, question, acknowledgment_of_limits, citation_of_authority, personal_experience

**emotional_register** — Emotional coloring beyond simple sentiment
- Categories: enthusiasm, concern, skepticism, curiosity, frustration, warmth, detachment, urgency, reflection

**narrative_function** — What a passage does in storytelling or explanation
- Categories: scene_setting, character_introduction, conflict_introduction, rising_action, climax_moment, resolution, reflection, foreshadowing, backstory

**intellectual_style** — Markers of thinking and reasoning approach
- Categories: analytical, synthetic, speculative, empirical, dialectical, intuitive, systematic, exploratory

### Custom Domains

Users can define their own domains with custom taxonomies. A domain definition requires only a name and a list of category names. Exemplars are then collected for each category.

---

## 3. Data Structures

### Exemplar Schema

```python
@dataclass
class Exemplar:
    id: str                      # UUID
    text: str                    # The example text segment
    domain: str                  # e.g., "rhetorical_moves"
    category: str                # e.g., "concession"
    
    # Optional context
    context_before: str | None   # Preceding text for context
    context_after: str | None    # Following text for context
    
    # Source tracking
    source_file: str | None      # Original file path
    source_title: str | None     # Document/episode title
    source_location: str | None  # Page, timestamp, paragraph number
    
    # Annotation metadata
    confidence: str              # "high", "medium", "low"
    notes: str | None            # Annotator's reasoning
    annotated_by: str | None     # Who created this exemplar
    annotated_date: str          # ISO date
    
    # Computed fields
    embedding: list[float]       # Vector representation
    embedding_model: str         # Model used to generate embedding
```

### Domain Configuration Schema

```python
@dataclass
class DomainConfig:
    name: str                           # Domain identifier
    display_name: str                   # Human-readable name
    description: str                    # What this domain analyzes
    categories: list[CategoryConfig]    # Available categories
    enabled: bool = True                # Whether to include in analysis
    
    # Analysis parameters
    similarity_threshold: float = 0.45  # Minimum score for classification
    top_k: int = 3                      # Number of exemplars for voting
    require_minimum_exemplars: int = 3  # Per category before enabling

@dataclass 
class CategoryConfig:
    name: str                           # Category identifier
    display_name: str                   # Human-readable name
    description: str                    # What this category represents
    color: str | None = None            # For UI display (hex)
    exemplar_count: int = 0             # Current count (computed)
```

### Classification Result Schema

```python
@dataclass
class EmbeddingMatch:
    segment_text: str
    segment_start: int
    segment_end: int
    
    domain: str
    category: str
    confidence: float               # 0.0 to 1.0
    
    # Supporting evidence
    similar_exemplars: list[dict]   # Top matching exemplars with scores
    
    # Metadata
    model_used: str
    threshold_applied: float

@dataclass
class EmbeddingAnalysisResult(AnalysisResult):
    """Extends base AnalysisResult with embedding-specific data."""
    
    # Inherited: analysis_type, input_file, timestamp, segments, summary
    
    domains_analyzed: list[str]
    exemplar_counts: dict[str, dict[str, int]]  # domain -> category -> count
    model_info: dict[str, str]
    parameters_used: dict[str, Any]
```

---

## 4. Analyzer Implementation

### Class Structure

```python
class EmbeddingAnalyzer(BaseAnalyzer):
    """
    Embedding-based writing analyzer using exemplar similarity.
    
    Applicable to any writing form: essays, transcripts, fiction,
    technical documentation, correspondence, etc.
    """
    
    name = "embedding"
    description = "Exemplar-based pattern detection using sentence embeddings"
    
    def __init__(
        self,
        exemplar_store_path: Path | None = None,
        embedding_model: str = "all-MiniLM-L6-v2",
        domains: list[str] | None = None,  # None = all enabled
    ):
        self.exemplar_store = ExemplarStore(exemplar_store_path)
        self.embedding_model = SentenceTransformer(embedding_model)
        self.active_domains = domains
    
    def analyze(self, text: str, **kwargs) -> EmbeddingAnalysisResult:
        """
        Analyze text by comparing segments to exemplar embeddings.
        
        kwargs:
            domains: list[str] - Override active domains for this run
            threshold: float - Override similarity threshold
            segmentation: str - "sentence", "paragraph", or "sliding"
            window_size: int - For sliding window segmentation
        """
        pass
    
    # Exemplar management
    def add_exemplar(self, exemplar: Exemplar) -> str:
        """Add exemplar, compute embedding, return ID."""
        pass
    
    def remove_exemplar(self, exemplar_id: str) -> bool:
        """Remove exemplar by ID."""
        pass
    
    def list_exemplars(
        self, 
        domain: str | None = None,
        category: str | None = None
    ) -> list[Exemplar]:
        """List exemplars with optional filtering."""
        pass
    
    # Domain management
    def list_domains(self) -> list[DomainConfig]:
        """List all configured domains with their categories."""
        pass
    
    def add_domain(self, config: DomainConfig) -> None:
        """Add a custom domain."""
        pass
    
    def get_domain_stats(self) -> dict:
        """Get exemplar counts per domain and category."""
        pass
```

### Segmentation Strategies

The analyzer supports multiple text segmentation approaches:

**sentence** (default) — Split on sentence boundaries using spaCy. Best for identifying individual rhetorical moves or epistemic markers.

**paragraph** — Split on paragraph breaks. Best for analyzing narrative function or overall passage tone.

**sliding** — Overlapping windows of N sentences. Best for detecting patterns that span multiple sentences, like building arguments or emotional arcs.

```python
def segment_text(
    self, 
    text: str, 
    strategy: str = "sentence",
    window_size: int = 3,
    overlap: int = 1
) -> list[tuple[str, int, int]]:
    """
    Segment text for analysis.
    Returns list of (segment_text, start_char, end_char).
    """
    pass
```

### Classification Algorithm

```python
def classify_segment(
    self,
    segment: str,
    domain: str,
    threshold: float = 0.45,
    top_k: int = 3
) -> EmbeddingMatch | None:
    """
    Classify a segment against exemplars in the specified domain.
    
    Algorithm:
    1. Compute embedding for segment
    2. Find top_k most similar exemplars across all categories
    3. Use weighted voting based on similarity scores
    4. Return match if winning category exceeds threshold
    
    Returns None if no category meets threshold.
    """
    segment_embedding = self.embedding_model.encode(segment)
    
    # Get all exemplars for this domain
    exemplars = self.exemplar_store.get_by_domain(domain)
    
    # Compute similarities
    similarities = []
    for ex in exemplars:
        score = cosine_similarity(segment_embedding, ex.embedding)
        similarities.append((ex, score))
    
    # Sort by similarity, take top_k
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_matches = similarities[:top_k]
    
    # Weighted voting by category
    category_scores = defaultdict(float)
    for ex, score in top_matches:
        category_scores[ex.category] += score
    
    # Find winner
    if not category_scores:
        return None
        
    winner = max(category_scores.items(), key=lambda x: x[1])
    winning_category, winning_score = winner
    
    # Normalize score
    normalized_score = winning_score / top_k
    
    if normalized_score < threshold:
        return None
    
    return EmbeddingMatch(
        segment_text=segment,
        domain=domain,
        category=winning_category,
        confidence=normalized_score,
        similar_exemplars=[
            {"text": ex.text[:100], "category": ex.category, "score": score}
            for ex, score in top_matches
        ],
        model_used=self.embedding_model.model_name,
        threshold_applied=threshold
    )
```

---

## 5. Exemplar Store

### Storage Format

Exemplars are stored in JSON for portability and human readability:

```
data/
└── exemplars/
    ├── store.json              # Main exemplar database
    ├── domains.json            # Domain configurations
    └── backups/
        └── store_2025-12-09.json
```

### Store Implementation

```python
class ExemplarStore:
    """
    Persistent storage for exemplars and domain configurations.
    """
    
    def __init__(self, base_path: Path | None = None):
        self.base_path = base_path or Path("data/exemplars")
        self.store_file = self.base_path / "store.json"
        self.domains_file = self.base_path / "domains.json"
        self._exemplars: dict[str, Exemplar] = {}
        self._domains: dict[str, DomainConfig] = {}
        self._load()
    
    def _load(self) -> None:
        """Load exemplars and domains from disk."""
        pass
    
    def _save(self) -> None:
        """Save exemplars and domains to disk with backup."""
        pass
    
    def add(self, exemplar: Exemplar) -> str:
        """Add exemplar, return assigned ID."""
        pass
    
    def get(self, exemplar_id: str) -> Exemplar | None:
        """Get exemplar by ID."""
        pass
    
    def get_by_domain(self, domain: str) -> list[Exemplar]:
        """Get all exemplars for a domain."""
        pass
    
    def get_by_category(self, domain: str, category: str) -> list[Exemplar]:
        """Get exemplars for a specific category."""
        pass
    
    def search_similar(
        self, 
        text: str, 
        domain: str | None = None,
        top_k: int = 5
    ) -> list[tuple[Exemplar, float]]:
        """Find exemplars most similar to given text."""
        pass
    
    def get_stats(self) -> dict:
        """Get counts by domain and category."""
        pass
    
    def export(self, path: Path, domain: str | None = None) -> None:
        """Export exemplars to file for sharing."""
        pass
    
    def import_exemplars(self, path: Path, merge: bool = True) -> int:
        """Import exemplars from file. Returns count imported."""
        pass
```

---

## 6. CLI Commands

### Analyzer Commands

```bash
# Run embedding analysis
python run.py analyze-embedding <file> [options]

Options:
  --domains, -d       Domains to analyze (comma-separated or "all")
  --threshold, -t     Similarity threshold (0.0-1.0, default 0.45)
  --segmentation, -s  Segmentation strategy: sentence|paragraph|sliding
  --window-size       Window size for sliding segmentation (default 3)
  --output, -o        Output format: text|json|markdown
  --save              Save results to file
  --verbose, -v       Show matching exemplars for each classification

# Examples
python run.py analyze-embedding essay.txt --domains epistemic_stance
python run.py analyze-embedding transcript.txt -d rhetorical_moves,emotional_register -t 0.5
python run.py analyze-embedding chapter.txt --segmentation paragraph --domains narrative_function
```

### Exemplar Management Commands

```bash
# List exemplars
python run.py exemplars list [options]
  --domain, -d        Filter by domain
  --category, -c      Filter by category
  --format, -f        Output format: table|json

# Add exemplar interactively
python run.py exemplars add
  --domain, -d        Target domain (required)
  --category, -c      Target category (required)
  --text, -t          Exemplar text (or prompt interactively)
  --source            Source file or document
  --notes             Annotation notes
  --confidence        high|medium|low (default: high)

# Add exemplar from file selection
python run.py exemplars add-from-file <file>
  --domain, -d        Target domain
  --category, -c      Target category
  # Opens interactive segment selector

# Remove exemplar
python run.py exemplars remove <exemplar-id>

# Show statistics
python run.py exemplars stats [--domain]

# Search for similar exemplars
python run.py exemplars search "<text>" [--domain] [--top-k]

# Export/import
python run.py exemplars export <output-file> [--domain]
python run.py exemplars import <input-file> [--merge|--replace]
```

### Domain Management Commands

```bash
# List domains
python run.py domains list

# Show domain details
python run.py domains show <domain-name>

# Add custom domain
python run.py domains add <name> --categories "cat1,cat2,cat3" [--description]

# Update domain settings
python run.py domains update <name> [--threshold] [--top-k] [--enable|--disable]

# Remove custom domain (built-in domains cannot be removed)
python run.py domains remove <name>
```

---

## 7. UI Configuration Recommendations

The analyzer has many configurable parameters. For a user interface, organize these into progressive disclosure layers.

### Layer 1: Essential Choices (Always Visible)

These are the decisions users must make for every analysis:

```
┌─────────────────────────────────────────────────────────────┐
│  EMBEDDING ANALYZER                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  What do you want to analyze?                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Rhetorical Moves      (23 exemplars)              │   │
│  │ ☑ Epistemic Stance      (18 exemplars)              │   │
│  │ ☐ Emotional Register    (4 exemplars) ⚠️ low        │   │
│  │ ☐ Narrative Function    (0 exemplars) ⚠️ none       │   │
│  │ ☐ Intellectual Style    (12 exemplars)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ ▶ Run Analysis ]                    [ ⚙ Options ]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Checkboxes for domain selection
- Exemplar counts shown inline
- Warning indicators when exemplar coverage is low
- Single primary action button
- Options button for Layer 2

### Layer 2: Common Options (Expandable Panel)

These options affect results quality and should be accessible but not overwhelming:

```
┌─────────────────────────────────────────────────────────────┐
│  OPTIONS                                           [ Hide ] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Confidence Threshold                                       │
│  More matches ◀━━━━━━━━●━━━━━━▶ Fewer, higher confidence   │
│                     0.45                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Current: 0.45 (balanced)                            │   │
│  │ Lower (0.3): Catch more patterns, more false pos.   │   │
│  │ Higher (0.6): Miss some, but higher precision       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Text Segmentation                                          │
│  ○ Sentences (detect individual moves)                      │
│  ○ Paragraphs (detect passage-level patterns)               │
│  ● Auto (choose based on domain)                            │
│                                                             │
│  Output Format                                              │
│  ○ Summary with highlights                                  │
│  ● Detailed with all matches                                │
│  ○ JSON for export                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Slider with contextual explanation
- Radio buttons with clear descriptions
- "Auto" options for reasonable defaults

### Layer 3: Advanced Settings (Separate Screen/Modal)

For power users who want fine control:

```
┌─────────────────────────────────────────────────────────────┐
│  ADVANCED SETTINGS                                 [ Back ] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Per-Domain Thresholds ─────────────────────────────┐   │
│  │ Rhetorical Moves     [0.45] ◀━━━●━━▶               │   │
│  │ Epistemic Stance     [0.50] ◀━━━━●━▶               │   │
│  │ Emotional Register   [0.40] ◀━━●━━━▶               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Classification Parameters ─────────────────────────┐   │
│  │ Top-K for voting:           [ 3 ▼]                  │   │
│  │ Min exemplars per category: [ 3 ▼]                  │   │
│  │ Sliding window size:        [ 3 ▼] sentences        │   │
│  │ Window overlap:             [ 1 ▼] sentences        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Embedding Model ───────────────────────────────────┐   │
│  │ ● all-MiniLM-L6-v2 (fast, good quality)             │   │
│  │ ○ all-mpnet-base-v2 (slower, better quality)        │   │
│  │ ○ Custom: [________________________]                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ Reset to Defaults ]                 [ Save as Preset ]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Layer 4: Exemplar Management (Dedicated Section)

A separate area for building and curating exemplar collections:

```
┌─────────────────────────────────────────────────────────────┐
│  EXEMPLAR LIBRARY                                           │
├────────────┬────────────────────────────────────────────────┤
│ DOMAINS    │  RHETORICAL MOVES                              │
│            │  ──────────────────────────────────────────── │
│ ▼ Rhetoric │                                                │
│   concessi │  Category: concession (5 exemplars)           │
│   contrast │  ┌─────────────────────────────────────────┐  │
│   evidence │  │ "Yes, the data supports that, but we    │  │
│   elaborat │  │  need to consider..."                   │  │
│            │  │  Source: Two Guys Ep 42 | High conf.    │  │
│ ▶ Epistemi │  │  [Edit] [Delete]                        │  │
│            │  ├─────────────────────────────────────────┤  │
│ ▶ Emotiona │  │ "I understand the appeal, however the   │  │
│            │  │  research indicates..."                 │  │
│ ▶ Narrativ │  │  Source: Essay draft | Medium conf.     │  │
│            │  │  [Edit] [Delete]                        │  │
│ + Add New  │  └─────────────────────────────────────────┘  │
│            │                                                │
│            │  [ + Add Exemplar ]  [ Import ]  [ Export ]   │
└────────────┴────────────────────────────────────────────────┘
```

### UI Component Specifications

**Domain Selector Component**
```typescript
interface DomainSelectorProps {
  domains: DomainConfig[];
  selected: string[];
  onChange: (selected: string[]) => void;
  showExemplarCounts: boolean;
  showWarnings: boolean;  // Warn if < min exemplars
}
```

**Threshold Slider Component**
```typescript
interface ThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;           // 0.0
  max: number;           // 1.0
  step: number;          // 0.05
  showLabels: boolean;   // "More matches" / "Higher precision"
  showExplanation: boolean;
}
```

**Exemplar Card Component**
```typescript
interface ExemplarCardProps {
  exemplar: Exemplar;
  onEdit: () => void;
  onDelete: () => void;
  showSimilarity?: number;  // When displaying search results
  highlightText?: string;   // For search highlighting
}
```

**Analysis Result Display Component**
```typescript
interface ResultDisplayProps {
  result: EmbeddingAnalysisResult;
  displayMode: "summary" | "detailed" | "interactive";
  onSegmentClick?: (segment: EmbeddingMatch) => void;
  showExemplars: boolean;  // Show matching exemplars inline
  colorByDomain: boolean;  // Color-code by domain
}
```

### Configuration Persistence

Store user preferences in a config file that the UI reads/writes:

```json
{
  "embedding_analyzer": {
    "defaults": {
      "threshold": 0.45,
      "segmentation": "auto",
      "top_k": 3,
      "output_format": "detailed"
    },
    "domain_overrides": {
      "emotional_register": {
        "threshold": 0.40
      }
    },
    "presets": {
      "quick_scan": {
        "threshold": 0.35,
        "segmentation": "paragraph",
        "output_format": "summary"
      },
      "detailed_analysis": {
        "threshold": 0.50,
        "segmentation": "sentence",
        "output_format": "detailed"
      }
    },
    "recent_domains": ["rhetorical_moves", "epistemic_stance"],
    "embedding_model": "all-MiniLM-L6-v2"
  }
}
```

---

## 8. Integration with Existing Analyzers

### Registry Addition

```python
# In src/analyzers/__init__.py

from src.analyzers.embedding import EmbeddingAnalyzer

ANALYZERS = {
    "emotion": EmotionAnalyzer,
    "hedging": HedgingAnalyzer,
    "rhetoric": RhetoricAnalyzer,
    "embedding": EmbeddingAnalyzer,  # Add this
}
```

### Combined Analysis

The embedding analyzer can complement existing analyzers:

```bash
# Run multiple analyzers
python run.py analyze text.txt --methods hedging,embedding --embedding-domains epistemic_stance

# The embedding analyzer's epistemic_stance domain captures similar
# phenomena to the hedging analyzer but via exemplar matching rather
# than lexicon lookup. Comparing results can validate findings.
```

### Output Compatibility

The EmbeddingAnalysisResult extends the base AnalysisResult, ensuring compatibility with existing output formatters and the summary generation pipeline.

---

## 9. Starter Exemplar Collections

Provide seed exemplars for each built-in domain to demonstrate the system and allow immediate use.

### Location

```
data/
└── exemplars/
    └── seeds/
        ├── rhetorical_moves.json     # ~30 exemplars
        ├── epistemic_stance.json     # ~25 exemplars
        ├── emotional_register.json   # ~20 exemplars
        ├── narrative_function.json   # ~20 exemplars
        └── intellectual_style.json   # ~15 exemplars
```

### Seed Import Command

```bash
python run.py exemplars import-seeds [--domain] [--replace]
```

---

## 10. Dependencies

### Required

```
sentence-transformers>=2.2.0    # Embedding computation
numpy>=1.24.0                   # Vector operations
scikit-learn>=1.3.0             # Cosine similarity
```

### Already in Project

```
spacy>=3.7                      # Sentence segmentation
typer>=0.9                      # CLI
rich>=13.0                      # Output formatting
```

---

## 11. File Structure

```
src/
└── analyzers/
    ├── __init__.py              # Add embedding to registry
    ├── embedding/
    │   ├── __init__.py
    │   ├── analyzer.py          # EmbeddingAnalyzer class
    │   ├── store.py             # ExemplarStore class
    │   ├── domains.py           # Built-in domain definitions
    │   ├── segmentation.py      # Text segmentation strategies
    │   └── models.py            # Data classes
    └── ...

data/
└── exemplars/
    ├── store.json               # User's exemplar collection
    ├── domains.json             # Domain configurations
    ├── seeds/                   # Starter exemplar sets
    │   └── *.json
    └── backups/
        └── *.json

tests/
└── test_embedding_analyzer.py   # Unit tests
```

---

## 12. Acceptance Criteria

The implementation is complete when:

1. **Core Analysis Works**
   - `python run.py analyze-embedding sample.txt --domains rhetorical_moves` produces classifications
   - Results include confidence scores and matching exemplars
   - Multiple domains can be analyzed in one run

2. **Exemplar Management Works**
   - `python run.py exemplars add` creates exemplar with computed embedding
   - `python run.py exemplars list` shows exemplars with filtering
   - `python run.py exemplars stats` shows collection statistics
   - Export/import functions work correctly

3. **Domain Management Works**
   - Built-in domains load with correct categories
   - Custom domains can be created and used
   - Domain enable/disable persists

4. **Configuration Persists**
   - User settings save and load correctly
   - Per-domain threshold overrides work
   - Presets can be saved and applied

5. **Tests Pass**
   - `pytest tests/test_embedding_analyzer.py -v` passes
   - Integration with existing analyzer pipeline works

6. **Seeds Available**
   - `python run.py exemplars import-seeds` populates starter collection
   - Seed exemplars produce reasonable results on sample text

---

## 13. Implementation Priority

**Phase 1: Core Analyzer**
- EmbeddingAnalyzer class
- ExemplarStore with basic CRUD
- Single-domain classification
- CLI commands: analyze-embedding, exemplars add/list/stats

**Phase 2: Multi-Domain & Polish**
- Multiple domain support
- Domain management CLI
- Seed exemplar collections
- Export/import functionality

**Phase 3: Advanced Features**
- Sliding window segmentation
- Per-domain threshold configuration
- Presets system
- Integration with LLM synthesis layer

---

*End of Specification*
