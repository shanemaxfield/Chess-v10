"""
Zobrist Hashing Implementation for Chess Positions
Generates unique position identifiers independent of move order (handles transpositions)
"""

import random
from typing import Dict, Tuple
import chess


class ZobristHasher:
    """
    Implements Zobrist hashing for chess positions.
    Each unique position maps to the same hash regardless of move order.
    """

    def __init__(self, seed: int = 42):
        """
        Initialize Zobrist hash tables with random values.

        Args:
            seed: Random seed for reproducible hashing
        """
        random.seed(seed)

        # Hash table for each piece type on each square
        # 12 piece types (6 white + 6 black) × 64 squares
        self.piece_square_hashes: Dict[Tuple[chess.PieceType, chess.Color, chess.Square], int] = {}

        for piece_type in chess.PIECE_TYPES:
            for color in chess.COLORS:
                for square in chess.SQUARES:
                    key = (piece_type, color, square)
                    self.piece_square_hashes[key] = random.getrandbits(64)

        # Side to move
        self.side_to_move_hash = random.getrandbits(64)

        # Castling rights (4 combinations: KQkq)
        self.castling_hashes = {
            'K': random.getrandbits(64),
            'Q': random.getrandbits(64),
            'k': random.getrandbits(64),
            'q': random.getrandbits(64)
        }

        # En passant file (8 files)
        self.en_passant_hashes = {file: random.getrandbits(64) for file in range(8)}

    def hash_position(self, board: chess.Board) -> int:
        """
        Generate Zobrist hash for a chess position.

        Args:
            board: chess.Board object

        Returns:
            64-bit hash as integer
        """
        hash_value = 0

        # Hash pieces
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece:
                key = (piece.piece_type, piece.color, square)
                hash_value ^= self.piece_square_hashes[key]

        # Hash side to move
        if board.turn == chess.BLACK:
            hash_value ^= self.side_to_move_hash

        # Hash castling rights
        if board.has_kingside_castling_rights(chess.WHITE):
            hash_value ^= self.castling_hashes['K']
        if board.has_queenside_castling_rights(chess.WHITE):
            hash_value ^= self.castling_hashes['Q']
        if board.has_kingside_castling_rights(chess.BLACK):
            hash_value ^= self.castling_hashes['k']
        if board.has_queenside_castling_rights(chess.BLACK):
            hash_value ^= self.castling_hashes['q']

        # Hash en passant
        if board.ep_square is not None:
            file = chess.square_file(board.ep_square)
            hash_value ^= self.en_passant_hashes[file]

        return hash_value

    def hash_fen(self, fen: str) -> int:
        """
        Generate Zobrist hash from FEN string.

        Args:
            fen: FEN position string

        Returns:
            64-bit hash as integer
        """
        board = chess.Board(fen)
        return self.hash_position(board)

    def get_hash_str(self, board: chess.Board) -> str:
        """
        Get hash as hexadecimal string.

        Args:
            board: chess.Board object

        Returns:
            Hash as 16-character hex string
        """
        hash_value = self.hash_position(board)
        return f"{hash_value:016x}"

    def incremental_hash(self, current_hash: int, move: chess.Move, board: chess.Board) -> int:
        """
        Update hash incrementally after a move (for performance).

        Args:
            current_hash: Hash before the move
            move: Move to apply
            board: Board before the move

        Returns:
            New hash after the move
        """
        new_hash = current_hash

        # Remove piece from source square
        piece = board.piece_at(move.from_square)
        if piece:
            key = (piece.piece_type, piece.color, move.from_square)
            new_hash ^= self.piece_square_hashes[key]

        # Handle capture
        captured = board.piece_at(move.to_square)
        if captured:
            key = (captured.piece_type, captured.color, move.to_square)
            new_hash ^= self.piece_square_hashes[key]

        # Place piece on destination square
        moving_piece = piece
        if move.promotion:
            moving_piece = chess.Piece(move.promotion, piece.color)

        if moving_piece:
            key = (moving_piece.piece_type, moving_piece.color, move.to_square)
            new_hash ^= self.piece_square_hashes[key]

        # Toggle side to move
        new_hash ^= self.side_to_move_hash

        # Note: Full recalculation needed for castling/en passant changes
        # This is a simplified version

        return new_hash


# Global instance
_zobrist_hasher = None


def get_zobrist_hasher() -> ZobristHasher:
    """Get singleton Zobrist hasher instance."""
    global _zobrist_hasher
    if _zobrist_hasher is None:
        _zobrist_hasher = ZobristHasher()
    return _zobrist_hasher


def zobrist_hash(fen: str) -> str:
    """
    Convenience function to generate Zobrist hash from FEN.

    Args:
        fen: FEN position string

    Returns:
        Hash as hexadecimal string
    """
    hasher = get_zobrist_hasher()
    board = chess.Board(fen)
    return hasher.get_hash_str(board)
