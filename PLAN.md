# Embedding Rhetoric Analyzer - Implementation Plan

**Date:** December 16, 2025  
**Status:** Ready for Claude Code implementation  
**Integration Target:** Writer's Portal  

---

## Project Overview

A standalone embedding-based rhetorical move analyzer designed for integration into larger systems. Learns from user-curated exemplars, adapts to any writing genre, and provides extensible interfaces for CLI, file upload, and future web/research tools.

### Design Principles

1. **Modularity** — Each component independently usable and testable
2. **Configuration as Data** — All settings serialize to JSON for presets, sharing, UI binding
3. **Result Persistence** — Analysis results save with full provenance
4. **Extension Points** — Clear interfaces for transcript features, LLM synthesis, research integration

---

## Project Structure

```
embedding-rhetoric-analyzer/
├── src/
│   ├── __init__.py
│   ├── config.py            # Configuration dataclasses
│   ├── engine.py            # Embedding computation
│   ├── store.py             # Exemplar storage and retrieval
│   ├── segmentation.py      # Text segmentation strategies
│   ├── analyzer.py          # Core analysis logic
│   ├── results.py           # Result schema and persistence
│   └── cli.py               # Typer CLI interface
├── data/
│   ├── exemplars/           # JSON exemplar collections
│   │   └── starter.json     # Seed exemplars
│   └── results/             # Saved analysis results
├── tests/
│   ├── test_engine.py
│   ├── test_store.py
│   ├── test_analyzer.py
│   └── fixtures/
├── configs/                 # Saved configuration presets
│   └── default.json
├── pyproject.toml
└── README.md
```

---

## Part 1: Configuration System

```python
# src/config.py
"""
Configuration system for the embedding rhetoric analyzer.

Design goals:
- All settings serializable to JSON
- Clear defaults with override capability  
- Preset configurations for common use cases
- Schema export for UI form generation
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Optional
import json


class SegmentationMethod(Enum):
    """How to split text for analysis."""
    SENTENCE = "sentence"
    SLIDING_WINDOW = "sliding"
    PARAGRAPH = "paragraph"
    SPEAKER_TURN = "speaker_turn"


@dataclass
class SegmentationConfig:
    """Text segmentation settings."""
    method: SegmentationMethod = SegmentationMethod.SENTENCE
    min_words: int = 5
    max_words: int = 100
    overlap_words: int = 25  # For sliding window
    # Transcript-specific: regex pattern for speaker labels
    speaker_pattern: str = r'^([A-Z][A-Z\s\.]+):'
    
    def to_dict(self) -> dict:
        return {
            "method": self.method.value,
            "min_words": self.min_words,
            "max_words": self.max_words,
            "overlap_words": self.overlap_words,
            "speaker_pattern": self.speaker_pattern,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "SegmentationConfig":
        return cls(
            method=SegmentationMethod(data.get("method", "sentence")),
            min_words=data.get("min_words", 5),
            max_words=data.get("max_words", 100),
            overlap_words=data.get("overlap_words", 25),
            speaker_pattern=data.get("speaker_pattern", r'^([A-Z][A-Z\s\.]+):'),
        )


@dataclass
class ClassificationConfig:
    """How segments are matched to exemplars."""
    confidence_threshold: float = 0.5
    top_k: int = 5
    min_exemplars_per_type: int = 3
    voting_method: str = "weighted"  # "weighted" or "majority"
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "ClassificationConfig":
        return cls(**{k: data.get(k, v) for k, v in asdict(cls()).items()})


@dataclass
class EmbeddingConfig:
    """Embedding model settings."""
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    batch_size: int = 32
    normalize: bool = True
    
    # Model presets for easy selection
    PRESETS = {
        "fast": "sentence-transformers/all-MiniLM-L6-v2",      # 80MB, 384d
        "balanced": "sentence-transformers/all-mpnet-base-v2", # 420MB, 768d
    }
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "EmbeddingConfig":
        return cls(**{k: data.get(k, v) for k, v in asdict(cls()).items()})


@dataclass
class OutputConfig:
    """What to include in results."""
    include_alternatives: bool = True
    include_exemplar_matches: bool = True
    include_segment_text: bool = True
    max_alternatives: int = 3
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "OutputConfig":
        return cls(**{k: data.get(k, v) for k, v in asdict(cls()).items()})


@dataclass
class AnalyzerConfig:
    """Complete analyzer configuration."""
    segmentation: SegmentationConfig = field(default_factory=SegmentationConfig)
    classification: ClassificationConfig = field(default_factory=ClassificationConfig)
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    output: OutputConfig = field(default_factory=OutputConfig)
    
    # Paths (optional, can be overridden at runtime)
    exemplar_store_path: Optional[str] = None
    results_dir: Optional[str] = "data/results"
    
    def to_dict(self) -> dict:
        return {
            "segmentation": self.segmentation.to_dict(),
            "classification": self.classification.to_dict(),
            "embedding": self.embedding.to_dict(),
            "output": self.output.to_dict(),
            "exemplar_store_path": self.exemplar_store_path,
            "results_dir": self.results_dir,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "AnalyzerConfig":
        return cls(
            segmentation=SegmentationConfig.from_dict(data.get("segmentation", {})),
            classification=ClassificationConfig.from_dict(data.get("classification", {})),
            embedding=EmbeddingConfig.from_dict(data.get("embedding", {})),
            output=OutputConfig.from_dict(data.get("output", {})),
            exemplar_store_path=data.get("exemplar_store_path"),
            results_dir=data.get("results_dir", "data/results"),
        )
    
    def save(self, path: Path):
        """Save configuration to JSON file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load(cls, path: Path) -> "AnalyzerConfig":
        """Load configuration from JSON file."""
        with open(path) as f:
            return cls.from_dict(json.load(f))


# Preset configurations
PRESETS = {
    "default": AnalyzerConfig(),
    
    "high_precision": AnalyzerConfig(
        classification=ClassificationConfig(
            confidence_threshold=0.65,
            min_exemplars_per_type=5,
        ),
    ),
    
    "high_recall": AnalyzerConfig(
        classification=ClassificationConfig(
            confidence_threshold=0.35,
            min_exemplars_per_type=2,
        ),
    ),
    
    "transcript": AnalyzerConfig(
        segmentation=SegmentationConfig(
            method=SegmentationMethod.SPEAKER_TURN,
        ),
    ),
    
    "long_form": AnalyzerConfig(
        segmentation=SegmentationConfig(
            method=SegmentationMethod.PARAGRAPH,
            max_words=200,
        ),
    ),
}


def get_preset(name: str) -> AnalyzerConfig:
    """Get a preset configuration by name."""
    if name not in PRESETS:
        raise ValueError(f"Unknown preset: {name}. Available: {list(PRESETS.keys())}")
    # Return a copy to avoid mutation
    return AnalyzerConfig.from_dict(PRESETS[name].to_dict())
```

