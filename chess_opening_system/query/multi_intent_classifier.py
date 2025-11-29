"""
Multi-Intent Classifier
Handles queries with multiple intents (e.g., transposition + recommendation)
"""

import re
from typing import List, Set
from dataclasses import dataclass, field

from .intent_classifier import IntentClassifier, QueryType, QueryIntent


@dataclass
class MultiQueryIntent:
    """Extended query intent supporting multiple query types."""
    query_types: List[QueryType] = field(default_factory=list)
    original_query: str = ""
    target_opening: str = None
    rating_range: tuple = None
    num_variations: int = 5
    depth: int = 10
    side: str = None
    style_preference: str = None
    constraints: dict = field(default_factory=dict)

    @property
    def primary_type(self) -> QueryType:
        """Get the primary (first) query type."""
        return self.query_types[0] if self.query_types else QueryType.UNKNOWN

    def has_type(self, query_type: QueryType) -> bool:
        """Check if this intent includes a specific type."""
        return query_type in self.query_types

    def is_multi_intent(self) -> bool:
        """Check if this is a multi-intent query."""
        return len(self.query_types) > 1


class MultiIntentClassifier(IntentClassifier):
    """
    Enhanced classifier that detects multiple intents in a single query.

    Example:
        "Can I transpose to the Queen's Gambit and what should I play at 1500 elo?"
        → [TRANSPOSITION, RECOMMENDATION]
    """

    def classify_multi(self, query: str) -> MultiQueryIntent:
        """
        Classify a query and detect all applicable intent types.

        Args:
            query: User's natural language query

        Returns:
            MultiQueryIntent object with all detected types
        """
        query_lower = query.lower().strip()

        # Detect ALL matching query types
        query_types = self._detect_all_query_types(query_lower)

        # Extract parameters (same as before)
        target_opening = self._extract_opening_name(query_lower, query_types[0] if query_types else QueryType.UNKNOWN)
        rating_range = self._extract_rating_range(query_lower)
        side = self._extract_side(query_lower)
        style = self._extract_style(query_lower)
        num_variations = self._extract_num_variations(query_lower)

        return MultiQueryIntent(
            query_types=query_types,
            original_query=query,
            target_opening=target_opening,
            rating_range=rating_range,
            num_variations=num_variations,
            side=side,
            style_preference=style
        )

    def _detect_all_query_types(self, query: str) -> List[QueryType]:
        """
        Detect ALL query types present in the query.

        Returns them in priority order (most specific first).
        """
        detected_types: Set[QueryType] = set()

        # Check each pattern set and collect ALL matches
        for pattern in self.TRANSPOSITION_PATTERNS:
            if re.search(pattern, query):
                detected_types.add(QueryType.TRANSPOSITION)
                break  # Only need one match per type

        for pattern in self.EXPLORATION_PATTERNS:
            if re.search(pattern, query):
                detected_types.add(QueryType.EXPLORATION)
                break

        for pattern in self.RECOMMENDATION_PATTERNS:
            if re.search(pattern, query):
                detected_types.add(QueryType.RECOMMENDATION)
                break

        for pattern in self.EXPLANATION_PATTERNS:
            if re.search(pattern, query):
                detected_types.add(QueryType.EXPLANATION)
                break

        for pattern in self.STATISTICS_PATTERNS:
            if re.search(pattern, query):
                detected_types.add(QueryType.STATISTICS)
                break

        for pattern in self.COMPARISON_PATTERNS:
            if re.search(pattern, query):
                detected_types.add(QueryType.COMPARISON)
                break

        for pattern in self.STRUCTURE_PATTERNS:
            if re.search(pattern, query):
                detected_types.add(QueryType.STRUCTURE)
                break

        # Priority order (most specific to least specific)
        priority_order = [
            QueryType.COMPARISON,      # Very specific
            QueryType.TRANSPOSITION,   # Specific action
            QueryType.STRUCTURE,       # Specific analysis
            QueryType.EXPLORATION,     # Broad but focused
            QueryType.RECOMMENDATION,  # Actionable
            QueryType.EXPLANATION,     # Educational
            QueryType.STATISTICS,      # Informational
        ]

        # Sort by priority
        sorted_types = [qt for qt in priority_order if qt in detected_types]

        # If no types detected, return UNKNOWN
        if not sorted_types:
            sorted_types = [QueryType.UNKNOWN]

        return sorted_types

    def split_compound_query(self, query: str) -> List[str]:
        """
        Split a compound query into individual queries.

        Example:
            "Can I transpose to QGD and what should I play?"
            → ["Can I transpose to QGD?", "What should I play?"]
        """
        # Split on common conjunctions
        conjunctions = [
            r'\s+and\s+',
            r'\s*,\s*and\s+',
            r'\s*;\s*',
            r'\s+also\s+',
            r'\s+then\s+',
        ]

        queries = [query]

        for conj_pattern in conjunctions:
            new_queries = []
            for q in queries:
                parts = re.split(conj_pattern, q, flags=re.IGNORECASE)
                new_queries.extend(parts)
            queries = new_queries

        # Clean up and filter
        queries = [q.strip() for q in queries if q.strip()]

        return queries

    def classify_separately(self, query: str) -> List[QueryIntent]:
        """
        Split a compound query and classify each part separately.

        Useful for very complex multi-part queries.

        Returns:
            List of QueryIntent objects, one per sub-query
        """
        sub_queries = self.split_compound_query(query)

        intents = []
        for sub_query in sub_queries:
            intent = self.classify(sub_query)
            intents.append(intent)

        return intents


# Convenience functions

def classify_multi_intent(query: str) -> MultiQueryIntent:
    """
    Classify a query with multi-intent support.

    Args:
        query: User's query string

    Returns:
        MultiQueryIntent object
    """
    classifier = MultiIntentClassifier()
    return classifier.classify_multi(query)


def split_and_classify(query: str) -> List[QueryIntent]:
    """
    Split compound query and classify each part.

    Args:
        query: User's query string

    Returns:
        List of QueryIntent objects
    """
    classifier = MultiIntentClassifier()
    return classifier.classify_separately(query)
