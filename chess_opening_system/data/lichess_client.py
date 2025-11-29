"""
Lichess API Client
Fetches opening statistics and game data from Lichess
"""

import requests
import time
from typing import List, Optional, Dict, Tuple
from dataclasses import dataclass
import chess
from urllib.parse import urlencode


@dataclass
class LichessOpeningStats:
    """Opening statistics from Lichess."""
    white_wins: int
    black_wins: int
    draws: int
    total_games: int
    moves: List[Dict]  # List of top moves with statistics

    @property
    def white_win_rate(self) -> float:
        return (self.white_wins / self.total_games * 100) if self.total_games > 0 else 0.0

    @property
    def draw_rate(self) -> float:
        return (self.draws / self.total_games * 100) if self.total_games > 0 else 0.0

    @property
    def black_win_rate(self) -> float:
        return (self.black_wins / self.total_games * 100) if self.total_games > 0 else 0.0


class LichessClient:
    """
    Client for Lichess API.
    Handles rate limiting and caching.
    """

    BASE_URL = "https://explorer.lichess.ovh"
    RATE_LIMIT_DELAY = 0.1  # 100ms between requests

    def __init__(self, cache_ttl: int = 3600):
        """
        Initialize Lichess client.

        Args:
            cache_ttl: Cache time-to-live in seconds (default: 1 hour)
        """
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'User-Agent': 'Chess Teaching Tool/1.0'
        })
        self._cache: Dict[str, Tuple[float, dict]] = {}
        self._cache_ttl = cache_ttl
        self._last_request_time = 0.0

    def _rate_limit(self):
        """Enforce rate limiting."""
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < self.RATE_LIMIT_DELAY:
            time.sleep(self.RATE_LIMIT_DELAY - elapsed)
        self._last_request_time = time.time()

    def _get_cached(self, key: str) -> Optional[dict]:
        """Get cached response if not expired."""
        if key in self._cache:
            timestamp, data = self._cache[key]
            if time.time() - timestamp < self._cache_ttl:
                return data
            else:
                del self._cache[key]
        return None

    def _set_cache(self, key: str, data: dict):
        """Cache response."""
        self._cache[key] = (time.time(), data)

    def get_opening_stats(self, fen: str, rating_range: Optional[Tuple[int, int]] = None,
                         speeds: Optional[List[str]] = None,
                         variant: str = "standard") -> Optional[LichessOpeningStats]:
        """
        Get opening statistics for a position.

        Args:
            fen: Position FEN
            rating_range: Optional (min_rating, max_rating) tuple
            speeds: Optional list of time controls ["blitz", "rapid", "classical"]
            variant: Chess variant (default: "standard")

        Returns:
            LichessOpeningStats or None if request fails
        """
        # Build request parameters
        params = {
            'fen': fen,
            'variant': variant
        }

        if rating_range:
            params['ratings'] = f"{rating_range[0]},{rating_range[1]}"

        if speeds:
            params['speeds'] = ','.join(speeds)

        # Check cache
        cache_key = f"opening_{urlencode(params)}"
        cached = self._get_cached(cache_key)
        if cached:
            return self._parse_opening_stats(cached)

        # Make request
        self._rate_limit()

        try:
            url = f"{self.BASE_URL}/lichess"
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            self._set_cache(cache_key, data)

            return self._parse_opening_stats(data)

        except requests.RequestException as e:
            print(f"Error fetching Lichess stats: {e}")
            return None

    def _parse_opening_stats(self, data: dict) -> LichessOpeningStats:
        """Parse Lichess API response into LichessOpeningStats."""
        return LichessOpeningStats(
            white_wins=data.get('white', 0),
            black_wins=data.get('black', 0),
            draws=data.get('draws', 0),
            total_games=data.get('white', 0) + data.get('black', 0) + data.get('draws', 0),
            moves=data.get('moves', [])
        )

    def get_master_stats(self, fen: str, since: int = 1952) -> Optional[LichessOpeningStats]:
        """
        Get master game statistics.

        Args:
            fen: Position FEN
            since: Earliest year to include (default: 1952)

        Returns:
            LichessOpeningStats or None
        """
        params = {
            'fen': fen,
            'since': since
        }

        # Check cache
        cache_key = f"master_{urlencode(params)}"
        cached = self._get_cached(cache_key)
        if cached:
            return self._parse_opening_stats(cached)

        # Make request
        self._rate_limit()

        try:
            url = f"{self.BASE_URL}/master"
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            self._set_cache(cache_key, data)

            return self._parse_opening_stats(data)

        except requests.RequestException as e:
            print(f"Error fetching master stats: {e}")
            return None

    def get_popular_moves(self, fen: str, rating_range: Optional[Tuple[int, int]] = None,
                         top_n: int = 5) -> List[Dict]:
        """
        Get most popular moves from a position.

        Args:
            fen: Position FEN
            rating_range: Optional rating range
            top_n: Number of top moves to return

        Returns:
            List of move dictionaries with statistics
        """
        stats = self.get_opening_stats(fen, rating_range)
        if not stats or not stats.moves:
            return []

        # Sort by number of games
        sorted_moves = sorted(
            stats.moves,
            key=lambda m: m.get('white', 0) + m.get('black', 0) + m.get('draws', 0),
            reverse=True
        )

        return sorted_moves[:top_n]

    def get_stats_by_rating_ranges(self, fen: str,
                                   rating_ranges: List[Tuple[int, int]]) -> Dict[str, LichessOpeningStats]:
        """
        Get statistics for multiple rating ranges.

        Args:
            fen: Position FEN
            rating_ranges: List of (min, max) rating tuples

        Returns:
            Dictionary mapping "min-max" to stats
        """
        results = {}

        for min_rating, max_rating in rating_ranges:
            key = f"{min_rating}-{max_rating}"
            stats = self.get_opening_stats(fen, rating_range=(min_rating, max_rating))
            if stats:
                results[key] = stats

        return results

    def get_opening_name(self, fen: str) -> Optional[str]:
        """
        Get opening name for a position from Lichess.

        Args:
            fen: Position FEN

        Returns:
            Opening name or None
        """
        stats_data = self.get_opening_stats(fen)
        if stats_data:
            # Lichess API returns opening name in the 'opening' field
            # This is a simplified version - actual implementation may vary
            return None  # Lichess explorer doesn't return opening names directly
        return None

    def fetch_games(self, fen: str, max_games: int = 10,
                   rating_range: Optional[Tuple[int, int]] = None) -> List[str]:
        """
        Fetch sample games from a position (not directly supported by explorer API).

        Args:
            fen: Position FEN
            max_games: Maximum number of games
            rating_range: Optional rating range

        Returns:
            List of game PGNs (placeholder - would need games API)
        """
        # Note: This would require the games API, not the explorer API
        # Placeholder for future implementation
        return []

    def clear_cache(self):
        """Clear the cache."""
        self._cache.clear()

    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        return {
            'entries': len(self._cache),
            'size_bytes': sum(
                len(str(data)) for _, data in self._cache.values()
            )
        }


# Convenience functions

def get_popular_continuations(fen: str, rating_range: Tuple[int, int],
                              num_moves: int = 5) -> List[Dict]:
    """
    Convenience function to get popular continuations.

    Args:
        fen: Position FEN
        rating_range: (min_rating, max_rating)
        num_moves: Number of moves to return

    Returns:
        List of move dictionaries
    """
    client = LichessClient()
    return client.get_popular_moves(fen, rating_range, num_moves)


def get_opening_statistics(fen: str, rating_range: Tuple[int, int]) -> Optional[LichessOpeningStats]:
    """
    Convenience function to get opening statistics.

    Args:
        fen: Position FEN
        rating_range: (min_rating, max_rating)

    Returns:
        LichessOpeningStats or None
    """
    client = LichessClient()
    return client.get_opening_stats(fen, rating_range)
