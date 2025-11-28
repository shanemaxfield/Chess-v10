"""
Transposition detection system for chess openings.
Identifies different move orders that lead to the same position.
"""

import chess
from typing import List, Dict, Set, Optional, Tuple
from .models import TranspositionRoute, TranspositionType


class TranspositionDetector:
    """
    Detects and analyzes transpositions in chess openings.
    Identifies different move sequences that reach the same position.
    """

    def __init__(self):
        """Initialize the transposition detector."""
        # Maps normalized FEN to list of move sequences that reach it
        self._position_routes: Dict[str, List[List[str]]] = {}
        self._build_transposition_map()

    def _normalize_fen(self, fen: str) -> str:
        """Normalize FEN for consistent lookup."""
        parts = fen.split()
        if len(parts) >= 4:
            return ' '.join(parts[:4])
        return fen

    def _build_transposition_map(self):
        """Build a map of positions to the routes that reach them."""

        # Italian Game transpositions
        italian_routes = [
            ["e4", "e5", "Nf3", "Nc6", "Bc4"],  # Standard order
            ["e4", "e5", "Bc4", "Nc6", "Nf3"],  # Bishop first
            ["e4", "e5", "Nf3", "Nc6", "Bc4"],  # Most common
        ]
        self._add_transposition_group(italian_routes, "Italian Game", "C50")

        # Giuoco Piano transpositions
        giuoco_routes = [
            ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
            ["e4", "e5", "Bc4", "Nc6", "Nf3", "Bc5"],
            ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
        ]
        self._add_transposition_group(giuoco_routes, "Giuoco Piano", "C53")

        # Four Knights transpositions
        four_knights_routes = [
            ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6"],
            ["e4", "e5", "Nf3", "Nf6", "Nc3", "Nc6"],
            ["e4", "e5", "Nc3", "Nc6", "Nf3", "Nf6"],
            ["e4", "e5", "Nc3", "Nf6", "Nf3", "Nc6"],
        ]
        self._add_transposition_group(four_knights_routes, "Four Knights Game", "C47")

        # King's Indian Attack / French Defense transposition
        kid_attack_routes = [
            ["e4", "e6", "d3", "d5", "Nd2", "Nf6", "Ngf3"],  # KIA
            ["Nf3", "d5", "g3", "Nf6", "Bg2", "e6", "O-O"],  # Réti to KIA structure
        ]
        self._add_transposition_group(kid_attack_routes, "King's Indian Attack", "A07")

        # Caro-Kann / French structure transpositions
        caro_french_routes = [
            ["e4", "c6", "d4", "d5", "e5"],  # Caro-Kann Advance
            ["e4", "e6", "d4", "d5", "e5"],  # French Advance
        ]
        # Note: These reach different positions but similar structures

        # English Opening transpositions
        english_routes = [
            ["c4", "e5", "Nc3", "Nf6"],
            ["Nf3", "Nf6", "c4", "e5", "Nc3"],
            ["c4", "Nf6", "Nc3", "e5"],
        ]
        self._add_transposition_group(english_routes, "English Opening, Reversed Sicilian", "A20")

        # Catalan transpositions
        catalan_routes = [
            ["d4", "Nf6", "c4", "e6", "g3", "d5", "Bg2"],
            ["Nf3", "Nf6", "g3", "d5", "Bg2", "e6", "c4", "Be7", "O-O", "O-O", "d4"],
            ["d4", "d5", "c4", "e6", "Nf3", "Nf6", "g3", "Be7", "Bg2"],
        ]
        self._add_transposition_group(catalan_routes, "Catalan Opening", "E00")

        # Queen's Gambit Declined transpositions
        qgd_routes = [
            ["d4", "d5", "c4", "e6", "Nc3", "Nf6"],
            ["d4", "Nf6", "c4", "e6", "Nc3", "d5"],
            ["c4", "e6", "Nc3", "d5", "d4", "Nf6"],
        ]
        self._add_transposition_group(qgd_routes, "Queen's Gambit Declined", "D30")

        # Slav Defense transpositions
        slav_routes = [
            ["d4", "d5", "c4", "c6"],
            ["d4", "d5", "c4", "c6", "Nf3", "Nf6"],
            ["c4", "c6", "d4", "d5"],
        ]
        self._add_transposition_group(slav_routes, "Slav Defense", "D10")

        # King's Indian Defense setup transpositions
        kid_routes = [
            ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"],
            ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6"],
            ["c4", "Nf6", "Nc3", "g6", "d4", "Bg7"],
        ]
        self._add_transposition_group(kid_routes, "King's Indian Defense", "E60")

    def _add_transposition_group(self, routes: List[List[str]], opening_name: str, eco_code: str):
        """Add a group of transposing move sequences."""
        # Get the position FEN from the first route
        board = chess.Board()
        for move_str in routes[0]:
            try:
                move = board.parse_san(move_str)
                board.push(move)
            except:
                return

        fen = self._normalize_fen(board.fen())

        # Verify all routes lead to the same position
        verified_routes = []
        for route in routes:
            test_board = chess.Board()
            valid = True
            for move_str in route:
                try:
                    move = test_board.parse_san(move_str)
                    test_board.push(move)
                except:
                    valid = False
                    break

            if valid and self._normalize_fen(test_board.fen()) == fen:
                verified_routes.append(route)

        if verified_routes:
            self._position_routes[fen] = verified_routes

    def find_all_routes(self, target_fen: str) -> List[TranspositionRoute]:
        """
        Find all known move sequences that lead to this position.

        Args:
            target_fen: The target position FEN

        Returns:
            List of TranspositionRoute objects
        """
        normalized = self._normalize_fen(target_fen)
        routes = self._position_routes.get(normalized, [])

        if not routes:
            # Try to find by generating the position
            return []

        result = []
        for route in routes:
            # Determine frequency (first route is typically most common)
            frequency = 1.0 / len(routes) if routes else 0.0
            if route == routes[0]:
                frequency = 0.5  # Primary route gets higher frequency

            trans_type = self._classify_transposition(route, routes[0] if routes else [])

            result.append(TranspositionRoute(
                moves=route,
                opening_name="",  # Will be filled by OpeningTracker
                eco_code="",      # Will be filled by OpeningTracker
                frequency=frequency,
                transposition_type=trans_type
            ))

        return result

    def _classify_transposition(self, route: List[str], primary_route: List[str]) -> TranspositionType:
        """Classify the type of transposition."""
        if len(route) <= 3:
            return TranspositionType.EARLY

        if len(route) <= 6:
            return TranspositionType.SAME_OPENING

        # Check if it's a cross-opening transposition
        # This is a simplified check - could be enhanced with opening classification
        if route[:2] != primary_route[:2]:
            return TranspositionType.CROSS_OPENING

        return TranspositionType.DELAYED

    def identify_transposition_type(self, routes: List[TranspositionRoute]) -> TranspositionType:
        """
        Identify the type of transposition from a list of routes.

        Args:
            routes: List of transposition routes

        Returns:
            The most significant transposition type
        """
        if not routes:
            return TranspositionType.SAME_OPENING

        # Return the most complex type found
        types = [route.transposition_type for route in routes]

        if TranspositionType.CROSS_OPENING in types:
            return TranspositionType.CROSS_OPENING
        if TranspositionType.DELAYED in types:
            return TranspositionType.DELAYED
        if TranspositionType.EARLY in types:
            return TranspositionType.EARLY

        return TranspositionType.SAME_OPENING

    def check_transposition(self, fen1: str, fen2: str) -> bool:
        """
        Check if two FENs represent the same position (transposition).

        Args:
            fen1: First FEN string
            fen2: Second FEN string

        Returns:
            True if positions are identical (transposition)
        """
        return self._normalize_fen(fen1) == self._normalize_fen(fen2)

    def find_transposition_from_moves(self, moves1: List[str], moves2: List[str]) -> bool:
        """
        Check if two move sequences lead to the same position.

        Args:
            moves1: First move sequence
            moves2: Second move sequence

        Returns:
            True if both sequences reach the same position
        """
        board1 = chess.Board()
        board2 = chess.Board()

        try:
            for move_str in moves1:
                move = board1.parse_san(move_str)
                board1.push(move)

            for move_str in moves2:
                move = board2.parse_san(move_str)
                board2.push(move)

            return self.check_transposition(board1.fen(), board2.fen())
        except:
            return False

    def get_transposition_note(self, routes: List[TranspositionRoute]) -> Optional[str]:
        """
        Generate a human-readable note about the transposition.

        Args:
            routes: List of transposition routes

        Returns:
            A descriptive note about the transposition, or None
        """
        if len(routes) <= 1:
            return None

        trans_type = self.identify_transposition_type(routes)

        if trans_type == TranspositionType.EARLY:
            return "This position can be reached via different move orders in the opening."
        elif trans_type == TranspositionType.DELAYED:
            return "Multiple move orders lead to this position, showing flexibility in move order."
        elif trans_type == TranspositionType.CROSS_OPENING:
            return "This position can arise from different opening systems."
        else:
            return "Standard transposition within the same opening family."

    def has_known_transpositions(self, fen: str) -> bool:
        """Check if a position has known transpositions."""
        normalized = self._normalize_fen(fen)
        routes = self._position_routes.get(normalized, [])
        return len(routes) > 1
