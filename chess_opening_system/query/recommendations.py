"""
Opening Recommendations System
Suggests openings and moves based on various criteria
"""

from typing import List, Optional, Dict, Tuple
from dataclasses import dataclass
import chess

from ..core.position_graph import PositionGraph
from ..core.opening_tree import OpeningTree
from ..data.eco_parser import ECOParser
from ..data.statistics import StatisticsAggregator


@dataclass
class MoveRecommendation:
    """Recommendation for a specific move."""
    move_uci: str
    move_san: str
    popularity: float  # 0.0 to 1.0
    win_rate: float  # White's expected score
    games_count: int
    opening_name: Optional[str] = None
    eco_code: Optional[str] = None
    evaluation: Optional[float] = None
    key_ideas: List[str] = None
    reason: str = ""  # Why this move is recommended

    def __post_init__(self):
        if self.key_ideas is None:
            self.key_ideas = []


@dataclass
class OpeningRecommendation:
    """Recommendation for an opening system."""
    opening_name: str
    eco_code: str
    variation: str = ""
    sample_moves: List[str] = None
    popularity: float = 0.0
    success_rate: float = 0.0
    strategic_themes: List[str] = None
    typical_plans: Dict[str, List[str]] = None
    difficulty: str = "intermediate"  # "beginner", "intermediate", "advanced"
    style: str = "balanced"  # "aggressive", "positional", "solid", "dynamic"
    reason: str = ""

    def __post_init__(self):
        if self.sample_moves is None:
            self.sample_moves = []
        if self.strategic_themes is None:
            self.strategic_themes = []
        if self.typical_plans is None:
            self.typical_plans = {}