---

## Part 2: Embedding Engine

```python
# src/engine.py
"""
Embedding computation engine.

Handles model loading, encoding, and similarity computation.
Lazy-loads model to keep CLI startup fast.
"""

import numpy as np
from typing import Optional
from .config import EmbeddingConfig

# Module-level cache for loaded models
_models: dict[str, any] = {}


def _get_model(model_name: str):
    """Lazy-load and cache sentence transformer model."""
    if model_name not in _models:
        from sentence_transformers import SentenceTransformer
        _models[model_name] = SentenceTransformer(model_name)
    return _models[model_name]


class EmbeddingEngine:
    """
    Computes and compares text embeddings.
    
    Usage:
        engine = EmbeddingEngine()
        emb = engine.encode("Some text")
        sim = engine.similarity(emb1, emb2)
    """
    
    def __init__(self, config: Optional[EmbeddingConfig] = None):
        self.config = config or EmbeddingConfig()
        self._model = None
    
    @property
    def model(self):
        if self._model is None:
            self._model = _get_model(self.config.model_name)
        return self._model
    
    @property
    def embedding_dim(self) -> int:
        return self.model.get_sentence_embedding_dimension()
    
    def encode(self, text: str) -> np.ndarray:
        """Encode single text to embedding vector."""
        emb = self.model.encode(text, convert_to_numpy=True)
        if self.config.normalize:
            emb = emb / np.linalg.norm(emb)
        return emb
    
    def encode_batch(
        self, 
        texts: list[str], 
        show_progress: bool = False,
    ) -> np.ndarray:
        """Encode multiple texts efficiently."""
        embs = self.model.encode(
            texts,
            batch_size=self.config.batch_size,
            show_progress_bar=show_progress,
            convert_to_numpy=True,
        )
        if self.config.normalize:
            norms = np.linalg.norm(embs, axis=1, keepdims=True)
            # Avoid division by zero
            norms = np.where(norms == 0, 1, norms)
            embs = embs / norms
        return embs
    
    def similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two embeddings."""
        if self.config.normalize:
            return float(np.dot(a, b))
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
    
    def similarity_matrix(
        self,
        queries: np.ndarray,
        corpus: np.ndarray,
    ) -> np.ndarray:
        """
        Compute similarity between all query-corpus pairs.
        
        Args:
            queries: (n_queries, dim)
            corpus: (n_corpus, dim)
            
        Returns:
            (n_queries, n_corpus) similarity matrix
        """
        if self.config.normalize:
            return np.dot(queries, corpus.T)
        
        q_norm = queries / np.linalg.norm(queries, axis=1, keepdims=True)
        c_norm = corpus / np.linalg.norm(corpus, axis=1, keepdims=True)
        return np.dot(q_norm, c_norm.T)
```

---

## Part 3: Exemplar Store

```python
# src/store.py
"""
Exemplar storage and retrieval.

Manages the collection of annotated rhetorical move examples.
Supports JSON file storage with optional Craft integration.
"""

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional, List

import numpy as np

from .engine import EmbeddingEngine
from .config import EmbeddingConfig


@dataclass
class Exemplar:
    """A single rhetorical move exemplar."""
    id: str
    text: str
    move_type: str
    move_category: str
    
    # Optional context
    context_before: str = ""
    context_after: str = ""
    
    # Source metadata
    source_file: str = ""
    source_title: str = ""
    speaker: str = ""
    
    # Annotation metadata
    confidence: str = "high"  # high, medium, low
    notes: str = ""
    annotated_by: str = ""
    annotated_date: str = ""
    
    # Embedding (stored as list for JSON)
    embedding: Optional[List[float]] = None
    embedding_model: str = ""
    
    def get_embedding_array(self) -> Optional[np.ndarray]:
        if self.embedding is None:
            return None
        return np.array(self.embedding, dtype=np.float32)
    
    def set_embedding_array(self, emb: np.ndarray, model_name: str):
        self.embedding = emb.tolist()
        self.embedding_model = model_name
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "Exemplar":
        return cls(**data)


class ExemplarStore:
    """
    Manages a collection of rhetorical move exemplars.
    
    Features:
    - Add/remove/update exemplars
    - Automatic embedding computation
    - Fast similarity search
    - JSON persistence
    
    Usage:
        store = ExemplarStore("exemplars.json")
        store.add("Admittedly, this is true.", "concession", "dialogic")
        matches = store.find_similar("I must admit...", top_k=5)
        store.save()
    """
    
    def __init__(
        self,
        path: Optional[Path] = None,
        engine: Optional[EmbeddingEngine] = None,
    ):
        self.path = Path(path) if path else None
        self.engine = engine or EmbeddingEngine()
        
        self.exemplars: List[Exemplar] = []
        self.metadata: dict = {
            "version": "1.0",
            "created": datetime.utcnow().isoformat() + "Z",
        }
        
        # Cached embedding matrix
        self._embedding_matrix: Optional[np.ndarray] = None
        self._dirty: bool = True
        
        if self.path and self.path.exists():
            self.load()
    
    def load(self, path: Optional[Path] = None):
        """Load exemplars from JSON file."""
        path = Path(path) if path else self.path
        if not path:
            raise ValueError("No path specified")
        
        with open(path) as f:
            data = json.load(f)
        
        self.metadata = {
            "version": data.get("version", "1.0"),
            "created": data.get("created", ""),
            "embedding_model": data.get("embedding_model", ""),
        }
        self.exemplars = [Exemplar.from_dict(e) for e in data.get("exemplars", [])]
        self._dirty = True
    
    def save(self, path: Optional[Path] = None):
        """Save exemplars to JSON file."""
        path = Path(path) if path else self.path
        if not path:
            raise ValueError("No path specified")
        
        path.parent.mkdir(parents=True, exist_ok=True)
        
        data = {
            "version": "1.0",
            "saved_at": datetime.utcnow().isoformat() + "Z",
            "embedding_model": self.engine.config.model_name,
            "exemplar_count": len(self.exemplars),
            "move_type_counts": self._count_by("move_type"),
            "exemplars": [e.to_dict() for e in self.exemplars],
        }
        
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
    
    def add(
        self,
        text: str,
        move_type: str,
        move_category: str,
        **kwargs,
    ) -> Exemplar:
        """Add a new exemplar with automatic embedding."""
        exemplar = Exemplar(
            id=str(uuid.uuid4()),
            text=text,
            move_type=move_type,
            move_category=move_category,
            annotated_date=datetime.now().strftime("%Y-%m-%d"),
            **kwargs,
        )
        
        emb = self.engine.encode(text)
        exemplar.set_embedding_array(emb, self.engine.config.model_name)
        
        self.exemplars.append(exemplar)
        self._dirty = True
        
        return exemplar
    
    def remove(self, exemplar_id: str) -> bool:
        """Remove an exemplar by ID."""
        before = len(self.exemplars)
        self.exemplars = [e for e in self.exemplars if e.id != exemplar_id]
        if len(self.exemplars) < before:
            self._dirty = True
            return True
        return False
    
    def get_by_type(self, move_type: str) -> List[Exemplar]:
        """Get all exemplars of a specific move type."""
        return [e for e in self.exemplars if e.move_type == move_type]
    
    def get_by_category(self, category: str) -> List[Exemplar]:
        """Get all exemplars in a category."""
        return [e for e in self.exemplars if e.move_category == category]
    
    def find_similar(
        self,
        text: str,
        top_k: int = 5,
        threshold: float = 0.0,
        move_type: Optional[str] = None,
    ) -> List[tuple]:
        """
        Find exemplars most similar to input text.
        
        Returns:
            List of (Exemplar, similarity_score) tuples
        """
        self._ensure_index()
        
        if not self.exemplars:
            return []
        
        if move_type:
            candidates = self.get_by_type(move_type)
            if not candidates:
                return []
            embeddings = np.array([e.get_embedding_array() for e in candidates])
        else:
            candidates = self.exemplars
            embeddings = self._embedding_matrix
        
        query_emb = self.engine.encode(text)
        similarities = self.engine.similarity_matrix(
            query_emb.reshape(1, -1),
            embeddings,
        )[0]
        
        results = []
        for idx in np.argsort(similarities)[::-1][:top_k]:
            score = float(similarities[idx])
            if score >= threshold:
                results.append((candidates[idx], score))
        
        return results
    
    def find_similar_batch(
        self,
        texts: List[str],
        top_k: int = 5,
        threshold: float = 0.0,
    ) -> List[List[tuple]]:
        """Find similar exemplars for multiple texts efficiently."""
        self._ensure_index()
        
        if not self.exemplars:
            return [[] for _ in texts]
        
        query_embs = self.engine.encode_batch(texts)
        similarities = self.engine.similarity_matrix(query_embs, self._embedding_matrix)
        
        results = []
        for row in similarities:
            row_results = []
            for idx in np.argsort(row)[::-1][:top_k]:
                score = float(row[idx])
                if score >= threshold:
                    row_results.append((self.exemplars[idx], score))
            results.append(row_results)
        
        return results
    
    def stats(self) -> dict:
        """Get collection statistics."""
        return {
            "total_exemplars": len(self.exemplars),
            "move_types": self._count_by("move_type"),
            "categories": self._count_by("move_category"),
            "confidence_distribution": self._count_by("confidence"),
            "sources": len(set(e.source_file for e in self.exemplars if e.source_file)),
        }
    
    def _ensure_index(self):
        """Rebuild embedding matrix if needed."""
        if not self._dirty:
            return
        
        if not self.exemplars:
            self._embedding_matrix = None
            self._dirty = False
            return
        
        for e in self.exemplars:
            if e.embedding is None:
                emb = self.engine.encode(e.text)
                e.set_embedding_array(emb, self.engine.config.model_name)
        
        self._embedding_matrix = np.array([
            e.get_embedding_array() for e in self.exemplars
        ])
        self._dirty = False
    
    def _count_by(self, field: str) -> dict:
        counts = {}
        for e in self.exemplars:
            val = getattr(e, field, "unknown")
            counts[val] = counts.get(val, 0) + 1
        return counts
```

