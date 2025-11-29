"""
Statistical Analysis Module
Aggregates and analyzes opening statistics from multiple sources
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import chess

from .lichess_client import LichessClient, LichessOpeningStats
from ..core.position_graph import PositionGraph, PositionStatistics


@dataclass
class AggregatedStats:
    """Aggregated statistics from multiple sources."""
    position_fen: str
    rating_range: Tuple[int, int]
    total_games: int = 0
    white_wins: int = 0
    black_wins: int = 0
    draws: int = 0
    sources: List[str] = None

    def __post_init__(self):
        if self.sources is None:
            self.sources = []

    @property
    def white_win_rate(self) -> float:
        return (self.white_wins / self.total_games * 100) if self.total_games > 0 else 0.0

    @property
    def draw_rate(self) -> float:
        return (self.draws / self.total_games * 100) if self.total_games > 0 else 0.0

    @property
    def black_win_rate(self) -> float:
        return (self.black_wins / self.total_games * 100) if self.total_games > 0 else 0.0


class StatisticsAggregator:
    """
    Aggregates statistics from multiple sources:
    - Lichess API
    - Local position graph
    - Master games database
    """

    def __init__(self, position_graph: Optional[PositionGraph] = None):
        """
        Initialize statistics aggregator.

        Args:
            position_graph: Optional position graph for local statistics
        """
        self.lichess_client = LichessClient()
        self.position_graph = position_graph

    def get_comprehensive_stats(self, fen: str, rating_range: Tuple[int, int],
                                include_master: bool = False) -> AggregatedStats:
        """
        Get comprehensive statistics from all available sources.

        Args:
            fen: Position FEN
            rating_range: (min_rating, max_rating)
            include_master: Include master game statistics

        Returns:
            AggregatedStats combining all sources
        """
        stats = AggregatedStats(
            position_fen=fen,
            rating_range=rating_range
        )

        # Get Lichess stats
        lichess_stats = self.lichess_client.get_opening_stats(fen, rating_range)
        if lichess_stats:
            stats.total_games += lichess_stats.total_games
            stats.white_wins += lichess_stats.white_wins
            stats.black_wins += lichess_stats.black_wins
            stats.draws += lichess_stats.draws
            stats.sources.append('lichess')

        # Get master stats if requested
        if include_master:
            master_stats = self.lichess_client.get_master_stats(fen)
            if master_stats:
                stats.total_games += master_stats.total_games
                stats.white_wins += master_stats.white_wins
                stats.black_wins += master_stats.black_wins
                stats.draws += master_stats.draws
                stats.sources.append('master')

        # Get local graph stats
        if self.position_graph:
            position = self.position_graph.get_position(fen)
            if position:
                local_stats = position.get_statistics_for_range(rating_range[0], rating_range[1])
                if local_stats:
                    stats.total_games += local_stats.total_games
                    stats.white_wins += local_stats.white_wins
                    stats.black_wins += local_stats.black_wins
                    stats.draws += local_stats.draws
                    stats.sources.append('local')

        return stats

    def get_rating_based_recommendations(self, fen: str, rating_range: Tuple[int, int],
                                        num_moves: int = 5) -> List[Dict]:
        """
        Get move recommendations based on rating range statistics.

        Args:
            fen: Position FEN
            rating_range: (min_rating, max_rating)
            num_moves: Number of moves to recommend

        Returns:
            List of move recommendations with statistics
        """
        popular_moves = self.lichess_client.get_popular_moves(fen, rating_range, num_moves)

        recommendations = []
        for move_data in popular_moves:
            total = move_data.get('white', 0) + move_data.get('black', 0) + move_data.get('draws', 0)
            if total > 0:
                recommendations.append({
                    'move': move_data.get('san', ''),
                    'uci': move_data.get('uci', ''),
                    'games': total,
                    'white_wins': move_data.get('white', 0),
                    'black_wins': move_data.get('black', 0),
                    'draws': move_data.get('draws', 0),
                    'win_rate': (move_data.get('white', 0) / total * 100) if total > 0 else 0,
                    'popularity': move_data.get('popularity', 0)
                })

        return recommendations

    def compare_rating_ranges(self, fen: str,
                             rating_ranges: List[Tuple[int, int]]) -> Dict[str, AggregatedStats]:
        """
        Compare statistics across multiple rating ranges.

        Args:
            fen: Position FEN
            rating_ranges: List of (min, max) rating tuples

        Returns:
            Dictionary mapping "min-max" to stats
        """
        results = {}

        for min_rating, max_rating in rating_ranges:
            key = f"{min_rating}-{max_rating}"
            stats = self.get_comprehensive_stats(fen, (min_rating, max_rating))
            results[key] = stats

        return results

    def get_move_popularity_by_rating(self, fen: str,
                                     rating_ranges: List[Tuple[int, int]]) -> Dict[str, List[Dict]]:
        """
        Get move popularity breakdown by rating ranges.

        Args:
            fen: Position FEN
            rating_ranges: List of rating ranges

        Returns:
            Dictionary mapping "min-max" to move list
        """
        results = {}

        for min_rating, max_rating in rating_ranges:
            key = f"{min_rating}-{max_rating}"
            moves = self.get_rating_based_recommendations(fen, (min_rating, max_rating))
            results[key] = moves

        return results

    def analyze_position_strength(self, fen: str) -> Dict[str, any]:
        """
        Analyze position strength across different rating levels.

        Args:
            fen: Position FEN

        Returns:
            Dictionary with analysis results
        """
        rating_ranges = [
            (1000, 1400),
            (1400, 1800),
            (1800, 2200),
            (2200, 2600)
        ]

        range_stats = self.compare_rating_ranges(fen, rating_ranges)

        analysis = {
            'fen': fen,
            'by_rating': {}
        }

        for range_key, stats in range_stats.items():
            if stats.total_games > 0:
                analysis['by_rating'][range_key] = {
                    'games': stats.total_games,
                    'white_score': stats.white_win_rate + (stats.draw_rate / 2),
                    'white_wins': stats.white_win_rate,
                    'draws': stats.draw_rate,
                    'black_wins': stats.black_win_rate
                }

        # Overall assessment
        if analysis['by_rating']:
            avg_white_score = sum(
                data['white_score'] for data in analysis['by_rating'].values()
            ) / len(analysis['by_rating'])

            if avg_white_score > 55:
                analysis['assessment'] = 'Favorable for White'
            elif avg_white_score < 45:
                analysis['assessment'] = 'Favorable for Black'
            else:
                analysis['assessment'] = 'Balanced'
        else:
            analysis['assessment'] = 'Insufficient data'

        return analysis


# Convenience functions

def get_opening_statistics(fen: str, rating_range: Tuple[int, int],
                          position_graph: Optional[PositionGraph] = None) -> AggregatedStats:
    """
    Get comprehensive opening statistics.

    Args:
        fen: Position FEN
        rating_range: (min_rating, max_rating)
        position_graph: Optional position graph

    Returns:
        AggregatedStats
    """
    aggregator = StatisticsAggregator(position_graph)
    return aggregator.get_comprehensive_stats(fen, rating_range)


def get_popular_continuations(fen: str, rating_range: Tuple[int, int],
                              num_moves: int = 5) -> List[Dict]:
    """
    Get popular continuations for a position.

    Args:
        fen: Position FEN
        rating_range: (min_rating, max_rating)
        num_moves: Number of moves

    Returns:
        List of move recommendations
    """
    aggregator = StatisticsAggregator()
    return aggregator.get_rating_based_recommendations(fen, rating_range, num_moves)
