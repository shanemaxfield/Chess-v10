"""
Enhanced Chess Opening System with Multi-Intent Support
Handles compound queries like "Can I transpose to QGD and what should I play?"
"""

import os
from typing import Dict, Any, Optional, Tuple, List
import chess

from .core.position_graph import PositionGraph
from .core.opening_tree import OpeningTree
from .data.eco_parser import ECOParser
from .data.statistics import StatisticsAggregator
from .query.intent_classifier import QueryType
from .query.multi_intent_classifier import MultiIntentClassifier, MultiQueryIntent
from .query.transposition import TranspositionFinder
from .query.recommendations import RecommendationEngine
from .llm.prompt_builder import PromptBuilder
from .llm.response_parser import ResponseParser


class EnhancedChessOpeningSystem:
    """
    Enhanced chess opening system with multi-intent query support.

    Handles compound queries that combine multiple intent types:
    - "Can I transpose to QGD and what should I play at 1500?"
    - "Show me Sicilian lines and explain the main ideas"
    - "What are the statistics and good recommendations?"
    """

    def __init__(self, data_dir: str = "data"):
        """Initialize the enhanced system."""
        self.data_dir = data_dir

        # Initialize core components
        self.position_graph = PositionGraph()
        self.opening_tree = OpeningTree()
        self.eco_parser = ECOParser()

        # Use multi-intent classifier
        self.intent_classifier = MultiIntentClassifier()
        self.statistics_aggregator = StatisticsAggregator(self.position_graph)

        # Lazy-initialized components
        self._transposition_finder = None
        self._recommendation_engine = None

        # Initialize LLM components
        self.prompt_builder = PromptBuilder()
        self.response_parser = ResponseParser()

        # Load data
        self._load_data()

    def _load_data(self):
        """Load opening data from files."""
        eco_csv_path = os.path.join(self.data_dir, "ECO_codes.csv")
        if os.path.exists(eco_csv_path):
            self.eco_parser.load_from_csv(eco_csv_path)
            print(f"✓ Loaded ECO codes: {len(self.eco_parser.openings)} openings")

        graph_cache_path = os.path.join(self.data_dir, "position_graph.pkl")
        if os.path.exists(graph_cache_path):
            try:
                self.position_graph.load_from_file(graph_cache_path, format='pickle')
                print(f"✓ Loaded position graph: {len(self.position_graph.nodes)} positions")
            except Exception as e:
                print(f"⚠ Failed to load position graph cache: {e}")

    @property
    def transposition_finder(self) -> TranspositionFinder:
        """Lazy-initialize transposition finder."""
        if self._transposition_finder is None:
            self._transposition_finder = TranspositionFinder(
                self.position_graph,
                self.opening_tree,
                self.eco_parser
            )
        return self._transposition_finder

    @property
    def recommendation_engine(self) -> RecommendationEngine:
        """Lazy-initialize recommendation engine."""
        if self._recommendation_engine is None:
            self._recommendation_engine = RecommendationEngine(
                self.position_graph,
                self.opening_tree,
                self.eco_parser,
                self.statistics_aggregator
            )
        return self._recommendation_engine

    def process_query(self, query: str, current_fen: str = chess.STARTING_FEN,
                     rating_range: Optional[Tuple[int, int]] = None,
                     use_multi_intent: bool = True) -> Dict[str, Any]:
        """
        Process a chess opening query with optional multi-intent support.

        Args:
            query: User's natural language query
            current_fen: Current board position FEN
            rating_range: Optional (min_rating, max_rating) tuple
            use_multi_intent: If True, detect and handle multiple intents

        Returns:
            Dictionary with structured response data
        """
        if use_multi_intent:
            return self._process_multi_intent_query(query, current_fen, rating_range)
        else:
            # Fall back to single-intent processing
            intent = self.intent_classifier.classify(query)
            return self._process_single_intent(intent, current_fen, rating_range)

    def _process_multi_intent_query(self, query: str, current_fen: str,
                                    rating_range: Optional[Tuple[int, int]]) -> Dict[str, Any]:
        """Process query with multiple intents."""
        # Classify with multi-intent support
        multi_intent = self.intent_classifier.classify_multi(query)

        # Use provided rating range or extract from query
        if rating_range is None:
            rating_range = multi_intent.rating_range or (1400, 1800)

        # Gather context for ALL detected intent types
        context_data = self._gather_multi_context(multi_intent, current_fen, rating_range)

        # Build prompt that includes all contexts
        prompt = self._build_multi_intent_prompt(multi_intent, context_data)

        return {
            'query_types': [qt.value for qt in multi_intent.query_types],
            'primary_type': multi_intent.primary_type.value,
            'is_multi_intent': multi_intent.is_multi_intent(),
            'intent': multi_intent,
            'context_data': context_data,
            'prompt': prompt,
            'rating_range': rating_range
        }

    def _process_single_intent(self, intent, current_fen: str,
                              rating_range: Optional[Tuple[int, int]]) -> Dict[str, Any]:
        """Process query with single intent (legacy behavior)."""
        if rating_range is None:
            rating_range = intent.rating_range or (1400, 1800)

        context_data = self._gather_single_context(intent, current_fen, rating_range)
        prompt = self.prompt_builder.build_prompt(intent, context_data)

        return {
            'query_type': intent.query_type.value,
            'intent': intent,
            'context_data': context_data,
            'prompt': prompt,
            'rating_range': rating_range
        }

    def _gather_multi_context(self, intent: MultiQueryIntent, current_fen: str,
                             rating_range: Tuple[int, int]) -> Dict[str, Any]:
        """Gather context data for ALL detected intent types."""
        context = {
            'current_fen': current_fen,
            'rating_range': rating_range
        }

        # Get current position info (always useful)
        current_position = self.position_graph.get_position(current_fen)
        if current_position:
            context['current_position_info'] = {
                'openings': [
                    {'name': op.name, 'eco': op.eco, 'variation': op.variation}
                    for op in current_position.openings
                ],
                'strategic_themes': current_position.strategic_themes,
                'typical_plans': current_position.typical_plans
            }

        # Process EACH intent type (not if/elif!)
        if intent.has_type(QueryType.TRANSPOSITION):
            if intent.target_opening:
                paths = self.transposition_finder.find_transpositions(
                    current_fen, intent.target_opening, max_depth=10
                )
                context['transposition_paths'] = paths

        if intent.has_type(QueryType.RECOMMENDATION):
            recommendations = self.recommendation_engine.recommend_moves(
                current_fen, rating_range, intent.num_variations, intent.style_preference
            )
            context['move_recommendations'] = recommendations

        if intent.has_type(QueryType.EXPLORATION):
            if intent.target_opening:
                variations = self.recommendation_engine.get_variations_for_opening(
                    intent.target_opening, intent.num_variations
                )
                context['variations'] = variations

                openings = self.eco_parser.get_by_name(intent.target_opening)
                if openings:
                    context['opening_info'] = {
                        'name': openings[0].name,
                        'eco': openings[0].code,
                        'variation': openings[0].variation
                    }

        if intent.has_type(QueryType.EXPLANATION):
            if intent.target_opening:
                openings = self.eco_parser.get_by_name(intent.target_opening)
                if openings:
                    opening = openings[0]
                    context['opening_info'] = {
                        'name': opening.name,
                        'eco': opening.code,
                        'variation': opening.variation
                    }

                    tree_nodes = self.opening_tree.get_opening_by_name(intent.target_opening)
                    if tree_nodes:
                        node = tree_nodes[0]
                        context['strategic_themes'] = node.strategic_themes
                        context['typical_plans'] = node.typical_plans

        if intent.has_type(QueryType.STATISTICS):
            stats = self.statistics_aggregator.get_comprehensive_stats(
                current_fen, rating_range
            )
            context['statistics'] = stats

            rating_ranges = [
                (1000, 1400),
                (1400, 1800),
                (1800, 2200),
                (2200, 2600)
            ]
            breakdown = self.statistics_aggregator.compare_rating_ranges(
                current_fen, rating_ranges
            )
            context['rating_breakdown'] = breakdown

        if intent.has_type(QueryType.COMPARISON):
            # Comparison logic would go here
            pass

        if intent.has_type(QueryType.STRUCTURE):
            similar = self.position_graph.find_similar_structures(current_fen)
            context['similar_structures'] = similar

        return context

    def _gather_single_context(self, intent, current_fen: str,
                               rating_range: Tuple[int, int]) -> Dict[str, Any]:
        """Gather context for single intent (legacy)."""
        # Same as original implementation
        # (keeping for backward compatibility)
        # This would be the same as the original _gather_context_data
        pass

    def _build_multi_intent_prompt(self, intent: MultiQueryIntent,
                                   context: Dict[str, Any]) -> str:
        """Build prompt for multi-intent query."""
        prompt_parts = []

        prompt_parts.append("""You are a chess opening expert. The user has asked a compound question with multiple parts.
Answer ALL parts of their question comprehensively.

CRITICAL: Use ONLY the verified data provided below. Never hallucinate moves or positions.
""")

        # Add context for each intent type
        for query_type in intent.query_types:
            if query_type == QueryType.TRANSPOSITION:
                if 'transposition_paths' in context:
                    prompt_parts.append(f"\n=== TRANSPOSITION DATA ===")
                    paths = context['transposition_paths']
                    if paths:
                        prompt_parts.append(f"Found {len(paths)} path(s):")
                        for i, path in enumerate(paths[:3], 1):
                            prompt_parts.append(f"\nPath {i}: {path.format_moves()}")
                            prompt_parts.append(f"  → {path.opening_name} ({path.eco_code})")

            if query_type == QueryType.RECOMMENDATION:
                if 'move_recommendations' in context:
                    prompt_parts.append(f"\n=== MOVE RECOMMENDATIONS ===")
                    recs = context['move_recommendations']
                    for i, rec in enumerate(recs, 1):
                        prompt_parts.append(f"\n{i}. {rec.move_san}")
                        prompt_parts.append(f"   Win rate: {rec.win_rate:.1f}%")
                        prompt_parts.append(f"   Reason: {rec.reason}")

            if query_type == QueryType.STATISTICS:
                if 'statistics' in context:
                    prompt_parts.append(f"\n=== STATISTICS ===")
                    stats = context['statistics']
                    prompt_parts.append(f"Games: {stats.total_games}")
                    prompt_parts.append(f"White: {stats.white_win_rate:.1f}%")

        prompt_parts.append(f"\n\nUser Query: {intent.original_query}")

        prompt_parts.append("""\n\nProvide a comprehensive response addressing ALL parts of the query.
Return valid JSON with explanation, moves, variations, and ui_commands.""")

        return "\n".join(prompt_parts)

    def get_statistics(self) -> Dict[str, Any]:
        """Get system statistics."""
        return {
            'position_graph': self.position_graph.get_statistics(),
            'eco_parser': self.eco_parser.get_statistics(),
            'opening_tree': {
                'total_nodes': len(self.opening_tree._eco_index),
                'total_variations': len(self.opening_tree._name_index)
            }
        }


# Convenience function
def create_enhanced_system(data_dir: str = "data") -> EnhancedChessOpeningSystem:
    """Create enhanced opening system with multi-intent support."""
    return EnhancedChessOpeningSystem(data_dir)