---

## Part 4: Text Segmentation

```python
# src/segmentation.py
"""
Text segmentation strategies.

Provides multiple ways to split text into analyzable segments.
Extensible for transcript-specific features.
"""

import re
from dataclasses import dataclass
from typing import List, Optional
from .config import SegmentationConfig, SegmentationMethod


@dataclass
class TextSegment:
    """A segment of text with position information."""
    text: str
    start: int
    end: int
    # For transcripts
    speaker: Optional[str] = None
    turn_index: Optional[int] = None


class Segmenter:
    """
    Splits text into segments for analysis.
    
    Supports multiple strategies via config.
    """
    
    def __init__(self, config: Optional[SegmentationConfig] = None):
        self.config = config or SegmentationConfig()
    
    def segment(self, text: str) -> List[TextSegment]:
        """Segment text according to configured method."""
        method = self.config.method
        
        if method == SegmentationMethod.SENTENCE:
            return self._segment_sentences(text)
        elif method == SegmentationMethod.SLIDING_WINDOW:
            return self._segment_sliding(text)
        elif method == SegmentationMethod.PARAGRAPH:
            return self._segment_paragraphs(text)
        elif method == SegmentationMethod.SPEAKER_TURN:
            return self._segment_speaker_turns(text)
        else:
            return self._segment_sentences(text)
    
    def _segment_sentences(self, text: str) -> List[TextSegment]:
        """Split on sentence boundaries."""
        segments = []
        # Match sentences ending with . ! or ?
        # Handle common abbreviations
        pattern = r'(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|i\.e|e\.g))[.!?]+\s+'
        
        sentences = re.split(pattern, text)
        pos = 0
        
        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue
            
            word_count = len(sent.split())
            if word_count < self.config.min_words:
                pos += len(sent) + 1
                continue
            
            if word_count > self.config.max_words:
                words = sent.split()[:self.config.max_words]
                sent = " ".join(words)
            
            start = text.find(sent, pos)
            if start == -1:
                start = pos
            end = start + len(sent)
            
            segments.append(TextSegment(text=sent, start=start, end=end))
            pos = end
        
        return segments
    
    def _segment_sliding(self, text: str) -> List[TextSegment]:
        """Sliding window segmentation."""
        words = text.split()
        segments = []
        window = self.config.max_words
        step = window - self.config.overlap_words
        
        i = 0
        while i < len(words):
            window_words = words[i:i + window]
            window_text = " ".join(window_words)
            
            start = len(" ".join(words[:i])) + (1 if i > 0 else 0)
            end = start + len(window_text)
            
            segments.append(TextSegment(text=window_text, start=start, end=end))
            i += step
        
        return segments
    
    def _segment_paragraphs(self, text: str) -> List[TextSegment]:
        """Split on paragraph boundaries."""
        segments = []
        pos = 0
        
        for para in re.split(r'\n\s*\n', text):
            para = para.strip()
            if not para:
                continue
            
            word_count = len(para.split())
            if word_count < self.config.min_words:
                pos += len(para) + 2
                continue
            
            if word_count > self.config.max_words:
                words = para.split()[:self.config.max_words]
                para = " ".join(words)
            
            start = text.find(para, pos)
            if start == -1:
                start = pos
            end = start + len(para)
            
            segments.append(TextSegment(text=para, start=start, end=end))
            pos = end
        
        return segments
    
    def _segment_speaker_turns(self, text: str) -> List[TextSegment]:
        """Split on speaker labels (for transcripts)."""
        pattern = self.config.speaker_pattern
        segments = []
        lines = text.split('\n')
        
        current_speaker = None
        current_turn = []
        current_start = 0
        pos = 0
        turn_index = 0
        
        for line in lines:
            match = re.match(pattern, line)
            if match:
                # Save previous turn
                if current_turn:
                    turn_text = " ".join(current_turn).strip()
                    if len(turn_text.split()) >= self.config.min_words:
                        segments.append(TextSegment(
                            text=turn_text,
                            start=current_start,
                            end=pos,
                            speaker=current_speaker,
                            turn_index=turn_index,
                        ))
                        turn_index += 1
                
                # Start new turn
                current_speaker = match.group(1).strip()
                content = line[match.end():].strip()
                current_turn = [content] if content else []
                current_start = pos
            else:
                if line.strip():
                    current_turn.append(line.strip())
            
            pos += len(line) + 1
        
        # Last turn
        if current_turn:
            turn_text = " ".join(current_turn).strip()
            if len(turn_text.split()) >= self.config.min_words:
                segments.append(TextSegment(
                    text=turn_text,
                    start=current_start,
                    end=pos,
                    speaker=current_speaker,
                    turn_index=turn_index,
                ))
        
        return segments
```

