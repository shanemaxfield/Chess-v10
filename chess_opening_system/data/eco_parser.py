"""
ECO (Encyclopedia of Chess Openings) Parser
Parses ECO codes and opening names from CSV and PGN files
"""

import csv
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import re
import chess
import chess.pgn
from io import StringIO


@dataclass
class ECOOpening:
    """Represents an ECO opening classification."""
    code: str  # e.g., "C50"
    name: str  # e.g., "Italian Game"
    variation: str = ""  # e.g., "Giuoco Piano"
    moves: List[str] = None  # SAN moves
    fen: str = ""

    def __post_init__(self):
        if self.moves is None:
            self.moves = []


class ECOParser:
    """
    Parser for ECO opening classifications.
    Supports CSV and PGN formats.
    """

    def __init__(self):
        self.openings: Dict[str, ECOOpening] = {}  # ECO code -> Opening
        self.name_index: Dict[str, List[str]] = {}  # Opening name -> List of ECO codes

    def load_from_csv(self, filepath: str):
        """
        Load ECO codes from CSV file.

        Expected format:
        code,name
        A01,Larsen's Opening
        A02,Bird's Opening

        Args:
            filepath: Path to CSV file
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                code = row.get('code', '').strip()
                name = row.get('name', '').strip()

                if code and name:
                    # Parse variation if included in name (e.g., "Italian Game, Giuoco Piano")
                    variation = ""
                    if ',' in name:
                        parts = name.split(',', 1)
                        name = parts[0].strip()
                        variation = parts[1].strip()

                    opening = ECOOpening(
                        code=code,
                        name=name,
                        variation=variation
                    )

                    self.openings[code] = opening

                    # Index by name
                    name_key = name.lower()
                    if name_key not in self.name_index:
                        self.name_index[name_key] = []
                    self.name_index[name_key].append(code)

        print(f"Loaded {len(self.openings)} ECO codes from {filepath}")

    def load_from_pgn(self, filepath: str):
        """
        Load ECO codes from PGN file with opening annotations.

        Expected format: Standard PGN with ECO and Opening tags

        Args:
            filepath: Path to PGN file
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            while True:
                game = chess.pgn.read_game(f)
                if game is None:
                    break

                eco_code = game.headers.get('ECO', '')
                opening_name = game.headers.get('Opening', '')
                variation = game.headers.get('Variation', '')

                if eco_code:
                    # Extract moves from the game
                    moves = []
                    board = game.board()
                    for move in game.mainline_moves():
                        moves.append(board.san(move))
                        board.push(move)

                    opening = ECOOpening(
                        code=eco_code,
                        name=opening_name,
                        variation=variation,
                        moves=moves,
                        fen=board.fen()
                    )

                    self.openings[eco_code] = opening

                    # Index by name
                    if opening_name:
                        name_key = opening_name.lower()
                        if name_key not in self.name_index:
                            self.name_index[name_key] = []
                        if eco_code not in self.name_index[name_key]:
                            self.name_index[name_key].append(eco_code)

        print(f"Loaded {len(self.openings)} openings from PGN")

    def get_by_code(self, eco_code: str) -> Optional[ECOOpening]:
        """Get opening by ECO code."""
        return self.openings.get(eco_code)

    def get_by_name(self, opening_name: str) -> List[ECOOpening]:
        """
        Get openings by name (case-insensitive, partial match).

        Args:
            opening_name: Opening name to search for

        Returns:
            List of matching openings
        """
        name_lower = opening_name.lower()
        results = []

        # Exact match
        if name_lower in self.name_index:
            for code in self.name_index[name_lower]:
                opening = self.openings[code]
                if opening not in results:
                    results.append(opening)

        # Partial match
        for indexed_name, eco_codes in self.name_index.items():
            if name_lower in indexed_name or indexed_name in name_lower:
                for code in eco_codes:
                    opening = self.openings[code]
                    if opening not in results:
                        results.append(opening)

        return results

    def search(self, query: str) -> List[ECOOpening]:
        """
        Search for openings by code, name, or variation.

        Args:
            query: Search query

        Returns:
            List of matching openings
        """
        query_lower = query.lower()
        results = []

        for opening in self.openings.values():
            if (query_lower in opening.code.lower() or
                query_lower in opening.name.lower() or
                query_lower in opening.variation.lower()):
                results.append(opening)

        return results

    def get_opening_group(self, eco_prefix: str) -> List[ECOOpening]:
        """
        Get all openings in an ECO group (e.g., "C5" for C50-C59).

        Args:
            eco_prefix: ECO code prefix

        Returns:
            List of openings matching the prefix
        """
        return [
            opening for code, opening in self.openings.items()
            if code.startswith(eco_prefix)
        ]

    def classify_position(self, moves: List[str]) -> Optional[ECOOpening]:
        """
        Classify a position by its move sequence.

        Args:
            moves: List of moves in SAN format

        Returns:
            Best matching ECO opening or None
        """
        # Try to match progressively longer sequences
        best_match = None
        max_match_length = 0

        for opening in self.openings.values():
            if not opening.moves:
                continue

            # Check how many moves match
            match_length = 0
            for i, move in enumerate(opening.moves):
                if i >= len(moves):
                    break
                if moves[i] == move:
                    match_length += 1
                else:
                    break

            if match_length > max_match_length and match_length == len(opening.moves):
                max_match_length = match_length
                best_match = opening

        return best_match

    def get_statistics(self) -> dict:
        """Get parser statistics."""
        eco_groups = {}
        for code in self.openings.keys():
            prefix = code[0]  # A, B, C, D, or E
            eco_groups[prefix] = eco_groups.get(prefix, 0) + 1

        return {
            'total_openings': len(self.openings),
            'total_names': len(self.name_index),
            'eco_groups': eco_groups
        }

    def export_to_json(self, filepath: str):
        """Export openings to JSON file."""
        import json

        data = {
            code: {
                'code': opening.code,
                'name': opening.name,
                'variation': opening.variation,
                'moves': opening.moves,
                'fen': opening.fen
            }
            for code, opening in self.openings.items()
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        print(f"Exported {len(data)} openings to {filepath}")


# Convenience functions

def load_eco_codes(csv_path: str) -> ECOParser:
    """
    Load ECO codes from CSV file.

    Args:
        csv_path: Path to ECO CSV file

    Returns:
        ECOParser instance
    """
    parser = ECOParser()
    parser.load_from_csv(csv_path)
    return parser


def classify_opening(moves: List[str], eco_parser: ECOParser) -> Optional[ECOOpening]:
    """
    Classify an opening by move sequence.

    Args:
        moves: List of SAN moves
        eco_parser: ECOParser instance

    Returns:
        ECOOpening or None
    """
    return eco_parser.classify_position(moves)


def search_opening(query: str, eco_parser: ECOParser) -> List[ECOOpening]:
    """
    Search for openings.

    Args:
        query: Search query
        eco_parser: ECOParser instance

    Returns:
        List of matching openings
    """
    return eco_parser.search(query)
