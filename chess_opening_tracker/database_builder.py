"""
Database builder script to populate opening database from various sources.
This script can fetch data from Lichess API and other chess databases.
"""

import json
import time
import requests
import chess
from typing import List, Dict, Optional, Tuple
from pathlib import Path


class DatabaseBuilder:
    """
    Build and populate the chess opening database from various sources.

    Data sources:
    - Lichess Opening Explorer API
    - ECO code definitions
    - Manual opening annotations
    """

    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize the database builder.

        Args:
            data_dir: Directory to save database files. Defaults to ./data
        """
        if data_dir is None:
            data_dir = Path(__file__).parent / "data"
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

        self.lichess_base_url = "https://explorer.lichess.ovh/lichess"
        self.rate_limit_delay = 0.5  # Seconds between API calls

    def build_eco_database(self) -> Dict[str, dict]:
        """
        Build a comprehensive ECO code database.

        Returns:
            Dictionary mapping ECO codes to opening information
        """
        print("Building ECO code database...")

        eco_db = {}

        # Major ECO codes with basic information
        eco_definitions = [
            # A00-A99: Flank openings
            ("A00", "Uncommon Opening", "", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -"),
            ("A04", "Réti Opening", "Nf3", None),
            ("A10", "English Opening", "c4", None),
            ("A20", "English Opening, King's English", "c4 e5", None),
            ("A40", "Queen's Pawn Game", "d4", None),
            ("A45", "Queen's Pawn Game", "d4 Nf6", None),
            ("A80", "Dutch Defense", "d4 f5", None),

            # B00-B99: Semi-open games (Black's irregular responses to 1.e4)
            ("B00", "King's Pawn Opening", "e4", None),
            ("B01", "Scandinavian Defense", "e4 d5", None),
            ("B10", "Caro-Kann Defense", "e4 c6", None),
            ("B12", "Caro-Kann Defense", "e4 c6 d4 d5", None),
            ("B20", "Sicilian Defense", "e4 c5", None),
            ("B22", "Sicilian, Alapin Variation", "e4 c5 c3", None),
            ("B23", "Sicilian, Closed", "e4 c5 Nc3", None),
            ("B50", "Sicilian Defense", "e4 c5 Nf3 d6", None),
            ("B90", "Sicilian, Najdorf", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6", None),

            # C00-C99: Open games (1.e4 e5)
            ("C00", "French Defense", "e4 e6", None),
            ("C20", "King's Pawn Game", "e4 e5", None),
            ("C23", "Bishop's Opening", "e4 e5 Bc4", None),
            ("C25", "Vienna Game", "e4 e5 Nc3", None),
            ("C30", "King's Gambit", "e4 e5 f4", None),
            ("C40", "King's Knight Opening", "e4 e5 Nf3", None),
            ("C44", "Scotch Game", "e4 e5 Nf3 Nc6 d4", None),
            ("C45", "Scotch Game", "e4 e5 Nf3 Nc6 d4 exd4 Nxd4", None),
            ("C47", "Four Knights Game", "e4 e5 Nf3 Nc6 Nc3 Nf6", None),
            ("C50", "Italian Game", "e4 e5 Nf3 Nc6 Bc4", None),
            ("C53", "Giuoco Piano", "e4 e5 Nf3 Nc6 Bc4 Bc5", None),
            ("C55", "Two Knights Defense", "e4 e5 Nf3 Nc6 Bc4 Nf6", None),
            ("C60", "Ruy Lopez", "e4 e5 Nf3 Nc6 Bb5", None),
            ("C65", "Ruy Lopez, Berlin Defense", "e4 e5 Nf3 Nc6 Bb5 Nf6", None),
            ("C70", "Ruy Lopez, Morphy Defense", "e4 e5 Nf3 Nc6 Bb5 a6", None),

            # D00-D99: Closed games (1.d4 d5)
            ("D00", "Queen's Pawn Game", "d4 d5", None),
            ("D02", "Queen's Pawn Game", "d4 d5 Nf3", None),
            ("D06", "Queen's Gambit", "d4 d5 c4", None),
            ("D10", "Slav Defense", "d4 d5 c4 c6", None),
            ("D20", "Queen's Gambit Accepted", "d4 d5 c4 dxc4", None),
            ("D30", "Queen's Gambit Declined", "d4 d5 c4 e6", None),
            ("D80", "Grünfeld Defense", "d4 Nf6 c4 g6 Nc3 d5", None),

            # E00-E99: Indian defenses
            ("E00", "Catalan Opening", "d4 Nf6 c4 e6 g3", None),
            ("E20", "Nimzo-Indian Defense", "d4 Nf6 c4 e6 Nc3 Bb4", None),
            ("E30", "Nimzo-Indian, Leningrad", "d4 Nf6 c4 e6 Nc3 Bb4 Qc2", None),
            ("E40", "Nimzo-Indian, Rubinstein", "d4 Nf6 c4 e6 Nc3 Bb4 e3", None),
            ("E60", "King's Indian Defense", "d4 Nf6 c4 g6", None),
            ("E70", "King's Indian Defense", "d4 Nf6 c4 g6 Nc3 Bg7 e4", None),
        ]

        for eco_code, name, moves_str, fen in eco_definitions:
            # Generate FEN if not provided
            if fen is None and moves_str:
                fen = self._generate_fen_from_moves(moves_str.split())

            eco_db[eco_code] = {
                "code": eco_code,
                "name": name,
                "moves": moves_str,
                "fen": fen or "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -"
            }

        # Save to file
        eco_file = self.data_dir / "eco_codes.json"
        with open(eco_file, 'w') as f:
            json.dump(eco_db, f, indent=2)

        print(f"ECO database saved to {eco_file}")
        print(f"Total ECO codes: {len(eco_db)}")

        return eco_db

    def fetch_lichess_opening_stats(self, fen: str, variant: str = "standard",
                                   speeds: List[str] = None) -> Optional[Dict]:
        """
        Fetch opening statistics from Lichess API.

        Args:
            fen: Position FEN
            variant: Chess variant (default: standard)
            speeds: Game speeds to include (default: blitz, rapid, classical)

        Returns:
            Dictionary with opening statistics or None if error
        """
        if speeds is None:
            speeds = ["blitz", "rapid", "classical"]

        try:
            params = {
                "fen": fen,
                "variant": variant,
                "speeds": ",".join(speeds),
                "ratings": "2000,2200,2500"  # Focus on stronger players
            }

            response = requests.get(self.lichess_base_url, params=params, timeout=10)

            if response.status_code == 200:
                time.sleep(self.rate_limit_delay)
                return response.json()
            else:
                print(f"Error fetching Lichess data: {response.status_code}")
                return None

        except Exception as e:
            print(f"Exception fetching Lichess data: {e}")
            return None

    def build_opening_tree(self, max_depth: int = 8) -> Dict:
        """
        Build hierarchical opening tree structure.

        Args:
            max_depth: Maximum depth to explore (number of moves)

        Returns:
            Nested dictionary representing opening tree
        """
        print(f"Building opening tree (depth: {max_depth})...")

        tree = {}

        # Common first moves
        first_moves = ["e4", "d4", "c4", "Nf3", "g3", "f4"]

        for first_move in first_moves:
            print(f"Exploring {first_move}...")
            subtree = self._explore_opening_line([first_move], max_depth)
            tree[first_move] = subtree

        # Save to file
        tree_file = self.data_dir / "opening_tree.json"
        with open(tree_file, 'w') as f:
            json.dump(tree, f, indent=2)

        print(f"Opening tree saved to {tree_file}")

        return tree

    def _explore_opening_line(self, moves: List[str], max_depth: int,
                            current_depth: int = 1) -> Dict:
        """
        Recursively explore an opening line.

        Args:
            moves: Current move sequence
            max_depth: Maximum depth to explore
            current_depth: Current depth in the tree

        Returns:
            Dictionary with opening information and children
        """
        if current_depth >= max_depth:
            return {"moves": moves}

        # Generate position from moves
        board = chess.Board()
        for move_str in moves:
            try:
                move = board.parse_san(move_str)
                board.push(move)
            except:
                return {"moves": moves, "error": "Invalid move sequence"}

        # Fetch statistics from Lichess
        stats = self.fetch_lichess_opening_stats(board.fen())

        node = {
            "moves": moves,
            "fen": board.fen(),
            "depth": current_depth,
        }

        if stats:
            # Add statistics
            total_games = stats.get('white', 0) + stats.get('draws', 0) + stats.get('black', 0)

            if total_games > 0:
                node["stats"] = {
                    "total_games": total_games,
                    "white_wins": stats.get('white', 0),
                    "draws": stats.get('draws', 0),
                    "black_wins": stats.get('black', 0),
                }

            # Explore common continuations
            moves_data = stats.get('moves', [])
            children = {}

            # Only explore top 3 moves at each position to keep tree manageable
            for move_data in sorted(moves_data, key=lambda x: x.get('white', 0) + x.get('draws', 0) + x.get('black', 0), reverse=True)[:3]:
                next_move = move_data.get('san')
                if next_move:
                    child_moves = moves + [next_move]
                    children[next_move] = self._explore_opening_line(child_moves, max_depth, current_depth + 1)

            if children:
                node["children"] = children

        return node

    def build_transposition_map(self) -> Dict:
        """
        Build a map of known transpositions.

        Returns:
            Dictionary mapping position FENs to alternate move sequences
        """
        print("Building transposition map...")

        transpositions = {}

        # Known transposition patterns
        known_transpositions = [
            # Italian Game
            {
                "routes": [
                    ["e4", "e5", "Nf3", "Nc6", "Bc4"],
                    ["e4", "e5", "Bc4", "Nc6", "Nf3"],
                ],
                "name": "Italian Game"
            },
            # Four Knights
            {
                "routes": [
                    ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6"],
                    ["e4", "e5", "Nf3", "Nf6", "Nc3", "Nc6"],
                    ["e4", "e5", "Nc3", "Nc6", "Nf3", "Nf6"],
                ],
                "name": "Four Knights Game"
            },
            # English to Sicilian Reversed
            {
                "routes": [
                    ["c4", "e5"],
                    ["e4", "c5"],  # Note: Different position, just similar structure
                ],
                "name": "English/Sicilian"
            },
        ]

        for trans_group in known_transpositions:
            routes = trans_group["routes"]
            name = trans_group["name"]

            # Get FEN of first route
            target_fen = self._generate_fen_from_moves(routes[0])

            if target_fen:
                transpositions[target_fen] = {
                    "name": name,
                    "routes": routes
                }

        # Save to file
        trans_file = self.data_dir / "transposition_map.json"
        with open(trans_file, 'w') as f:
            json.dump(transpositions, f, indent=2)

        print(f"Transposition map saved to {trans_file}")
        print(f"Total transposition groups: {len(transpositions)}")

        return transpositions

    def _generate_fen_from_moves(self, moves: List[str]) -> Optional[str]:
        """Generate FEN from a move sequence."""
        board = chess.Board()
        for move_str in moves:
            try:
                move = board.parse_san(move_str)
                board.push(move)
            except:
                return None
        return board.fen()

    def build_all(self):
        """Build all database files."""
        print("=" * 60)
        print("Building Complete Opening Database")
        print("=" * 60)

        print("\n1. Building ECO code database...")
        self.build_eco_database()

        print("\n2. Building transposition map...")
        self.build_transposition_map()

        print("\n3. Building opening tree (this may take a while)...")
        # Start with shallow depth to avoid rate limiting
        self.build_opening_tree(max_depth=4)

        print("\n" + "=" * 60)
        print("Database build complete!")
        print("=" * 60)
        print(f"\nFiles saved to: {self.data_dir}")


def main():
    """Main function to run the database builder."""
    import argparse

    parser = argparse.ArgumentParser(description="Build chess opening database")
    parser.add_argument("--data-dir", help="Directory to save database files")
    parser.add_argument("--eco-only", action="store_true", help="Only build ECO database")
    parser.add_argument("--tree-depth", type=int, default=4, help="Opening tree depth")

    args = parser.parse_args()

    builder = DatabaseBuilder(data_dir=args.data_dir)

    if args.eco_only:
        builder.build_eco_database()
    else:
        builder.build_all()


if __name__ == "__main__":
    main()