---

## Part 5: Results Schema and Persistence

```python
# src/results.py
"""
Analysis result schema and persistence.

Provides a structured format for analysis results that includes:
- Full provenance (config, exemplar store info, timestamps)
- Segment-level classifications
- Summary statistics
- Export to JSON
"""

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional


@dataclass
class ClassifiedSegment:
    """A text segment with its classification."""
    text: str
    start: int
    end: int
    
    # Classification
    move_type: str
    move_category: str
    confidence: float
    
    # Optional extras
    speaker: Optional[str] = None
    alternatives: List[Dict] = field(default_factory=list)
    matched_exemplars: List[Dict] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class AnalysisResult:
    """Complete analysis result with provenance."""
    
    # Identification
    id: str
    timestamp: str
    
    # Input info
    input_file: str
    input_text_preview: str  # First 200 chars
    word_count: int
    
    # Configuration used
    config: Dict[str, Any]
    
    # Exemplar store info
    exemplar_store_path: str
    exemplar_count: int
    exemplar_store_version: str
    
    # Results
    segments: List[ClassifiedSegment]
    
    # Summary statistics
    summary: Dict[str, Any]
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "input": {
                "file": self.input_file,
                "preview": self.input_text_preview,
                "word_count": self.word_count,
            },
            "config": self.config,
            "exemplar_store": {
                "path": self.exemplar_store_path,
                "exemplar_count": self.exemplar_count,
                "version": self.exemplar_store_version,
            },
            "segments": [s.to_dict() for s in self.segments],
            "summary": self.summary,
        }
    
    def save(self, path: Path):
        """Save result to JSON file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load(cls, path: Path) -> "AnalysisResult":
        """Load result from JSON file."""
        with open(path) as f:
            data = json.load(f)
        
        segments = [
            ClassifiedSegment(**s) for s in data.get("segments", [])
        ]
        
        return cls(
            id=data["id"],
            timestamp=data["timestamp"],
            input_file=data["input"]["file"],
            input_text_preview=data["input"]["preview"],
            word_count=data["input"]["word_count"],
            config=data["config"],
            exemplar_store_path=data["exemplar_store"]["path"],
            exemplar_count=data["exemplar_store"]["exemplar_count"],
            exemplar_store_version=data["exemplar_store"]["version"],
            segments=segments,
            summary=data["summary"],
        )


def generate_result_filename(input_file: str, timestamp: str) -> str:
    """Generate a filename for saving results."""
    from pathlib import Path
    stem = Path(input_file).stem if input_file != "<stdin>" else "stdin"
    ts = timestamp.replace(":", "-").replace(".", "-")[:19]
    return f"{stem}_{ts}.json"
```

---

## Part 6: Core Analyzer

