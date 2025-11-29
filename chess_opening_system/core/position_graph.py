"""
Position Graph Database System
Stores chess positions as nodes with moves as edges, handling transpositions
"""

import json
import pickle
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, asdict, field
from collections import defaultdict, deque
import chess

from .zobrist import get_zobrist_hasher


@dataclass
class PositionStatistics:
    """Statistics for a position at a specific rating range."""
    rating_min: int
    rating_max: int
    white_wins: int = 0
    black_wins: int = 0
    draws: int = 0
    total_games: int = 0

    @property
    def white_win_rate(self) -> float:
        """Calculate white win percentage."""
        return (self.white_wins / self.total_games * 100) if self.total_games > 0 else 0.0

    @property
    def draw_rate(self) -> float:
        """Calculate draw percentage."""
        return (self.draws / self.total_games * 100) if self.total_games > 0 else 0.0

    @property
    def black_win_rate(self) -> float:
        """Calculate black win percentage."""
        return (self.black_wins / self.total_games * 100) if self.total_games > 0 else 0.0


@dataclass
class OpeningInfo:
    """Opening classification information."""
    eco: str
    name: str
    variation: str = ""


@dataclass
class MoveEdge:
    """Edge representing a move to another position."""
    move_uci: str
    move_san: str
    target_hash: str
    frequency: float = 0.0  # Popularity (0.0 to 1.0)
    evaluation: Optional[float] = None  # Stockfish eval


@dataclass
class PositionNode:
    """Node representing a unique chess position."""
    zobrist_hash: str
    fen: str
    openings: List[OpeningInfo] = field(default_factory=list)
    transposition_moves: List[List[str]] = field(default_factory=list)  # Different move sequences
    strategic_themes: List[str] = field(default_factory=list)
    typical_plans: List[str] = field(default_factory=list)
    statistics: Dict[str, PositionStatistics] = field(default_factory=dict)  # Key: "1400-1600"
    child_moves: List[MoveEdge] = field(default_factory=list)
    evaluation: Optional[float] = None
    pawn_structure_hash: Optional[str] = None

    def add_opening(self, eco: str, name: str, variation: str = ""):
        """Add opening classification."""
        opening = OpeningInfo(eco=eco, name=name, variation=variation)
        if opening not in self.openings:
            self.openings.append(opening)

    def add_transposition(self, move_sequence: List[str]):
        """Add a move sequence that reaches this position."""
        if move_sequence not in self.transposition_moves:
            self.transposition_moves.append(move_sequence)

    def get_statistics_for_range(self, rating_min: int, rating_max: int) -> Optional[PositionStatistics]:
        """Get statistics for a rating range."""
        key = f"{rating_min}-{rating_max}"
        return self.statistics.get(key)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