class RecommendationEngine:
    """
    Generates move and opening recommendations based on:
    - Rating range
    - Playing style
    - Position characteristics
    - Statistical data
    """

    def __init__(self, position_graph: PositionGraph,
                 opening_tree: OpeningTree,
                 eco_parser: ECOParser,
                 statistics_aggregator: Optional[StatisticsAggregator] = None):
        """
        Initialize recommendation engine.

        Args:
            position_graph: Position graph database
            opening_tree: Opening tree
            eco_parser: ECO parser
            statistics_aggregator: Statistics aggregator (optional)
        """
        self.position_graph = position_graph
        self.opening_tree = opening_tree
        self.eco_parser = eco_parser
        self.stats_aggregator = statistics_aggregator or StatisticsAggregator(position_graph)

    def recommend_moves(self, fen: str, rating_range: Tuple[int, int],
                       num_recommendations: int = 5,
                       style_preference: Optional[str] = None) -> List[MoveRecommendation]:
        """
        Recommend moves for a position.

        Args:
            fen: Position FEN
            rating_range: (min_rating, max_rating)
            num_recommendations: Number of moves to recommend
            style_preference: Playing style ("aggressive", "positional", etc.)

        Returns:
            List of MoveRecommendation objects
        """
        # Get popular moves from statistics
        popular_moves = self.stats_aggregator.get_rating_based_recommendations(
            fen, rating_range, num_recommendations * 2
        )

        recommendations = []

        for move_data in popular_moves[:num_recommendations]:
            move_san = move_data['move']
            move_uci = move_data['uci']

            # Calculate expected score (from white's perspective)
            total = move_data['games']
            if total > 0:
                white_score = (move_data['white_wins'] + 0.5 * move_data['draws']) / total
            else:
                white_score = 0.5

            # Get position after move
            board = chess.Board(fen)
            try:
                move = chess.Move.from_uci(move_uci)
                board.push(move)
                next_fen = board.fen()

                # Get opening info for resulting position
                position = self.position_graph.get_position(next_fen)
                opening_name = None
                eco_code = None
                key_ideas = []

                if position and position.openings:
                    opening_name = position.openings[0].name
                    eco_code = position.openings[0].eco
                    key_ideas = position.strategic_themes

                # Generate reason
                reason = self._generate_move_reason(
                    move_data, white_score, opening_name, style_preference
                )

                recommendation = MoveRecommendation(
                    move_uci=move_uci,
                    move_san=move_san,
                    popularity=move_data.get('popularity', 0),
                    win_rate=white_score * 100,
                    games_count=total,
                    opening_name=opening_name,
                    eco_code=eco_code,
                    key_ideas=key_ideas,
                    reason=reason
                )

                recommendations.append(recommendation)

            except (ValueError, chess.IllegalMoveError):
                continue

        return recommendations

    def recommend_openings(self, side: str, rating_range: Tuple[int, int],
                          style_preference: Optional[str] = None,
                          num_recommendations: int = 5) -> List[OpeningRecommendation]:
        """
        Recommend opening systems.

        Args:
            side: "white" or "black"
            rating_range: (min_rating, max_rating)
            style_preference: Playing style
            num_recommendations: Number of openings to recommend

        Returns:
            List of OpeningRecommendation objects
        """
        # Get popular openings from tree
        all_openings = []

        # Traverse opening tree to find suitable openings
        def collect_openings(node, depth=0):
            if depth > 6:  # Don't go too deep for main openings
                return

            if node.opening_name and node.eco_code:
                all_openings.append(node)

            for child in node.children:
                collect_openings(child, depth + 1)

        collect_openings(self.opening_tree.root)

        # Score and filter openings
        scored_openings = []
        for opening_node in all_openings:
            score = self._score_opening(
                opening_node, side, rating_range, style_preference
            )
            if score > 0:
                scored_openings.append((score, opening_node))

        # Sort by score
        scored_openings.sort(key=lambda x: x[0], reverse=True)

        # Convert to recommendations
        recommendations = []
        for score, opening_node in scored_openings[:num_recommendations]:
            reason = self._generate_opening_reason(
                opening_node, side, rating_range, style_preference
            )

            recommendation = OpeningRecommendation(
                opening_name=opening_node.opening_name,
                eco_code=opening_node.eco_code,
                variation=opening_node.variation,
                sample_moves=opening_node.moves.split() if opening_node.moves else [],
                popularity=opening_node.popularity,
                strategic_themes=opening_node.strategic_themes,
                typical_plans=opening_node.typical_plans,
                style=self._classify_opening_style(opening_node),
                reason=reason
            )

            recommendations.append(recommendation)

        return recommendations

    def _generate_move_reason(self, move_data: Dict, win_rate: float,
                             opening_name: Optional[str],
                             style_preference: Optional[str]) -> str:
        """Generate explanation for move recommendation."""
        reasons = []

        # Popularity reason
        if move_data['games'] > 1000:
            reasons.append("Very popular in this rating range")
        elif move_data['games'] > 100:
            reasons.append("Commonly played")

        # Win rate reason
        if win_rate > 0.55:
            reasons.append("leads to favorable positions for White")
        elif win_rate < 0.45:
            reasons.append("leads to favorable positions for Black")

        # Opening reason
        if opening_name:
            reasons.append(f"enters the {opening_name}")

        # Style reason
        if style_preference == "aggressive" and win_rate != 0.5:
            reasons.append("creates winning chances")
        elif style_preference == "solid" and abs(win_rate - 0.5) < 0.05:
            reasons.append("maintains balance")

        return "; ".join(reasons) if reasons else "Solid continuation"

    def _score_opening(self, opening_node, side: str, rating_range: Tuple[int, int],
                      style_preference: Optional[str]) -> float:
        """Score an opening for recommendation."""
        score = 0.0

        # Base score from popularity
        score += opening_node.popularity * 10

        # Adjust for style
        opening_style = self._classify_opening_style(opening_node)
        if style_preference and opening_style == style_preference:
            score += 5

        # Adjust for side
        # This is simplified - would need more sophisticated logic
        if side == "white" and opening_node.moves.startswith("1.e4"):
            score += 2
        elif side == "black" and "defense" in opening_node.opening_name.lower():
            score += 2

        return score

    def _classify_opening_style(self, opening_node) -> str:
        """Classify opening style based on themes."""
        themes_lower = [t.lower() for t in opening_node.strategic_themes]

        aggressive_keywords = ['attack', 'aggressive', 'tactical', 'sharp']
        positional_keywords = ['positional', 'strategic', 'maneuvering']
        solid_keywords = ['solid', 'safe', 'defensive']

        aggressive_count = sum(
            any(kw in theme for kw in aggressive_keywords) for theme in themes_lower
        )
        positional_count = sum(
            any(kw in theme for kw in positional_keywords) for theme in themes_lower
        )
        solid_count = sum(
            any(kw in theme for kw in solid_keywords) for theme in themes_lower
        )

        if aggressive_count > max(positional_count, solid_count):
            return "aggressive"
        elif solid_count > positional_count:
            return "solid"
        elif positional_count > 0:
            return "positional"
        else:
            return "balanced"

    def _generate_opening_reason(self, opening_node, side: str,
                                 rating_range: Tuple[int, int],
                                 style_preference: Optional[str]) -> str:
        """Generate explanation for opening recommendation."""
        reasons = []

        style = self._classify_opening_style(opening_node)
        reasons.append(f"{style.capitalize()} opening")

        if opening_node.popularity > 0.5:
            reasons.append("very popular at this level")
        elif opening_node.popularity > 0.2:
            reasons.append("well-established")

        if style_preference and style == style_preference:
            reasons.append(f"matches your {style_preference} style")

        return "; ".join(reasons)

    def get_variations_for_opening(self, opening_name: str,
                                   max_variations: int = 5) -> List[Dict]:
        """
        Get main variations of an opening.

        Args:
            opening_name: Opening name
            max_variations: Maximum variations to return

        Returns:
            List of variation dictionaries
        """
        opening_nodes = self.opening_tree.get_opening_by_name(opening_name)

        variations = []
        for node in opening_nodes[:max_variations]:
            variation = {
                'name': node.variation or node.opening_name,
                'eco': node.eco_code,
                'moves': node.moves,
                'key_ideas': node.key_ideas,
                'popularity': node.popularity
            }
            variations.append(variation)

        return variations


# Convenience functions

def get_move_recommendations(fen: str, rating_range: Tuple[int, int],
                            position_graph: PositionGraph,
                            opening_tree: OpeningTree,
                            eco_parser: ECOParser,
                            num_moves: int = 5) -> List[MoveRecommendation]:
    """
    Get move recommendations for a position.

    Args:
        fen: Position FEN
        rating_range: Rating range
        position_graph: Position graph
        opening_tree: Opening tree
        eco_parser: ECO parser
        num_moves: Number of moves

    Returns:
        List of MoveRecommendation objects
    """
    engine = RecommendationEngine(position_graph, opening_tree, eco_parser)
    return engine.recommend_moves(fen, rating_range, num_moves)


def get_opening_recommendations(side: str, rating_range: Tuple[int, int],
                               position_graph: PositionGraph,
                               opening_tree: OpeningTree,
                               eco_parser: ECOParser,
                               style: Optional[str] = None) -> List[OpeningRecommendation]:
    """
    Get opening recommendations.

    Args:
        side: "white" or "black"
        rating_range: Rating range
        position_graph: Position graph
        opening_tree: Opening tree
        eco_parser: ECO parser
        style: Playing style

    Returns:
        List of OpeningRecommendation objects
    """
    engine = RecommendationEngine(position_graph, opening_tree, eco_parser)
    return engine.recommend_openings(side, rating_range, style)