```python
# src/analyzer.py
"""
Core embedding-based rhetorical move analyzer.

Brings together all components to provide the main analysis interface.
"""

import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from .config import AnalyzerConfig, PRESETS, get_preset
from .engine import EmbeddingEngine
from .store import ExemplarStore, Exemplar
from .segmentation import Segmenter, TextSegment
from .results import AnalysisResult, ClassifiedSegment, generate_result_filename


class EmbeddingRhetoricAnalyzer:
    """
    Embedding-based rhetorical move detection.
    
    Classifies text segments by similarity to exemplars.
    Adapts to any writing genre based on provided exemplars.
    
    Usage:
        store = ExemplarStore("exemplars.json")
        analyzer = EmbeddingRhetoricAnalyzer(store)
        result = analyzer.analyze(text, "input.txt")
        result.save("results/output.json")
    """
    
    def __init__(
        self,
        store: ExemplarStore,
        config: Optional[AnalyzerConfig] = None,
    ):
        self.store = store
        self.config = config or AnalyzerConfig()
        self.segmenter = Segmenter(self.config.segmentation)
    
    @classmethod
    def from_preset(
        cls,
        preset_name: str,
        store: ExemplarStore,
    ) -> "EmbeddingRhetoricAnalyzer":
        """Create analyzer with a preset configuration."""
        config = get_preset(preset_name)
        return cls(store, config)
    
    @classmethod
    def from_paths(
        cls,
        exemplar_path: str,
        config_path: Optional[str] = None,
    ) -> "EmbeddingRhetoricAnalyzer":
        """Create analyzer from file paths."""
        store = ExemplarStore(Path(exemplar_path))
        config = None
        if config_path:
            config = AnalyzerConfig.load(Path(config_path))
        return cls(store, config)
    
    def analyze(
        self,
        text: str,
        input_file: str = "<stdin>",
        save_path: Optional[Path] = None,
    ) -> AnalysisResult:
        """
        Analyze text for rhetorical moves.
        
        Args:
            text: Text to analyze
            input_file: Source filename for provenance
            save_path: Optional path to save result
            
        Returns:
            AnalysisResult with classifications and summary
        """
        timestamp = datetime.utcnow().isoformat() + "Z"
        result_id = str(uuid.uuid4())[:8]
        
        # Segment text
        segments = self.segmenter.segment(text)
        
        if not segments:
            return self._empty_result(result_id, timestamp, input_file, text)
        
        # Batch classify for efficiency
        segment_texts = [s.text for s in segments]
        all_matches = self.store.find_similar_batch(
            segment_texts,
            top_k=self.config.classification.top_k,
            threshold=self.config.classification.confidence_threshold,
        )
        
        # Process classifications
        classified = []
        move_counts = {}
        category_counts = {}
        confidence_sum = 0
        
        for segment, matches in zip(segments, all_matches):
            if not matches:
                continue
            
            classification = self._vote_classification(matches)
            if classification is None:
                continue
            
            cls_segment = ClassifiedSegment(
                text=segment.text if self.config.output.include_segment_text else "",
                start=segment.start,
                end=segment.end,
                move_type=classification["move_type"],
                move_category=classification["category"],
                confidence=classification["confidence"],
                speaker=segment.speaker,
            )
            
            if self.config.output.include_alternatives:
                cls_segment.alternatives = classification.get("alternatives", [])[:self.config.output.max_alternatives]
            
            if self.config.output.include_exemplar_matches:
                cls_segment.matched_exemplars = [
                    {"id": e.id[:8], "text": e.text[:50], "score": round(s, 3)}
                    for e, s in matches[:3]
                ]
            
            classified.append(cls_segment)
            
            move_counts[classification["move_type"]] = move_counts.get(classification["move_type"], 0) + 1
            category_counts[classification["category"]] = category_counts.get(classification["category"], 0) + 1
            confidence_sum += classification["confidence"]
        
        # Build summary
        avg_confidence = confidence_sum / len(classified) if classified else 0
        summary = {
            "total_segments": len(segments),
            "classified_segments": len(classified),
            "classification_rate": len(classified) / len(segments) if segments else 0,
            "average_confidence": round(avg_confidence, 3),
            "move_counts": move_counts,
            "category_counts": category_counts,
            "top_moves": sorted(move_counts.items(), key=lambda x: -x[1])[:5],
            "narrative": self._generate_narrative(move_counts, category_counts, len(classified), avg_confidence),
        }
        
        result = AnalysisResult(
            id=result_id,
            timestamp=timestamp,
            input_file=input_file,
            input_text_preview=text[:200],
            word_count=len(text.split()),
            config=self.config.to_dict(),
            exemplar_store_path=str(self.store.path) if self.store.path else "",
            exemplar_count=len(self.store.exemplars),
            exemplar_store_version=self.store.metadata.get("version", ""),
            segments=classified,
            summary=summary,
        )
        
        # Auto-save if path provided or results_dir configured
        if save_path:
            result.save(save_path)
        elif self.config.results_dir:
            filename = generate_result_filename(input_file, timestamp)
            result.save(Path(self.config.results_dir) / filename)
        
        return result
    
    def _vote_classification(self, matches: List[tuple]) -> Optional[dict]:
        """Vote among matched exemplars."""
        cfg = self.config.classification
        
        votes = {}
        for exemplar, score in matches:
            move = exemplar.move_type
            
            type_count = len(self.store.get_by_type(move))
            if type_count < cfg.min_exemplars_per_type:
                continue
            
            if move not in votes:
                votes[move] = {
                    "total_score": 0,
                    "count": 0,
                    "max_score": 0,
                    "category": exemplar.move_category,
                }
            
            votes[move]["total_score"] += score
            votes[move]["count"] += 1
            votes[move]["max_score"] = max(votes[move]["max_score"], score)
        
        if not votes:
            return None
        
        scored = []
        for move, data in votes.items():
            if cfg.voting_method == "weighted":
                avg = data["total_score"] / data["count"]
                final = data["max_score"] * 0.7 + avg * 0.3
            else:
                final = data["max_score"]
            
            scored.append({
                "move_type": move,
                "category": data["category"],
                "confidence": round(final, 3),
            })
        
        scored.sort(key=lambda x: x["confidence"], reverse=True)
        
        winner = scored[0]
        if winner["confidence"] < cfg.confidence_threshold:
            return None
        
        return {
            **winner,
            "alternatives": scored[1:4],
        }
    
    def _generate_narrative(
        self,
        move_counts: dict,
        category_counts: dict,
        total: int,
        avg_conf: float,
    ) -> str:
        """Generate interpretive narrative."""
        if total == 0:
            return "No rhetorical moves detected above confidence threshold."
        
        top_moves = sorted(move_counts.items(), key=lambda x: -x[1])[:3]
        top_cats = sorted(category_counts.items(), key=lambda x: -x[1])[:2]
        
        narrative = f"Detected {total} rhetorical moves (avg confidence: {avg_conf:.2f}). "
        
        if top_moves:
            moves_str = ", ".join(f"{m} ({c})" for m, c in top_moves)
            narrative += f"Most frequent: {moves_str}. "
        
        if top_cats:
            narrative += f"Primary mode: {top_cats[0][0]}."
        
        return narrative
    
    def _empty_result(
        self,
        result_id: str,
        timestamp: str,
        input_file: str,
        text: str,
    ) -> AnalysisResult:
        """Return empty result."""
        return AnalysisResult(
            id=result_id,
            timestamp=timestamp,
            input_file=input_file,
            input_text_preview=text[:200],
            word_count=len(text.split()),
            config=self.config.to_dict(),
            exemplar_store_path=str(self.store.path) if self.store.path else "",
            exemplar_count=len(self.store.exemplars),
            exemplar_store_version="",
            segments=[],
            summary={"narrative": "No text segments to analyze."},
        )
```

---

## Part 7: CLI Interface

