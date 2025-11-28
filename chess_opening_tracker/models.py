"""Data models for the chess opening tracker system."""

from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


class TranspositionType(Enum):
    """Types of transpositions between openings."""
    EARLY = "early"  # Transposition in first 3 moves
    DELAYED = "delayed"  # Transposition after move 4
    CROSS_OPENING = "cross_opening"  # Between different opening families
    SAME_OPENING = "same_opening"  # Within same opening family


class MoveType(Enum):
    """Classification of moves within opening theory."""
    MAIN_LINE = "main_line"
    SIDELINE = "sideline"
    RARE = "rare"
    NOVELTY = "novelty"
    MISTAKE = "mistake"


@dataclass
class Continuation:
    """Represents a possible continuation from a position."""
    move: str
    eco_code: str
    name: str
    frequency: float
    white_win_rate: Optional[float] = None
    draw_rate: Optional[float] = None
    black_win_rate: Optional[float] = None


@dataclass
class TranspositionRoute:
    """Represents an alternative route to reach the same position."""
    moves: List[str]
    opening_name: str
    eco_code: str
    frequency: float
    transposition_type: TranspositionType


@dataclass
class BookStatus:
    """Status of whether a move is in opening theory."""
    is_book: bool
    frequency: Optional[float] = None
    move_type: Optional[MoveType] = None
    explanation: Optional[str] = None


@dataclass
class TheoryStatus:
    """Information about how deep a position is in theory."""
    in_theory: bool
    theory_depth: int  # Number of moves into theory
    moves_since_book: int  # Moves since last known position
    last_book_position_fen: Optional[str] = None
    deviation_move: Optional[str] = None


@dataclass
class Plan:
    """Represents a typical plan in an opening."""
    description: str
    side: str  # "white", "black", or "both"
    priority: int = 1  # 1 = highest priority
    key_moves: List[str] = field(default_factory=list)
    key_squares: List[str] = field(default_factory=list)


@dataclass
class OpeningInfo:
    """Complete information about a chess opening position."""

    # Position identification
    current_position_fen: str
    opening_name: str
    full_variation_name: str
    eco_code: str
    moves_played: List[str]

    # Book status
    book_status: str  # "in_book", "just_left_book", "out_of_book"
    theory_depth: int

    # Transposition information
    primary_route: List[str]
    alternative_routes: List[List[str]] = field(default_factory=list)
    transposition_note: Optional[str] = None

    # Statistical information
    frequency: float = 0.0  # How often this position occurs (0.0 to 1.0)
    white_win_rate: float = 0.0
    draw_rate: float = 0.0
    black_win_rate: float = 0.0

    # Contextual information
    typical_plans: List[str] = field(default_factory=list)
    key_squares: List[str] = field(default_factory=list)
    pawn_structure_type: Optional[str] = None
    common_continuations: List[Continuation] = field(default_factory=list)
    famous_games: List[str] = field(default_factory=list)

    # Teaching information
    difficulty_level: str = "intermediate"  # beginner, intermediate, advanced
    style: str = "balanced"  # tactical, positional, sharp, quiet, balanced
    main_ideas: List[str] = field(default_factory=list)

    # Opening family classification
    opening_family: Optional[str] = None  # Open, Semi-Open, Closed, Indian, etc.
    is_mainline: bool = False

    def __str__(self) -> str:
        """String representation of the opening info."""
        result = f"{self.full_variation_name} ({self.eco_code})\n"
        result += f"Status: {self.book_status}\n"
        if self.transposition_note:
            result += f"Note: {self.transposition_note}\n"
        if self.white_win_rate > 0:
            result += f"Stats: W:{self.white_win_rate:.1%} D:{self.draw_rate:.1%} B:{self.black_win_rate:.1%}\n"
        return result
