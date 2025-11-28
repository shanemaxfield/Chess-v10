"""
Main OpeningTracker class - the primary interface for opening identification.
"""

import chess
from typing import List, Optional, Dict
from functools import lru_cache
import time

from .models import (
    OpeningInfo, TranspositionRoute, BookStatus, TheoryStatus,
    Continuation, Plan, MoveType, TranspositionType
)
from .opening_database import OpeningDatabase
from .transposition_detector import TranspositionDetector


class OpeningTracker:
    """
    Main class for chess opening identification and tracking.

    Features:
    - Identify openings from FEN positions or move sequences
    - Detect transpositions
    - Provide rich opening metadata
    - Track theory depth and book moves
    """

    def __init__(self):
        """Initialize the opening tracker."""
        self.database = OpeningDatabase()
        self.transposition_detector = TranspositionDetector()
        self._cache: Dict[str, OpeningInfo] = {}
        self._cache_hits = 0
        self._cache_misses = 0

    def identify_position(self, fen: str) -> OpeningInfo:
        """
        Identify the opening from a FEN position.

        Args:
            fen: Chess position in FEN notation

        Returns:
            OpeningInfo object with complete opening information
        """
        # Check cache
        normalized_fen = self._normalize_fen(fen)
        if normalized_fen in self._cache:
            self._cache_hits += 1
            return self._cache[normalized_fen]

        self._cache_misses += 1

        # Look up position in database
        position_data = self.database.get_position(fen)

        if position_data:
            opening_info = self._build_opening_info_from_db(position_data)
        else:
            # Position not in database - try to trace back to known theory
            opening_info = self._analyze_unknown_position(fen)

        # Cache the result
        self._cache[normalized_fen] = opening_info
        return opening_info

    def get_opening_from_moves(self, moves: List[str]) -> OpeningInfo:
        """
        Identify the opening from a sequence of moves.

        Args:
            moves: List of moves in SAN notation (e.g., ["e4", "e5", "Nf3"])

        Returns:
            OpeningInfo object with complete opening information
        """
        # Generate the position from moves
        board = chess.Board()
        for move_str in moves:
            try:
                move = board.parse_san(move_str)
                board.push(move)
            except Exception as e:
                # Invalid move sequence
                return self._create_unknown_opening_info(board.fen(), moves)

        # Get opening info for final position
        opening_info = self.identify_position(board.fen())

        # Update with the actual moves played
        if opening_info:
            opening_info.moves_played = moves

        return opening_info

    def find_transpositions(self, fen: str) -> List[TranspositionRoute]:
        """
        Find all known transpositions (alternative move orders) for a position.

        Args:
            fen: Chess position in FEN notation

        Returns:
            List of TranspositionRoute objects
        """
        routes = self.transposition_detector.find_all_routes(fen)

        # Enrich routes with opening information
        for route in routes:
            route_info = self.get_opening_from_moves(route.moves)
            route.opening_name = route_info.opening_name
            route.eco_code = route_info.eco_code

        return routes

    def get_theory_depth(self, fen: str) -> TheoryStatus:
        """
        Get information about how deep a position is in opening theory.

        Args:
            fen: Chess position in FEN notation

        Returns:
            TheoryStatus object with theory depth information
        """
        position_data = self.database.get_position(fen)

        if position_data:
            # Position is in book
            return TheoryStatus(
                in_theory=True,
                theory_depth=len(position_data.get('moves', [])),
                moves_since_book=0,
                last_book_position_fen=fen,
                deviation_move=None
            )
        else:
            # Position not in book - trace back to find last known position
            return self._find_last_book_position(fen)

    def check_if_book_move(self, fen: str, move: str) -> BookStatus:
        """
        Check if a move from a position is in opening theory.

        Args:
            fen: Current position FEN
            move: Move in SAN notation

        Returns:
            BookStatus object indicating if move is in book
        """
        position_data = self.database.get_position(fen)

        if not position_data:
            return BookStatus(
                is_book=False,
                frequency=0.0,
                move_type=MoveType.NOVELTY,
                explanation="Position is outside opening theory"
            )

        # Check continuations
        continuations = position_data.get('continuations', [])
        for cont in continuations:
            if cont.move == move:
                # Classify the move type
                move_type = self._classify_move_frequency(cont.frequency)

                return BookStatus(
                    is_book=True,
                    frequency=cont.frequency,
                    move_type=move_type,
                    explanation=f"Played in {cont.frequency*100:.1f}% of games"
                )

        # Move is legal but not in our database for this position
        return BookStatus(
            is_book=False,
            frequency=0.0,
            move_type=MoveType.RARE,
            explanation="Rare or unusual move in this position"
        )

    def get_typical_plans(self, opening_name: str) -> List[Plan]:
        """
        Get typical plans for an opening.

        Args:
            opening_name: Name of the opening

        Returns:
            List of Plan objects
        """
        # Search database for opening
        results = self.database.search_by_name(opening_name)

        plans = []
        for result in results:
            typical_plans = result.get('typical_plans', [])
            for i, plan_desc in enumerate(typical_plans):
                # Determine which side the plan is for
                side = "both"
                if "White" in plan_desc or "white" in plan_desc:
                    side = "white"
                elif "Black" in plan_desc or "black" in plan_desc:
                    side = "black"

                plans.append(Plan(
                    description=plan_desc,
                    side=side,
                    priority=i + 1
                ))

        return plans

    def explain_position_transition(self, fen_before: str, move: str, fen_after: str) -> str:
        """
        Explain how a move changes the opening classification.

        Args:
            fen_before: Position before the move
            move: The move played
            fen_after: Position after the move

        Returns:
            Human-readable explanation
        """
        opening_before = self.identify_position(fen_before)
        opening_after = self.identify_position(fen_after)

        if opening_before.eco_code == opening_after.eco_code:
            return f"Continuing in the {opening_after.full_variation_name}"

        return (f"Transition from {opening_before.full_variation_name} ({opening_before.eco_code}) "
                f"to {opening_after.full_variation_name} ({opening_after.eco_code}) with {move}")

    def get_opening_family(self, fen: str) -> str:
        """
        Return the broad opening category.

        Args:
            fen: Chess position in FEN notation

        Returns:
            Opening family: Open, Semi-Open, Closed, Indian, Flank, etc.
        """
        position_data = self.database.get_position(fen)
        if position_data:
            return position_data.get('opening_family', 'Unknown')

        # Try to determine from ECO code
        opening_info = self.identify_position(fen)
        eco_code = opening_info.eco_code

        if eco_code.startswith('A'):
            return 'Flank'
        elif eco_code.startswith('B'):
            return 'Semi-Open'
        elif eco_code.startswith('C'):
            return 'Open'
        elif eco_code.startswith('D'):
            return 'Closed'
        elif eco_code.startswith('E'):
            return 'Indian'

        return 'Unknown'

    def find_similar_structures(self, fen: str) -> List[str]:
        """
        Find openings with similar pawn structures.

        Args:
            fen: Chess position in FEN notation

        Returns:
            List of opening names with similar structures
        """
        position_data = self.database.get_position(fen)
        if not position_data:
            return []

        pawn_structure = position_data.get('pawn_structure', '')
        if not pawn_structure:
            return []

        # Search for openings with the same pawn structure
        similar = []
        for pos_fen, pos_data in self.database.get_all_positions().items():
            if pos_data.get('pawn_structure') == pawn_structure and pos_fen != self._normalize_fen(fen):
                similar.append(pos_data['full_name'])

        return similar

    def is_mainline(self, fen: str) -> bool:
        """
        Check if position is in the theoretical mainline.

        Args:
            fen: Chess position in FEN notation

        Returns:
            True if position is considered mainline
        """
        position_data = self.database.get_position(fen)
        if position_data:
            return position_data.get('is_mainline', False)
        return False

    def get_deviation_point(self, move_list: List[str]) -> Optional[int]:
        """
        Find where the game left known theory.

        Args:
            move_list: List of moves in SAN notation

        Returns:
            Move number where theory was left, or None if still in book
        """
        board = chess.Board()

        for i, move_str in enumerate(move_list):
            # Check if current position is in database
            position_data = self.database.get_position(board.fen())

            if not position_data:
                # This is where we left theory
                return i

            # Make the move
            try:
                move = board.parse_san(move_str)
                board.push(move)
            except:
                return i

        # Still in theory
        return None

    def classify_move_in_opening(self, fen: str, move: str) -> MoveType:
        """
        Classify a move within the opening context.

        Args:
            fen: Current position FEN
            move: Move in SAN notation

        Returns:
            MoveType classification
        """
        book_status = self.check_if_book_move(fen, move)
        return book_status.move_type or MoveType.NOVELTY

    def get_opening_description(self, opening_name: str) -> str:
        """
        Get a human-readable description of an opening.

        Args:
            opening_name: Name of the opening

        Returns:
            Natural language description
        """
        descriptions = {
            "Italian Game": "The Italian Game aims for quick development and pressure on f7. White develops the bishop to c4, targeting Black's weak square.",
            "Ruy Lopez": "The Ruy Lopez is one of the oldest and most classical openings. White pressures the e5 pawn and aims for long-term strategic advantage.",
            "Sicilian Defense": "The Sicilian Defense is Black's most ambitious response to 1.e4, fighting for the initiative and creating an asymmetric position with winning chances.",
            "French Defense": "The French Defense leads to a solid but somewhat cramped position for Black. The key challenge is developing the light-squared bishop.",
            "Caro-Kann Defense": "The Caro-Kann Defense is a solid, reliable defense to 1.e4. Unlike the French, Black can develop the light-squared bishop more easily.",
            "King's Indian Defense": "The King's Indian Defense is a hypermodern opening where Black allows White a strong center, then attacks it with pieces and pawns.",
            "Queen's Gambit": "The Queen's Gambit offers a pawn temporarily to gain central control and quick development. It's one of the oldest and most respected openings.",
            "Nimzo-Indian Defense": "The Nimzo-Indian Defense pins the knight and fights for central control. It's a flexible and strategically complex opening.",
            "English Opening": "The English Opening is a flexible, hypermodern approach that often transposes to other openings. White controls the center from the flanks.",
        }

        for key, desc in descriptions.items():
            if key.lower() in opening_name.lower():
                return desc

        return f"{opening_name} is a chess opening with various strategic and tactical possibilities."

    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache performance statistics."""
        return {
            'hits': self._cache_hits,
            'misses': self._cache_misses,
            'size': len(self._cache),
            'hit_rate': self._cache_hits / max(1, self._cache_hits + self._cache_misses)
        }

    # Private helper methods

    def _normalize_fen(self, fen: str) -> str:
        """Normalize FEN for consistent lookup."""
        parts = fen.split()
        if len(parts) >= 4:
            return ' '.join(parts[:4])
        return fen

    def _build_opening_info_from_db(self, position_data: dict) -> OpeningInfo:
        """Build OpeningInfo from database entry."""
        # Find transpositions
        transpositions = self.find_transpositions(position_data['fen'])

        # Determine primary route
        primary_route = position_data.get('moves', [])
        alternative_routes = [t.moves for t in transpositions if t.moves != primary_route]

        # Get transposition note
        trans_note = None
        if transpositions:
            trans_note = self.transposition_detector.get_transposition_note(transpositions)

        # Determine book status
        book_status = "in_book"
        theory_depth = len(primary_route)

        return OpeningInfo(
            current_position_fen=position_data['fen'],
            opening_name=position_data['name'],
            full_variation_name=position_data['full_name'],
            eco_code=position_data['eco'],
            moves_played=primary_route,
            book_status=book_status,
            theory_depth=theory_depth,
            primary_route=primary_route,
            alternative_routes=alternative_routes,
            transposition_note=trans_note,
            typical_plans=position_data.get('typical_plans', []),
            key_squares=position_data.get('key_squares', []),
            pawn_structure_type=position_data.get('pawn_structure'),
            common_continuations=position_data.get('continuations', []),
            difficulty_level=position_data.get('difficulty', 'intermediate'),
            style=position_data.get('style', 'balanced'),
            main_ideas=position_data.get('main_ideas', []),
            opening_family=position_data.get('opening_family', ''),
            is_mainline=position_data.get('is_mainline', False)
        )

    def _analyze_unknown_position(self, fen: str) -> OpeningInfo:
        """Analyze a position not in the database."""
        # Try to trace back to known theory
        theory_status = self._find_last_book_position(fen)

        return OpeningInfo(
            current_position_fen=fen,
            opening_name="Out of Book",
            full_variation_name="Position outside opening theory",
            eco_code="A00",
            moves_played=[],
            book_status="out_of_book",
            theory_depth=0,
            primary_route=[],
            alternative_routes=[],
            transposition_note="This position is outside known opening theory"
        )

    def _create_unknown_opening_info(self, fen: str, moves: List[str]) -> OpeningInfo:
        """Create OpeningInfo for unknown/invalid position."""
        return OpeningInfo(
            current_position_fen=fen,
            opening_name="Unknown",
            full_variation_name="Unknown Opening",
            eco_code="A00",
            moves_played=moves,
            book_status="out_of_book",
            theory_depth=0,
            primary_route=[],
            alternative_routes=[]
        )

    def _find_last_book_position(self, fen: str) -> TheoryStatus:
        """Find the last position that was in opening theory."""
        # This is a simplified implementation
        # In a full version, we'd trace back through the move history

        return TheoryStatus(
            in_theory=False,
            theory_depth=0,
            moves_since_book=0,
            last_book_position_fen=None,
            deviation_move=None
        )

    def _classify_move_frequency(self, frequency: float) -> MoveType:
        """Classify a move based on its frequency."""
        if frequency >= 0.4:
            return MoveType.MAIN_LINE
        elif frequency >= 0.15:
            return MoveType.SIDELINE
        elif frequency >= 0.03:
            return MoveType.RARE
        else:
            return MoveType.NOVELTY