```python
# src/cli.py
"""
Command-line interface for the embedding rhetoric analyzer.

Commands:
- analyze: Analyze a text file
- exemplars: Manage exemplar collection
- config: Manage configurations
"""

import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

app = typer.Typer(
    name="rhetoric",
    help="Embedding-based rhetorical move analyzer",
    add_completion=False,
)
console = Console()


# ============ ANALYZE COMMAND ============

@app.command("analyze")
def analyze_file(
    input_file: Path = typer.Argument(
        ...,
        help="File to analyze (use - for stdin)",
        exists=False,  # We handle stdin specially
    ),
    store: Path = typer.Option(
        Path("data/exemplars/default.json"),
        "--store", "-s",
        help="Path to exemplar store",
    ),
    config: Optional[Path] = typer.Option(
        None,
        "--config", "-c",
        help="Path to config file",
    ),
    preset: Optional[str] = typer.Option(
        None,
        "--preset", "-p",
        help="Config preset: default, high_precision, high_recall, transcript, long_form",
    ),
    threshold: Optional[float] = typer.Option(
        None,
        "--threshold", "-t",
        help="Override confidence threshold (0.0-1.0)",
    ),
    output: Optional[Path] = typer.Option(
        None,
        "--output", "-o",
        help="Save result to this path",
    ),
    format: str = typer.Option(
        "terminal",
        "--format", "-f",
        help="Output format: terminal, json, summary",
    ),
    quiet: bool = typer.Option(
        False,
        "--quiet", "-q",
        help="Suppress progress messages",
    ),
):
    """
    Analyze a text file for rhetorical moves.
    
    Examples:
        rhetoric analyze document.txt
        rhetoric analyze transcript.txt --preset transcript
        rhetoric analyze essay.txt --threshold 0.6 --output results.json
        cat file.txt | rhetoric analyze -
    """
    from .analyzer import EmbeddingRhetoricAnalyzer
    from .store import ExemplarStore
    from .config import AnalyzerConfig, get_preset
    
    # Read input
    if str(input_file) == "-":
        text = sys.stdin.read()
        input_name = "<stdin>"
    else:
        if not input_file.exists():
            console.print(f"[red]File not found: {input_file}[/red]")
            raise typer.Exit(1)
        text = input_file.read_text(encoding="utf-8")
        input_name = str(input_file)
    
    # Load exemplar store
    if not store.exists():
        console.print(f"[red]Exemplar store not found: {store}[/red]")
        console.print("Create one with: rhetoric exemplars add ...")
        raise typer.Exit(1)
    
    if not quiet:
        console.print(f"[dim]Loading exemplar store: {store}[/dim]")
    
    exemplar_store = ExemplarStore(store)
    
    if len(exemplar_store.exemplars) < 5:
        console.print(f"[yellow]Warning: Only {len(exemplar_store.exemplars)} exemplars. "
                      f"Results may be unreliable.[/yellow]")
    
    # Build config
    if config:
        analyzer_config = AnalyzerConfig.load(config)
    elif preset:
        analyzer_config = get_preset(preset)
    else:
        analyzer_config = AnalyzerConfig()
    
    if threshold is not None:
        analyzer_config.classification.confidence_threshold = threshold
    
    # Run analysis
    if not quiet:
        console.print(f"[dim]Analyzing {len(text.split())} words...[/dim]")
    
    analyzer = EmbeddingRhetoricAnalyzer(exemplar_store, analyzer_config)
    result = analyzer.analyze(text, input_name)
    
    # Output
    if format == "json":
        import json
        print(json.dumps(result.to_dict(), indent=2))
    elif format == "summary":
        _display_summary(result)
    else:
        _display_result(result)
    
    # Save if requested
    if output:
        result.save(output)
        if not quiet:
            console.print(f"[green]Result saved to: {output}[/green]")


def _display_result(result):
    """Display full result in terminal."""
    # Header
    console.print(Panel(
        f"[bold]Rhetorical Move Analysis[/bold]\n"
        f"[dim]File: {result.input_file} | {result.timestamp}[/dim]",
        border_style="blue",
    ))
    
    # Summary stats
    s = result.summary
    console.print(f"\n[bold]Summary[/bold]")
    console.print(f"  Segments analyzed: {s.get('total_segments', 0)}")
    console.print(f"  Moves detected: {s.get('classified_segments', 0)}")
    console.print(f"  Classification rate: {s.get('classification_rate', 0):.1%}")
    console.print(f"  Average confidence: {s.get('average_confidence', 0):.2f}")
    
    # Move distribution
    if s.get("move_counts"):
        console.print(f"\n[bold]Move Distribution[/bold]")
        table = Table(show_header=True)
        table.add_column("Move Type")
        table.add_column("Count", justify="right")
        for move, count in sorted(s["move_counts"].items(), key=lambda x: -x[1]):
            table.add_row(move, str(count))
        console.print(table)
    
    # Narrative
    if s.get("narrative"):
        console.print(f"\n[bold]Interpretation[/bold]")
        console.print(f"  {s['narrative']}")
    
    # Sample segments
    if result.segments:
        console.print(f"\n[bold]Sample Classifications[/bold] (first 5)")
        for seg in result.segments[:5]:
            console.print(f"  [{seg.move_type}] ({seg.confidence:.2f})")
            console.print(f"    [dim]{seg.text[:80]}...[/dim]" if len(seg.text) > 80 else f"    [dim]{seg.text}[/dim]")


def _display_summary(result):
    """Display brief summary only."""
    s = result.summary
    console.print(f"Moves: {s.get('classified_segments', 0)} | "
                  f"Confidence: {s.get('average_confidence', 0):.2f} | "
                  f"Top: {', '.join(m for m, c in s.get('top_moves', [])[:3])}")


# ============ EXEMPLARS COMMAND ============

@app.command("exemplars")
def manage_exemplars(
    action: str = typer.Argument(
        ...,
        help="Action: list, add, remove, stats, import",
    ),
    store: Path = typer.Option(
        Path("data/exemplars/default.json"),
        "--store", "-s",
        help="Path to exemplar store",
    ),
    # For add
    text: Optional[str] = typer.Option(None, "--text", "-t", help="Exemplar text"),
    move: Optional[str] = typer.Option(None, "--move", "-m", help="Move type"),
    category: Optional[str] = typer.Option(None, "--category", "-c", help="Move category"),
    notes: Optional[str] = typer.Option(None, "--notes", "-n", help="Annotation notes"),
    source: Optional[str] = typer.Option(None, "--source", help="Source file"),
    speaker: Optional[str] = typer.Option(None, "--speaker", help="Speaker name"),
    # For remove
    id: Optional[str] = typer.Option(None, "--id", help="Exemplar ID to remove"),
    # For import
    import_file: Optional[Path] = typer.Option(None, "--file", help="JSON file to import"),
):
    """
    Manage the exemplar collection.
    
    Actions:
        list   - Show all exemplars
        add    - Add a new exemplar
        remove - Remove by ID
        stats  - Show statistics
        import - Import from JSON file
    
    Examples:
        rhetoric exemplars list
        rhetoric exemplars stats
        rhetoric exemplars add -t "Admittedly, this is true." -m concession -c dialogic
        rhetoric exemplars remove --id abc123
    """
    from .store import ExemplarStore
    
    # Create store dir if needed
    store.parent.mkdir(parents=True, exist_ok=True)
    
    exemplar_store = ExemplarStore(store if store.exists() else None)
    
    if action == "list":
        if not exemplar_store.exemplars:
            console.print("[dim]No exemplars in collection[/dim]")
            return
        
        table = Table(show_header=True, header_style="bold")
        table.add_column("ID", max_width=8)
        table.add_column("Move")
        table.add_column("Category")
        table.add_column("Text", max_width=50)
        table.add_column("Conf")
        
        for e in exemplar_store.exemplars:
            table.add_row(
                e.id[:8],
                e.move_type,
                e.move_category,
                e.text[:47] + "..." if len(e.text) > 50 else e.text,
                e.confidence,
            )
        
        console.print(table)
    
    elif action == "add":
        if not all([text, move, category]):
            console.print("[red]Required: --text, --move, --category[/red]")
            raise typer.Exit(1)
        
        exemplar = exemplar_store.add(
            text=text,
            move_type=move,
            move_category=category,
            notes=notes or "",
            source_file=source or "",
            speaker=speaker or "",
            annotated_by="CLI",
        )
        exemplar_store.save(store)
        
        console.print(f"[green]Added exemplar {exemplar.id[:8]}[/green]")
        console.print(f"  Move: {move} ({category})")
    
    elif action == "remove":
        if not id:
            console.print("[red]Required: --id[/red]")
            raise typer.Exit(1)
        
        # Find by prefix
        matches = [e for e in exemplar_store.exemplars if e.id.startswith(id)]
        if not matches:
            console.print(f"[red]No exemplar found with ID: {id}[/red]")
            raise typer.Exit(1)
        if len(matches) > 1:
            console.print(f"[red]Multiple matches. Be more specific.[/red]")
            raise typer.Exit(1)
        
        exemplar_store.remove(matches[0].id)
        exemplar_store.save(store)
        console.print(f"[green]Removed exemplar {id}[/green]")
    
    elif action == "stats":
        stats = exemplar_store.stats()
        
        console.print(f"[bold]Exemplar Collection Statistics[/bold]")
        console.print(f"  Total: {stats['total_exemplars']}")
        console.print(f"  Sources: {stats['sources']}")
        
        if stats['move_types']:
            console.print(f"\n[bold]By Move Type:[/bold]")
            for move, count in sorted(stats['move_types'].items(), key=lambda x: -x[1]):
                console.print(f"  {move}: {count}")
        
        if stats['categories']:
            console.print(f"\n[bold]By Category:[/bold]")
            for cat, count in sorted(stats['categories'].items(), key=lambda x: -x[1]):
                console.print(f"  {cat}: {count}")
    
    elif action == "import":
        if not import_file or not import_file.exists():
            console.print("[red]Required: --file with valid path[/red]")
            raise typer.Exit(1)
        
        import json
        with open(import_file) as f:
            data = json.load(f)
        
        count = 0
        for e in data.get("exemplars", []):
            exemplar_store.add(
                text=e["text"],
                move_type=e["move_type"],
                move_category=e["move_category"],
                notes=e.get("notes", ""),
                source_file=e.get("source_file", ""),
                speaker=e.get("speaker", ""),
            )
            count += 1
        
        exemplar_store.save(store)
        console.print(f"[green]Imported {count} exemplars[/green]")
    
    else:
        console.print(f"[red]Unknown action: {action}[/red]")
        console.print("Available: list, add, remove, stats, import")


# ============ CONFIG COMMAND ============

@app.command("config")
def manage_config(
    action: str = typer.Argument(
        ...,
        help="Action: show, save, presets",
    ),
    preset: Optional[str] = typer.Option(None, "--preset", "-p", help="Preset name"),
    output: Optional[Path] = typer.Option(None, "--output", "-o", help="Output path"),
):
    """
    Manage analyzer configurations.
    
    Actions:
        show    - Display current/preset config
        save    - Save config to file
        presets - List available presets
    """
    from .config import AnalyzerConfig, PRESETS, get_preset
    import json
    
    if action == "presets":
        console.print("[bold]Available Presets[/bold]")
        for name in PRESETS:
            config = PRESETS[name]
            console.print(f"  {name}")
            console.print(f"    [dim]threshold: {config.classification.confidence_threshold}, "
                          f"method: {config.segmentation.method.value}[/dim]")
    
    elif action == "show":
        config = get_preset(preset) if preset else AnalyzerConfig()
        print(json.dumps(config.to_dict(), indent=2))
    
    elif action == "save":
        if not output:
            console.print("[red]Required: --output[/red]")
            raise typer.Exit(1)
        
        config = get_preset(preset) if preset else AnalyzerConfig()
        config.save(output)
        console.print(f"[green]Config saved to: {output}[/green]")
    
    else:
        console.print(f"[red]Unknown action: {action}[/red]")


# ============ UPLOAD COMMAND ============

@app.command("upload")
def upload_and_analyze(
    files: list[Path] = typer.Argument(
        ...,
        help="Files to upload and analyze",
    ),
    store: Path = typer.Option(
        Path("data/exemplars/default.json"),
        "--store", "-s",
    ),
    preset: Optional[str] = typer.Option(None, "--preset", "-p"),
    output_dir: Path = typer.Option(
        Path("data/results"),
        "--output-dir", "-d",
        help="Directory to save results",
    ),
):
    """
    Upload and analyze multiple files.
    
    Results are saved to the output directory.
    
    Example:
        rhetoric upload doc1.txt doc2.txt doc3.txt --preset transcript
    """
    from .analyzer import EmbeddingRhetoricAnalyzer
    from .store import ExemplarStore
    from .config import get_preset, AnalyzerConfig
    from .results import generate_result_filename
    
    if not store.exists():
        console.print(f"[red]Exemplar store not found: {store}[/red]")
        raise typer.Exit(1)
    
    exemplar_store = ExemplarStore(store)
    config = get_preset(preset) if preset else AnalyzerConfig()
    analyzer = EmbeddingRhetoricAnalyzer(exemplar_store, config)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for file_path in files:
        if not file_path.exists():
            console.print(f"[yellow]Skipping (not found): {file_path}[/yellow]")
            continue
        
        console.print(f"[dim]Analyzing: {file_path}[/dim]")
        
        text = file_path.read_text(encoding="utf-8")
        result = analyzer.analyze(text, str(file_path))
        
        output_file = output_dir / generate_result_filename(str(file_path), result.timestamp)
        result.save(output_file)
        
        console.print(f"  [green]→ {output_file}[/green]")
        console.print(f"    Moves: {result.summary.get('classified_segments', 0)} | "
                      f"Confidence: {result.summary.get('average_confidence', 0):.2f}")
    
    console.print(f"\n[green]Done. Results in: {output_dir}[/green]")


def main():
    app()


if __name__ == "__main__":
    main()
```