class PositionGraph:
    """
    Graph database of chess positions.
    Each position is a node, moves are edges.
    Handles transpositions automatically.
    """

    def __init__(self):
        self.nodes: Dict[str, PositionNode] = {}  # zobrist_hash -> PositionNode
        self.hasher = get_zobrist_hasher()
        self._fen_to_hash_cache: Dict[str, str] = {}

    def get_hash(self, fen: str) -> str:
        """Get Zobrist hash for FEN (with caching)."""
        if fen not in self._fen_to_hash_cache:
            board = chess.Board(fen)
            self._fen_to_hash_cache[fen] = self.hasher.get_hash_str(board)
        return self._fen_to_hash_cache[fen]

    def add_position(self, fen: str) -> PositionNode:
        """
        Add a position to the graph if it doesn't exist.

        Args:
            fen: Position FEN string

        Returns:
            PositionNode (existing or newly created)
        """
        pos_hash = self.get_hash(fen)

        if pos_hash not in self.nodes:
            self.nodes[pos_hash] = PositionNode(
                zobrist_hash=pos_hash,
                fen=fen
            )

        return self.nodes[pos_hash]

    def add_move(self, from_fen: str, move_uci: str, to_fen: str,
                 frequency: float = 0.0, evaluation: Optional[float] = None) -> Tuple[PositionNode, PositionNode]:
        """
        Add a move edge between two positions.

        Args:
            from_fen: Source position FEN
            move_uci: Move in UCI notation
            to_fen: Destination position FEN
            frequency: Move popularity (0.0 to 1.0)
            evaluation: Stockfish evaluation

        Returns:
            Tuple of (from_node, to_node)
        """
        from_node = self.add_position(from_fen)
        to_node = self.add_position(to_fen)

        # Convert to SAN for readability
        board = chess.Board(from_fen)
        move = chess.Move.from_uci(move_uci)
        move_san = board.san(move)

        # Add edge if it doesn't exist
        to_hash = self.get_hash(to_fen)
        existing_edge = next((e for e in from_node.child_moves if e.move_uci == move_uci), None)

        if existing_edge is None:
            edge = MoveEdge(
                move_uci=move_uci,
                move_san=move_san,
                target_hash=to_hash,
                frequency=frequency,
                evaluation=evaluation
            )
            from_node.child_moves.append(edge)

        return from_node, to_node

    def get_position(self, fen: str) -> Optional[PositionNode]:
        """Get position node by FEN."""
        pos_hash = self.get_hash(fen)
        return self.nodes.get(pos_hash)

    def get_position_by_hash(self, zobrist_hash: str) -> Optional[PositionNode]:
        """Get position node by Zobrist hash."""
        return self.nodes.get(zobrist_hash)

    def find_transpositions(self, from_fen: str, target_opening_name: str,
                           max_depth: int = 10) -> List[Tuple[List[str], PositionNode]]:
        """
        Find all paths from current position to positions matching the target opening.

        Args:
            from_fen: Starting position FEN
            target_opening_name: Opening name to search for (case-insensitive)
            max_depth: Maximum move depth to search

        Returns:
            List of (move_sequence, target_position) tuples
        """
        from_hash = self.get_hash(from_fen)
        if from_hash not in self.nodes:
            return []

        target_name_lower = target_opening_name.lower()
        results: List[Tuple[List[str], PositionNode]] = []

        # BFS to find all paths
        queue: deque = deque([(from_hash, [])])
        visited: Set[str] = set()

        while queue:
            current_hash, path = queue.popleft()

            if len(path) > max_depth:
                continue

            if current_hash in visited:
                continue

            visited.add(current_hash)
            current_node = self.nodes[current_hash]

            # Check if this position matches target opening
            for opening in current_node.openings:
                if target_name_lower in opening.name.lower() or target_name_lower in opening.variation.lower():
                    results.append((path, current_node))
                    break

            # Explore children
            for edge in current_node.child_moves:
                new_path = path + [edge.move_san]
                queue.append((edge.target_hash, new_path))

        return results

    def get_popular_continuations(self, fen: str, rating_range: Tuple[int, int],
                                  num_moves: int = 5) -> List[Tuple[MoveEdge, PositionNode]]:
        """
        Get most popular continuations from a position.

        Args:
            fen: Position FEN
            rating_range: (min_rating, max_rating)
            num_moves: Number of top moves to return

        Returns:
            List of (move_edge, target_position) sorted by popularity
        """
        position = self.get_position(fen)
        if not position:
            return []

        # Sort moves by frequency
        sorted_moves = sorted(
            position.child_moves,
            key=lambda e: e.frequency,
            reverse=True
        )[:num_moves]

        results = []
        for edge in sorted_moves:
            target_node = self.nodes.get(edge.target_hash)
            if target_node:
                results.append((edge, target_node))

        return results

    def classify_position(self, fen: str) -> Optional[PositionNode]:
        """
        Classify a position and return its information.

        Args:
            fen: Position FEN

        Returns:
            PositionNode with opening info, or None if not found
        """
        return self.get_position(fen)

    def compute_pawn_structure_hash(self, fen: str) -> str:
        """
        Generate hash for pawn structure only (for finding similar positions).

        Args:
            fen: Position FEN

        Returns:
            Hash string
        """
        board = chess.Board(fen)
        pawn_hash = 0

        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece and piece.piece_type == chess.PAWN:
                key = (chess.PAWN, piece.color, square)
                pawn_hash ^= self.hasher.piece_square_hashes[key]

        return f"{pawn_hash:016x}"

    def find_similar_structures(self, fen: str, threshold: float = 0.8) -> List[PositionNode]:
        """
        Find positions with similar pawn structures.

        Args:
            fen: Position FEN
            threshold: Similarity threshold (not used in exact matching)

        Returns:
            List of positions with matching pawn structure
        """
        target_structure_hash = self.compute_pawn_structure_hash(fen)
        results = []

        for node in self.nodes.values():
            if node.pawn_structure_hash == target_structure_hash:
                results.append(node)

        return results

    def save_to_file(self, filename: str, format: str = 'pickle'):
        """
        Save graph to file.

        Args:
            filename: Output file path
            format: 'pickle' or 'json'
        """
        if format == 'pickle':
            with open(filename, 'wb') as f:
                pickle.dump(self.nodes, f)
        elif format == 'json':
            with open(filename, 'w') as f:
                data = {hash: node.to_dict() for hash, node in self.nodes.items()}
                json.dump(data, f, indent=2)

    def load_from_file(self, filename: str, format: str = 'pickle'):
        """
        Load graph from file.

        Args:
            filename: Input file path
            format: 'pickle' or 'json'
        """
        if format == 'pickle':
            with open(filename, 'rb') as f:
                self.nodes = pickle.load(f)
        elif format == 'json':
            with open(filename, 'r') as f:
                data = json.load(f)
                self.nodes = {}
                for hash, node_dict in data.items():
                    # Reconstruct PositionNode from dict
                    # This is simplified - full implementation would need proper deserialization
                    self.nodes[hash] = PositionNode(**node_dict)

    def get_statistics(self) -> dict:
        """Get graph statistics."""
        return {
            'total_positions': len(self.nodes),
            'total_edges': sum(len(node.child_moves) for node in self.nodes.values()),
            'positions_with_openings': sum(1 for node in self.nodes.values() if node.openings),
            'positions_with_transpositions': sum(1 for node in self.nodes.values()
                                                if len(node.transposition_moves) > 1)
        }
