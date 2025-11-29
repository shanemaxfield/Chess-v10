"""
Query Intent Classifier
Identifies the type and parameters of user chess queries
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class QueryType(Enum):
    """Types of chess opening queries."""
    TRANSPOSITION = "transposition"  # "Can I transpose to..."
    EXPLORATION = "exploration"  # "Show me popular lines"
    RECOMMENDATION = "recommendation"  # "What should I play"
    EXPLANATION = "explanation"  # "What are the main ideas"
    STATISTICS = "statistics"  # "How popular is this"
    COMPARISON = "comparison"  # "Compare X vs Y"
    STRUCTURE = "structure"  # "Similar pawn structures"
    UNKNOWN = "unknown"


@dataclass
class QueryIntent:
    """Parsed query intent and parameters."""
    query_type: QueryType
    original_query: str
    target_opening: Optional[str] = None
    rating_range: Optional[Tuple[int, int]] = None
    num_variations: int = 5
    depth: int = 10
    side: Optional[str] = None  # "white" or "black"
    style_preference: Optional[str] = None  # "aggressive", "positional", etc.
    constraints: Dict[str, any] = None

    def __post_init__(self):
        if self.constraints is None:
            self.constraints = {}


class IntentClassifier:
    """
    Classifies chess opening queries and extracts parameters.
    """

    # Pattern definitions
    TRANSPOSITION_PATTERNS = [
        r"can\s+(?:i|we)\s+transpose\s+(?:to|into)\s+(?:the\s+)?(.+)",
        r"transpose\s+(?:to|into)\s+(?:the\s+)?(.+)",
        r"reach\s+(?:the\s+)?(.+)\s+(?:from\s+here|via)",
        r"get\s+(?:to|into)\s+(?:the\s+)?(.+)",
    ]

    EXPLORATION_PATTERNS = [
        r"show\s+(?:me\s+)?(.+)\s+(?:lines|variations)",
        r"(?:popular|common)\s+(?:lines|variations)\s+(?:in|for)\s+(?:the\s+)?(.+)",
        r"what\s+are\s+the\s+(?:main|popular|common)\s+(?:lines|variations)\s+(?:in|of)\s+(?:the\s+)?(.+)",
        r"explore\s+(?:the\s+)?(.+)",
    ]

    RECOMMENDATION_PATTERNS = [
        r"what\s+should\s+(?:i|we)\s+play",
        r"(?:best|good)\s+(?:moves|continuations)",
        r"recommend\s+(?:a\s+)?(?:move|continuation|opening)",
        r"suggest\s+(?:a\s+)?(?:move|continuation)",
        r"what\s+(?:to\s+)?play\s+(?:here|now)",
    ]

    EXPLANATION_PATTERNS = [
        r"what\s+are\s+the\s+(?:main\s+)?ideas\s+(?:in|of|behind)\s+(?:the\s+)?(.+)",
        r"explain\s+(?:the\s+)?(.+)",
        r"(?:strategic\s+)?(?:ideas|themes|plans)\s+(?:in|of|for)\s+(?:the\s+)?(.+)",
        r"how\s+(?:to\s+)?play\s+(?:the\s+)?(.+)",
        r"what'?s\s+the\s+plan\s+(?:in|for)\s+(?:the\s+)?(.+)",
    ]

    STATISTICS_PATTERNS = [
        r"how\s+popular\s+is\s+(?:the\s+)?(.+)",
        r"(?:win\s+rate|statistics|stats)\s+(?:for|of)\s+(?:the\s+)?(.+)",
        r"how\s+(?:often|frequently)\s+is\s+(?:the\s+)?(.+)\s+played",
    ]

    COMPARISON_PATTERNS = [
        r"compare\s+(.+)\s+(?:vs|versus|and)\s+(.+)",
        r"(.+)\s+(?:vs|versus)\s+(.+)",
        r"difference\s+between\s+(.+)\s+and\s+(.+)",
    ]

    STRUCTURE_PATTERNS = [
        r"similar\s+(?:pawn\s+)?structures?\s+(?:to|like)\s+(?:the\s+)?(.+)",
        r"positions?\s+with\s+similar\s+(?:pawn\s+)?structures?",
        r"find\s+similar\s+structures?",
    ]

    RATING_PATTERNS = [
        r"(\d{3,4})\s*-\s*(\d{3,4})\s*(?:elo|rating)?",
        r"(?:at|for)\s+(\d{3,4})\s*(?:elo|rating)?",
        r"(\d{3,4})\s+(?:to|through)\s+(\d{3,4})",
    ]

    def __init__(self):
        """Initialize the intent classifier."""
        pass

    def classify(self, query: str) -> QueryIntent:
        """
        Classify a query and extract parameters.

        Args:
            query: User's natural language query

        Returns:
            QueryIntent object
        """
        query_lower = query.lower().strip()

        # Detect query type
        query_type = self._detect_query_type(query_lower)

        # Extract opening name
        target_opening = self._extract_opening_name(query_lower, query_type)

        # Extract rating range
        rating_range = self._extract_rating_range(query_lower)

        # Extract side preference
        side = self._extract_side(query_lower)

        # Extract style preference
        style = self._extract_style(query_lower)

        # Extract number of variations
        num_variations = self._extract_num_variations(query_lower)

        return QueryIntent(
            query_type=query_type,
            original_query=query,
            target_opening=target_opening,
            rating_range=rating_range,
            num_variations=num_variations,
            side=side,
            style_preference=style
        )

    def _detect_query_type(self, query: str) -> QueryType:
        """Detect the type of query."""
        # Check each pattern set
        for pattern in self.TRANSPOSITION_PATTERNS:
            if re.search(pattern, query):
                return QueryType.TRANSPOSITION

        for pattern in self.EXPLORATION_PATTERNS:
            if re.search(pattern, query):
                return QueryType.EXPLORATION

        for pattern in self.RECOMMENDATION_PATTERNS:
            if re.search(pattern, query):
                return QueryType.RECOMMENDATION

        for pattern in self.EXPLANATION_PATTERNS:
            if re.search(pattern, query):
                return QueryType.EXPLANATION

        for pattern in self.STATISTICS_PATTERNS:
            if re.search(pattern, query):
                return QueryType.STATISTICS

        for pattern in self.COMPARISON_PATTERNS:
            if re.search(pattern, query):
                return QueryType.COMPARISON

        for pattern in self.STRUCTURE_PATTERNS:
            if re.search(pattern, query):
                return QueryType.STRUCTURE

        return QueryType.UNKNOWN

    def _extract_opening_name(self, query: str, query_type: QueryType) -> Optional[str]:
        """Extract opening name from query."""
        # Get appropriate patterns based on query type
        patterns = []

        if query_type == QueryType.TRANSPOSITION:
            patterns = self.TRANSPOSITION_PATTERNS
        elif query_type == QueryType.EXPLORATION:
            patterns = self.EXPLORATION_PATTERNS
        elif query_type == QueryType.EXPLANATION:
            patterns = self.EXPLANATION_PATTERNS
        elif query_type == QueryType.STATISTICS:
            patterns = self.STATISTICS_PATTERNS

        for pattern in patterns:
            match = re.search(pattern, query)
            if match:
                opening_name = match.group(1).strip()
                # Clean up common suffixes
                opening_name = re.sub(r'\s+(?:opening|defense|game|variation)$', '', opening_name)
                return opening_name.title()

        return None

    def _extract_rating_range(self, query: str) -> Optional[Tuple[int, int]]:
        """Extract rating range from query."""
        for pattern in self.RATING_PATTERNS:
            match = re.search(pattern, query)
            if match:
                if len(match.groups()) == 2:
                    # Range specified
                    min_rating = int(match.group(1))
                    max_rating = int(match.group(2))
                    return (min_rating, max_rating)
                else:
                    # Single rating - create range around it
                    rating = int(match.group(1))
                    return (rating - 200, rating + 200)

        # Check for skill level keywords
        if re.search(r'\b(?:beginner|novice)\b', query):
            return (800, 1400)
        elif re.search(r'\b(?:intermediate|club)\b', query):
            return (1400, 1800)
        elif re.search(r'\b(?:advanced|strong)\b', query):
            return (1800, 2200)
        elif re.search(r'\b(?:master|expert)\b', query):
            return (2200, 2600)

        return None

    def _extract_side(self, query: str) -> Optional[str]:
        """Extract side preference."""
        if re.search(r'\b(?:as\s+)?white\b', query):
            return 'white'
        elif re.search(r'\b(?:as\s+)?black\b', query):
            return 'black'
        return None

    def _extract_style(self, query: str) -> Optional[str]:
        """Extract playing style preference."""
        style_keywords = {
            'aggressive': ['aggressive', 'attacking', 'tactical', 'sharp'],
            'positional': ['positional', 'strategic', 'quiet', 'solid'],
            'solid': ['solid', 'safe', 'defensive'],
            'dynamic': ['dynamic', 'complex', 'unbalanced']
        }

        for style, keywords in style_keywords.items():
            for keyword in keywords:
                if keyword in query:
                    return style

        return None

    def _extract_num_variations(self, query: str) -> int:
        """Extract number of variations requested."""
        # Look for numbers in common contexts
        match = re.search(r'(?:top|show|give)\s+(?:me\s+)?(\d+)', query)
        if match:
            return min(int(match.group(1)), 20)  # Cap at 20

        # Look for "few", "several", "many"
        if re.search(r'\bfew\b', query):
            return 3
        elif re.search(r'\bseveral\b', query):
            return 5
        elif re.search(r'\bmany\b', query):
            return 10

        return 5  # Default

    def extract_comparison_targets(self, query: str) -> Optional[Tuple[str, str]]:
        """Extract opening names from comparison query."""
        for pattern in self.COMPARISON_PATTERNS:
            match = re.search(pattern, query.lower())
            if match:
                opening1 = match.group(1).strip().title()
                opening2 = match.group(2).strip().title()
                return (opening1, opening2)
        return None


# Convenience function
def classify_query(query: str) -> QueryIntent:
    """
    Classify a chess opening query.

    Args:
        query: User's query string

    Returns:
        QueryIntent object
    """
    classifier = IntentClassifier()
    return classifier.classify(query)