---

## Part 8: Dependencies

```toml
# pyproject.toml
[project]
name = "embedding-rhetoric-analyzer"
version = "0.1.0"
description = "Embedding-based rhetorical move analyzer"
requires-python = ">=3.11"
dependencies = [
    "sentence-transformers>=2.2",
    "numpy>=1.24",
    "typer>=0.9",
    "rich>=13.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-cov>=4.0",
]

[project.scripts]
rhetoric = "src.cli:main"

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"
```

---

## Part 9: Starter Exemplars

```json
{
  "version": "1.0",
  "description": "Starter exemplar collection",
  "exemplars": [
    {
      "id": "starter-001",
      "text": "Admittedly, there's research supporting this view.",
      "move_type": "concession",
      "move_category": "dialogic",
      "confidence": "high",
      "notes": "Classic concession marker"
    },
    {
      "id": "starter-002",
      "text": "To be fair, critics have raised valid points.",
      "move_type": "concession",
      "move_category": "dialogic",
      "confidence": "high",
      "notes": "'To be fair' signals acknowledgment"
    },
    {
      "id": "starter-003",
      "text": "Some might argue that this approach is too simplistic.",
      "move_type": "preemption",
      "move_category": "dialogic",
      "confidence": "high",
      "notes": "Anticipates objection"
    },
    {
      "id": "starter-004",
      "text": "However, what we're seeing suggests a different story.",
      "move_type": "contrast",
      "move_category": "structural",
      "confidence": "high",
      "notes": "'However' pivots to counter-point"
    },
    {
      "id": "starter-005",
      "text": "But even so, the evidence points in another direction.",
      "move_type": "contrast",
      "move_category": "structural",
      "confidence": "high",
      "notes": "'But even so' acknowledges then pivots"
    },
    {
      "id": "starter-006",
      "text": "In my experience working with students, I've found this consistently.",
      "move_type": "ethos",
      "move_category": "appeal",
      "confidence": "high",
      "notes": "Personal experience establishes authority"
    },
    {
      "id": "starter-007",
      "text": "The research clearly demonstrates this pattern.",
      "move_type": "logos",
      "move_category": "appeal",
      "confidence": "high",
      "notes": "Appeals to evidence"
    },
    {
      "id": "starter-008",
      "text": "Now more than ever, we need to understand this.",
      "move_type": "kairos",
      "move_category": "appeal",
      "confidence": "high",
      "notes": "Establishes urgency"
    },
    {
      "id": "starter-009",
      "text": "This is a crucial point that deserves attention.",
      "move_type": "amplification",
      "move_category": "emphasis",
      "confidence": "high",
      "notes": "Builds importance"
    },
    {
      "id": "starter-010",
      "text": "It's just a minor consideration, really.",
      "move_type": "diminution",
      "move_category": "emphasis",
      "confidence": "high",
      "notes": "Downplays significance"
    }
  ]
}
```

