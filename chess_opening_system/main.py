"""
Chess Opening Knowledge System - Main Integration Point
Coordinates all components to process queries and generate responses
"""

import os
from typing import Dict, Any, Optional, Tuple
import chess

from .core.position_graph import PositionGraph
from .core.opening_tree import OpeningTree
from .data.eco_parser import ECOParser
from .data.statistics import StatisticsAggregator
from .query.intent_classifier import IntentClassifier, QueryType
from .query.transposition import TranspositionFinder
from .query.recommendations import RecommendationEngine
from .llm.prompt_builder import PromptBuilder
from .llm.response_parser import ResponseParser


class ChessOpeningSystem:
    """
    Main chess opening knowledge system.
    Integrates all components for query processing.
    """

    def __init__(self, data_dir: str = "data"):
        """
        Initialize the chess opening system.

        Args:
            data_dir: Directory containing opening data files
        """
        self.data_dir = data_dir

        # Initialize core components
        self.position_graph = PositionGraph()
        self.opening_tree = OpeningTree()
        self.eco_parser = ECOParser()

        # Initialize query components
        self.intent_classifier = IntentClassifier()
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
        # Load ECO codes
        eco_csv_path = os.path.join(self.data_dir, "ECO_codes.csv")
        if os.path.exists(eco_csv_path):
            self.eco_parser.load_from_csv(eco_csv_path)
            print(f"✓ Loaded ECO codes: {len(self.eco_parser.openings)} openings")

        # Check for position graph cache
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
                     rating_range: Optional[Tuple[int, int]] = None) -> Dict[str, Any]:
        """
        Process a chess opening query.

        Args:
            query: User's natural language query
            current_fen: Current board position FEN
            rating_range: Optional (min_rating, max_rating) tuple

        Returns:
            Dictionary with structured response data
        """
        # Classify query intent
        intent = self.intent_classifier.classify(query)

        # Use provided rating range or extract from query
        if rating_range is None:
            rating_range = intent.rating_range or (1400, 1800)

        # Gather context data based on query type
        context_data = self._gather_context_data(intent, current_fen, rating_range)

        # Build prompt for LLM
        prompt = self.prompt_builder.build_prompt(intent, context_data)

        # Return structured data (LLM call would happen in the frontend/backend integration)
        return {
            'query_type': intent.query_type.value,
            'intent': intent,
            'context_data': context_data,
            'prompt': prompt,
            'rating_range': rating_range
        }

    def _gather_context_data(self, intent, current_fen: str,
                            rating_range: Tuple[int, int]) -> Dict[str, Any]:
        """Gather relevant context data based on query intent."""
        context = {
            'current_fen': current_fen,
            'rating_range': rating_range
        }

        # Get current position info
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

        # Query-type specific data
        if intent.query_type == QueryType.TRANSPOSITION:
            if intent.target_opening:
                paths = self.transposition_finder.find_transpositions(
                    current_fen, intent.target_opening, max_depth=10
                )
                context['transposition_paths'] = paths

        elif intent.query_type == QueryType.RECOMMENDATION:
            recommendations = self.recommendation_engine.recommend_moves(
                current_fen, rating_range, intent.num_variations, intent.style_preference
            )
            context['move_recommendations'] = recommendations

        elif intent.query_type == QueryType.EXPLORATION:
            if intent.target_opening:
                # Get opening variations
                variations = self.recommendation_engine.get_variations_for_opening(
                    intent.target_opening, intent.num_variations
                )
                context['variations'] = variations

                # Get opening info
                openings = self.eco_parser.get_by_name(intent.target_opening)
                if openings:
                    context['opening_info'] = {
                        'name': openings[0].name,
                        'eco': openings[0].code,
                        'variation': openings[0].variation
                    }

        elif intent.query_type == QueryType.EXPLANATION:
            if intent.target_opening:
                openings = self.eco_parser.get_by_name(intent.target_opening)
                if openings:
                    opening = openings[0]
                    context['opening_info'] = {
                        'name': opening.name,
                        'eco': opening.code,
                        'variation': opening.variation
                    }

                    # Get strategic themes from tree
                    tree_nodes = self.opening_tree.get_opening_by_name(intent.target_opening)
                    if tree_nodes:
                        node = tree_nodes[0]
                        context['strategic_themes'] = node.strategic_themes
                        context['typical_plans'] = node.typical_plans

        elif intent.query_type == QueryType.STATISTICS:
            stats = self.statistics_aggregator.get_comprehensive_stats(
                current_fen, rating_range
            )
            context['statistics'] = stats

            # Get breakdown by multiple rating ranges
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

        return context

    def build_position_graph_from_lichess(self, max_positions: int = 10000):
        """
        Build position graph by exploring openings via Lichess API.

        Args:
            max_positions: Maximum positions to explore
        """
        from collections import deque
        from .data.lichess_client import LichessClient

        print(f"Building position graph from Lichess (max {max_positions} positions)...")

        lichess = LichessClient()
        explored = set()
        queue = deque([chess.STARTING_FEN])

        positions_added = 0

        while queue and positions_added < max_positions:
            fen = queue.popleft()

            if fen in explored:
                continue

            explored.add(fen)

            # Add position to graph
            position = self.position_graph.add_position(fen)

            # Get popular moves from Lichess
            stats = lichess.get_opening_stats(fen, rating_range=(1400, 1800))

            if stats and stats.moves:
                for move_data in stats.moves[:5]:  # Top 5 moves
                    try:
                        board = chess.Board(fen)
                        move = chess.Move.from_uci(move_data['uci'])
                        board.push(move)
                        next_fen = board.fen()

                        # Calculate frequency
                        total = move_data.get('white', 0) + move_data.get('black', 0) + move_data.get('draws', 0)
                        frequency = total / stats.total_games if stats.total_games > 0 else 0

                        # Add edge
                        self.position_graph.add_move(
                            fen, move_data['uci'], next_fen,
                            frequency=frequency
                        )

                        # Add to queue for exploration
                        if next_fen not in explored:
                            queue.append(next_fen)

                    except Exception as e:
                        print(f"Error processing move: {e}")
                        continue

            positions_added += 1

            if positions_added % 100 == 0:
                print(f"  Processed {positions_added} positions...")

        print(f"✓ Built position graph with {len(self.position_graph.nodes)} positions")

        # Save cache
        cache_path = os.path.join(self.data_dir, "position_graph.pkl")
        self.position_graph.save_to_file(cache_path, format='pickle')
        print(f"✓ Saved position graph cache to {cache_path}")

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


# Convenience functions

def create_opening_system(data_dir: str = "data") -> ChessOpeningSystem:
    """
    Create and initialize chess opening system.

    Args:
        data_dir: Data directory path

    Returns:
        Initialized ChessOpeningSystem
    """
    return ChessOpeningSystem(data_dir)


def process_opening_query(query: str, current_fen: str = chess.STARTING_FEN,
                          rating_range: Tuple[int, int] = (1400, 1800),
                          system: Optional[ChessOpeningSystem] = None) -> Dict[str, Any]:
    """
    Process an opening query.

    Args:
        query: User query
        current_fen: Current position
        rating_range: Rating range
        system: Optional existing system instance

    Returns:
        Response dictionary
    """
    if system is None:
        system = create_opening_system()

    return system.process_query(query, current_fen, rating_range)