---

## Future Integration: Skills and Agents

This section outlines how to evolve this analyzer into a modular system of Claude Skills and Agents for your Writer's Portal.

### What Are Skills vs Agents?

**Skills** are focused capabilities that Claude can invoke, each with:
- A clear purpose (analyze rhetoric, search web, fetch documents)
- Defined inputs and outputs
- Instructions on when/how to use

**Agents** are orchestrators that combine skills to accomplish complex tasks:
- Coordinate multiple skills
- Maintain state across steps
- Make decisions about which skills to invoke

### Proposed Skill Architecture

```
writer-portal/
├── skills/
│   ├── rhetoric-analysis/
│   │   ├── SKILL.md           # Instructions for Claude
│   │   ├── invoke.py          # Python interface
│   │   └── schema.json        # Input/output schema
│   ├── web-research/
│   │   ├── SKILL.md
│   │   └── ...
│   ├── document-fetch/
│   │   ├── SKILL.md
│   │   └── ...
│   └── inference-engine/
│       ├── SKILL.md
│       └── ...
├── agents/
│   ├── research-analyst/
│   │   ├── AGENT.md           # Agent instructions
│   │   └── workflow.json      # Skill orchestration
│   └── content-reviewer/
│       └── ...
└── shared/
    ├── config/
    └── results/
```

### Rhetoric Analysis Skill

```markdown
# SKILL.md - Rhetoric Analysis

## Purpose
Analyze text for rhetorical moves using embedding-based classification.

## When to Use
- User asks about argumentative patterns in text
- Analyzing transcripts, essays, or opinion pieces
- Comparing rhetorical strategies across documents

## Inputs
- text: string (required) - Text to analyze
- config_preset: string (optional) - "default", "high_precision", "transcript"
- exemplar_store: string (optional) - Path to exemplar collection

## Outputs
- summary: Object with move counts, confidence, narrative
- segments: Array of classified text segments
- result_path: Path to saved JSON result

## Invocation
```python
from skills.rhetoric_analysis import analyze
result = analyze(text, preset="transcript")
```

## Integration Notes
- Results persist to shared/results/ for cross-skill access
- Can be chained with web-research for comparative analysis
- Supports batch processing for corpus analysis
```

### Research Analyst Agent

```markdown
# AGENT.md - Research Analyst

## Purpose
Conduct multi-source research combining web search, document analysis, and rhetorical interpretation.

## Workflow
1. Parse user research question
2. Invoke web-research skill for current information
3. Invoke document-fetch for relevant internal docs
4. Invoke rhetoric-analysis on key sources
5. Invoke inference-engine to synthesize findings
6. Generate report with citations and rhetorical analysis

## Skill Orchestration
```json
{
  "steps": [
    {"skill": "web-research", "inputs": {"query": "{user_query}"}},
    {"skill": "document-fetch", "inputs": {"keywords": "{extracted_keywords}"}},
    {"skill": "rhetoric-analysis", "inputs": {"text": "{source_text}", "preset": "high_precision"}},
    {"skill": "inference-engine", "inputs": {"sources": "{all_results}"}}
  ]
}
```

## State Management
- Maintains research context across steps
- Tracks source provenance
- Builds cumulative understanding
```

### Integration Path

1. **Phase 1 (Current):** Standalone CLI tool
   - Complete implementation as specified
   - Establish result format and persistence

2. **Phase 2:** Skill Extraction
   - Create `skills/rhetoric-analysis/SKILL.md`
   - Add Python invoke interface
   - Define JSON schema for inputs/outputs

3. **Phase 3:** Agent Development
   - Build research-analyst agent
   - Add web-research and inference skills
   - Create orchestration workflows

4. **Phase 4:** Writer's Portal Integration
   - Web UI for skill invocation
   - Result visualization
   - Exemplar curation interface

### Key Design Decisions for Integration

**Result Format:** JSON with full provenance enables skill chaining. Any skill can read rhetoric analysis results.

**Configuration as Data:** JSON configs work across CLI, API, and agents. Skills can override specific settings.

**Exemplar Store:** Shared exemplar collections can be specialized per domain (podcasts, academic, journalism).

**Stateless Skills:** Each skill invocation is self-contained. State lives in persisted results, not in memory.

---

## Implementation Checklist

- [ ] Create project structure
- [ ] Implement `src/config.py`
- [ ] Implement `src/engine.py`
- [ ] Implement `src/store.py`
- [ ] Implement `src/segmentation.py`
- [ ] Implement `src/results.py`
- [ ] Implement `src/analyzer.py`
- [ ] Implement `src/cli.py`
- [ ] Create `data/exemplars/starter.json`
- [ ] Write tests for core components
- [ ] Test CLI commands end-to-end
- [ ] Document usage in README.md

---

## Testing Commands

```bash
# Install
pip install -e .

# Download model (first run)
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# View presets
rhetoric config presets

# Initialize exemplar store
rhetoric exemplars import --file data/exemplars/starter.json --store data/exemplars/default.json

# Check store
rhetoric exemplars stats

# Analyze a file
rhetoric analyze document.txt

# Analyze transcript
rhetoric analyze transcript.txt --preset transcript --output result.json

# Batch analyze
rhetoric upload *.txt --output-dir results/
```
