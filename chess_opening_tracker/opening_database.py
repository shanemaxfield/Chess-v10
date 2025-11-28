"""
Comprehensive chess opening database with ECO codes, positions, and variations.
This database includes positions indexed by FEN for fast lookup.
"""

import chess
from typing import Dict, List, Optional
from .models import Continuation


class OpeningDatabase:
    """
    Database of chess openings with ECO codes and position information.
    Positions are indexed by FEN for O(1) lookup performance.
    """

    def __init__(self):
        """Initialize the opening database."""
        self._position_db: Dict[str, dict] = {}
        self._eco_db: Dict[str, dict] = {}
        self._build_database()

    def _normalize_fen(self, fen: str) -> str:
        """
        Normalize FEN for consistent lookup (removes move counters).
        Only keeps position, side to move, castling, and en passant.
        """
        parts = fen.split()
        if len(parts) >= 4:
            return ' '.join(parts[:4])
        return fen

    def _build_database(self):
        """Build the comprehensive opening database."""
        # Starting position
        self._add_position(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -",
            eco="A00",
            name="Starting Position",
            full_name="Starting Position",
            moves=[],
            opening_family="Starting Position",
            is_mainline=True
        )

        # Build the database with common openings
        self._build_e4_openings()
        self._build_d4_openings()
        self._build_other_openings()

    def _add_position(self, fen: str, eco: str, name: str, full_name: str,
                     moves: List[str], opening_family: str = "",
                     is_mainline: bool = False, continuations: List[Continuation] = None,
                     typical_plans: List[str] = None, main_ideas: List[str] = None,
                     key_squares: List[str] = None, pawn_structure: str = "",
                     difficulty: str = "intermediate", style: str = "balanced",
                     parent_eco: str = ""):
        """Add a position to the database."""
        normalized_fen = self._normalize_fen(fen)

        self._position_db[normalized_fen] = {
            "fen": normalized_fen,
            "eco": eco,
            "name": name,
            "full_name": full_name,
            "moves": moves,
            "opening_family": opening_family,
            "is_mainline": is_mainline,
            "continuations": continuations or [],
            "typical_plans": typical_plans or [],
            "main_ideas": main_ideas or [],
            "key_squares": key_squares or [],
            "pawn_structure": pawn_structure,
            "difficulty": difficulty,
            "style": style,
            "parent_eco": parent_eco
        }

        # Also index by ECO code
        if eco not in self._eco_db:
            self._eco_db[eco] = {
                "name": name,
                "full_name": full_name,
                "moves": moves,
                "fen": normalized_fen
            }

    def _build_e4_openings(self):
        """Build e4 openings database."""

        # 1. e4
        self._add_position(
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -",
            eco="B00",
            name="King's Pawn",
            full_name="King's Pawn Opening",
            moves=["e4"],
            opening_family="Open",
            is_mainline=True,
            continuations=[
                Continuation("e5", "C20", "King's Pawn Game", 0.45, 0.52, 0.32, 0.16),
                Continuation("c5", "B20", "Sicilian Defense", 0.25, 0.48, 0.28, 0.24),
                Continuation("e6", "C00", "French Defense", 0.11, 0.54, 0.34, 0.12),
                Continuation("c6", "B10", "Caro-Kann Defense", 0.08, 0.51, 0.36, 0.13),
                Continuation("d5", "B01", "Scandinavian Defense", 0.04, 0.56, 0.30, 0.14),
            ],
            main_ideas=["Control the center", "Quick development", "King safety"],
            difficulty="beginner"
        )

        # 1. e4 e5 - Open Game
        self._add_position(
            "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
            eco="C20",
            name="King's Pawn Game",
            full_name="King's Pawn Game",
            moves=["e4", "e5"],
            opening_family="Open",
            is_mainline=True,
            continuations=[
                Continuation("Nf3", "C40", "King's Knight Opening", 0.70, 0.52, 0.32, 0.16),
                Continuation("Bc4", "C23", "Bishop's Opening", 0.12, 0.50, 0.33, 0.17),
                Continuation("f4", "C30", "King's Gambit", 0.05, 0.51, 0.30, 0.19),
                Continuation("Nc3", "C25", "Vienna Game", 0.08, 0.52, 0.31, 0.17),
            ],
            main_ideas=["Symmetrical pawn structure", "Fight for center control", "Classical development"],
            difficulty="beginner"
        )

        # Italian Game
        self._add_position(
            "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -",
            eco="C50",
            name="Italian Game",
            full_name="Italian Game",
            moves=["e4", "e5", "Nf3", "Nc6", "Bc4"],
            opening_family="Open",
            is_mainline=True,
            continuations=[
                Continuation("Bc5", "C53", "Giuoco Piano", 0.50, 0.50, 0.35, 0.15),
                Continuation("Nf6", "C55", "Two Knights Defense", 0.35, 0.52, 0.32, 0.16),
                Continuation("Be7", "C50", "Hungarian Defense", 0.08, 0.54, 0.34, 0.12),
            ],
            typical_plans=[
                "White aims for quick development and pressure on f7",
                "Control the center with d2-d3 or d2-d4",
                "Castle kingside and prepare for middlegame attack"
            ],
            main_ideas=["Pressure on f7", "Quick development", "Central control"],
            key_squares=["f7", "d5", "e4"],
            pawn_structure="Open Center",
            difficulty="beginner",
            style="tactical"
        )

        # Giuoco Piano
        self._add_position(
            "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -",
            eco="C53",
            name="Giuoco Piano",
            full_name="Italian Game, Giuoco Piano",
            moves=["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
            opening_family="Open",
            is_mainline=True,
            continuations=[
                Continuation("c3", "C53", "Giuoco Piano, Main Line", 0.60, 0.51, 0.35, 0.14),
                Continuation("d3", "C50", "Giuoco Piano, Quiet Variation", 0.25, 0.49, 0.36, 0.15),
                Continuation("b4", "C52", "Evans Gambit", 0.05, 0.52, 0.28, 0.20),
            ],
            typical_plans=[
                "White plays c3 and d4 to open the center",
                "Black aims for ...d5 to free the position",
                "Both sides develop pieces harmoniously"
            ],
            main_ideas=["Central pawn break with d4", "Piece coordination", "Control of d5 square"],
            key_squares=["d4", "d5", "e4", "e5"],
            pawn_structure="Open Center",
            difficulty="intermediate",
            style="positional"
        )

        # Ruy Lopez
        self._add_position(
            "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -",
            eco="C60",
            name="Ruy Lopez",
            full_name="Ruy Lopez",
            moves=["e4", "e5", "Nf3", "Nc6", "Bb5"],
            opening_family="Open",
            is_mainline=True,
            continuations=[
                Continuation("a6", "C70", "Ruy Lopez, Morphy Defense", 0.60, 0.51, 0.35, 0.14),
                Continuation("Nf6", "C65", "Ruy Lopez, Berlin Defense", 0.25, 0.48, 0.40, 0.12),
                Continuation("f5", "C63", "Ruy Lopez, Schliemann Defense", 0.03, 0.54, 0.28, 0.18),
            ],
            typical_plans=[
                "White pressures the e5 pawn and aims for central control",
                "Black seeks counterplay with ...a6 and ...b5",
                "Long-term maneuvering and strategic complexity"
            ],
            main_ideas=["Pressure on e5", "Control of the center", "Strategic complexity"],
            key_squares=["e5", "d4", "d5"],
            pawn_structure="Open Center",
            difficulty="advanced",
            style="positional"
        )

        # Sicilian Defense
        self._add_position(
            "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
            eco="B20",
            name="Sicilian Defense",
            full_name="Sicilian Defense",
            moves=["e4", "c5"],
            opening_family="Semi-Open",
            is_mainline=True,
            continuations=[
                Continuation("Nf3", "B20", "Sicilian Defense", 0.70, 0.48, 0.28, 0.24),
                Continuation("c3", "B22", "Sicilian, Alapin Variation", 0.15, 0.51, 0.32, 0.17),
                Continuation("Nc3", "B23", "Sicilian, Closed", 0.08, 0.49, 0.30, 0.21),
            ],
            typical_plans=[
                "Black fights for d4 square and asymmetric pawn structure",
                "White aims for space advantage and kingside attack",
                "Sharp tactical play expected"
            ],
            main_ideas=["Asymmetric structure", "Fight for d4", "Dynamic play"],
            key_squares=["d4", "d5"],
            pawn_structure="Sicilian",
            difficulty="intermediate",
            style="sharp"
        )

        # Sicilian Najdorf
        self._add_position(
            "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq -",
            eco="B90",
            name="Sicilian, Najdorf",
            full_name="Sicilian Defense, Najdorf Variation",
            moves=["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
            opening_family="Semi-Open",
            is_mainline=True,
            continuations=[
                Continuation("Be3", "B90", "Najdorf, English Attack", 0.30, 0.50, 0.28, 0.22),
                Continuation("Bg5", "B94", "Najdorf, 6.Bg5", 0.35, 0.49, 0.29, 0.22),
                Continuation("f3", "B90", "Najdorf, Lipnitzky Attack", 0.12, 0.48, 0.27, 0.25),
                Continuation("Be2", "B90", "Najdorf, 6.Be2", 0.15, 0.47, 0.31, 0.22),
            ],
            typical_plans=[
                "Black aims for ...e5 or ...b5 for counterplay",
                "White often plays for kingside attack",
                "Complex tactical and strategic ideas"
            ],
            main_ideas=["Flexible pawn structure", "Control of d5", "Sharp tactics"],
            key_squares=["d5", "b5", "e6"],
            pawn_structure="Sicilian",
            difficulty="advanced",
            style="sharp"
        )

        # French Defense
        self._add_position(
            "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
            eco="C00",
            name="French Defense",
            full_name="French Defense",
            moves=["e4", "e6"],
            opening_family="Semi-Open",
            is_mainline=True,
            continuations=[
                Continuation("d4", "C00", "French Defense", 0.85, 0.54, 0.34, 0.12),
                Continuation("d3", "C00", "French Defense, King's Indian Attack", 0.08, 0.51, 0.35, 0.14),
                Continuation("Nf3", "C00", "French Defense, 2.Nf3", 0.05, 0.50, 0.36, 0.14),
            ],
            typical_plans=[
                "Black aims for ...d5 creating a solid pawn chain",
                "White typically builds space advantage",
                "Black's light-squared bishop is often problematic"
            ],
            main_ideas=["Solid pawn structure", "Control of d5", "Strategic complexity"],
            key_squares=["d5", "e5", "f6"],
            pawn_structure="French",
            difficulty="intermediate",
            style="positional"
        )

        # Caro-Kann Defense
        self._add_position(
            "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
            eco="B10",
            name="Caro-Kann Defense",
            full_name="Caro-Kann Defense",
            moves=["e4", "c6"],
            opening_family="Semi-Open",
            is_mainline=True,
            continuations=[
                Continuation("d4", "B10", "Caro-Kann Defense", 0.80, 0.51, 0.36, 0.13),
                Continuation("Nf3", "B10", "Caro-Kann, Two Knights Attack", 0.10, 0.52, 0.34, 0.14),
                Continuation("Nc3", "B10", "Caro-Kann, 2.Nc3", 0.06, 0.50, 0.35, 0.15),
            ],
            typical_plans=[
                "Black plays ...d5 with solid pawn structure",
                "Unlike French, light-squared bishop develops easily",
                "Reliable and solid opening choice"
            ],
            main_ideas=["Solid structure", "Easy piece development", "Reliable defense"],
            key_squares=["d5", "e4"],
            pawn_structure="Caro-Kann",
            difficulty="intermediate",
            style="positional"
        )

        # Scandinavian Defense
        self._add_position(
            "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
            eco="B01",
            name="Scandinavian Defense",
            full_name="Scandinavian Defense",
            moves=["e4", "d5"],
            opening_family="Semi-Open",
            is_mainline=True,
            continuations=[
                Continuation("exd5", "B01", "Scandinavian Defense", 0.95, 0.56, 0.30, 0.14),
            ],
            typical_plans=[
                "Black recaptures and develops queen early",
                "White gains tempo by attacking the queen",
                "Black gets solid but slightly passive position"
            ],
            main_ideas=["Early queen development", "Solid structure", "Fighting for equality"],
            key_squares=["d5"],
            pawn_structure="Scandinavian",
            difficulty="beginner",
            style="positional"
        )

    def _build_d4_openings(self):
        """Build d4 openings database."""

        # 1. d4
        self._add_position(
            "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -",
            eco="A40",
            name="Queen's Pawn",
            full_name="Queen's Pawn Opening",
            moves=["d4"],
            opening_family="Closed",
            is_mainline=True,
            continuations=[
                Continuation("Nf6", "A40", "Queen's Pawn Game", 0.35, 0.54, 0.32, 0.14),
                Continuation("d5", "D00", "Queen's Pawn Game", 0.30, 0.52, 0.34, 0.14),
                Continuation("e6", "A40", "Queen's Pawn Game", 0.10, 0.53, 0.33, 0.14),
                Continuation("f5", "A80", "Dutch Defense", 0.05, 0.56, 0.30, 0.14),
            ],
            main_ideas=["Control the center", "Flexible development", "Strategic play"],
            difficulty="intermediate"
        )

        # Queen's Gambit
        self._add_position(
            "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -",
            eco="D06",
            name="Queen's Gambit",
            full_name="Queen's Gambit",
            moves=["d4", "d5", "c4"],
            opening_family="Closed",
            is_mainline=True,
            continuations=[
                Continuation("dxc4", "D20", "Queen's Gambit Accepted", 0.30, 0.54, 0.32, 0.14),
                Continuation("e6", "D30", "Queen's Gambit Declined", 0.40, 0.52, 0.35, 0.13),
                Continuation("c6", "D10", "Slav Defense", 0.20, 0.51, 0.36, 0.13),
                Continuation("Nf6", "D02", "Queen's Gambit Declined, 2...Nf6", 0.08, 0.53, 0.34, 0.13),
            ],
            typical_plans=[
                "White offers a pawn to gain central control",
                "Black can accept or decline the gambit",
                "Rich strategic and tactical possibilities"
            ],
            main_ideas=["Central control", "Pawn sacrifice for development", "Strategic complexity"],
            key_squares=["d5", "c4", "e4"],
            pawn_structure="Queen's Gambit",
            difficulty="intermediate",
            style="positional"
        )

        # King's Indian Defense
        self._add_position(
            "rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -",
            eco="E60",
            name="King's Indian Defense",
            full_name="King's Indian Defense",
            moves=["d4", "Nf6", "c4", "g6", "Nc3"],
            opening_family="Indian",
            is_mainline=True,
            continuations=[
                Continuation("Bg7", "E60", "King's Indian Defense", 0.90, 0.55, 0.30, 0.15),
            ],
            typical_plans=[
                "Black fianchettoes the kingside bishop",
                "Flexible pawn structure with ...d6 and ...e5",
                "Rich attacking chances for both sides"
            ],
            main_ideas=["Fianchetto setup", "Counterattacking play", "Dynamic imbalance"],
            key_squares=["e4", "d5", "f5"],
            pawn_structure="King's Indian",
            difficulty="advanced",
            style="sharp"
        )

        # Nimzo-Indian Defense
        self._add_position(
            "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq -",
            eco="E20",
            name="Nimzo-Indian Defense",
            full_name="Nimzo-Indian Defense",
            moves=["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"],
            opening_family="Indian",
            is_mainline=True,
            continuations=[
                Continuation("e3", "E40", "Nimzo-Indian, Rubinstein", 0.30, 0.52, 0.36, 0.12),
                Continuation("Qc2", "E30", "Nimzo-Indian, Leningrad", 0.25, 0.53, 0.34, 0.13),
                Continuation("a3", "E20", "Nimzo-Indian, Sämisch", 0.15, 0.54, 0.32, 0.14),
                Continuation("Nf3", "E20", "Nimzo-Indian, Three Knights", 0.12, 0.51, 0.36, 0.13),
            ],
            typical_plans=[
                "Black pins the knight and fights for central control",
                "White must decide how to handle the pin",
                "Rich strategic complexity"
            ],
            main_ideas=["Pin on the knight", "Central control", "Strategic flexibility"],
            key_squares=["c3", "e4", "d5"],
            pawn_structure="Nimzo-Indian",
            difficulty="advanced",
            style="positional"
        )

        # Grünfeld Defense
        self._add_position(
            "rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -",
            eco="D80",
            name="Grünfeld Defense",
            full_name="Grünfeld Defense",
            moves=["d4", "Nf6", "c4", "g6", "Nc3", "d5"],
            opening_family="Indian",
            is_mainline=True,
            continuations=[
                Continuation("cxd5", "D80", "Grünfeld Defense, Exchange", 0.40, 0.54, 0.32, 0.14),
                Continuation("Nf3", "D90", "Grünfeld Defense, Three Knights", 0.30, 0.53, 0.33, 0.14),
                Continuation("Bg5", "D80", "Grünfeld Defense, 4.Bg5", 0.10, 0.52, 0.34, 0.14),
            ],
            typical_plans=[
                "Black allows White large pawn center then attacks it",
                "Hypermodern approach with piece pressure",
                "Dynamic and complex positions"
            ],
            main_ideas=["Hypermodern center", "Dynamic counterplay", "Piece pressure"],
            key_squares=["d4", "c3", "e4"],
            pawn_structure="Grünfeld",
            difficulty="advanced",
            style="sharp"
        )

    def _build_other_openings(self):
        """Build other opening variations (English, Reti, etc.)."""

        # English Opening
        self._add_position(
            "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq -",
            eco="A10",
            name="English Opening",
            full_name="English Opening",
            moves=["c4"],
            opening_family="Flank",
            is_mainline=True,
            continuations=[
                Continuation("Nf6", "A10", "English Opening", 0.30, 0.51, 0.35, 0.14),
                Continuation("e5", "A20", "English Opening, King's English", 0.25, 0.52, 0.34, 0.14),
                Continuation("c5", "A20", "English Opening, Symmetrical", 0.20, 0.50, 0.36, 0.14),
                Continuation("e6", "A10", "English Opening", 0.10, 0.51, 0.35, 0.14),
            ],
            typical_plans=[
                "Flexible hypermodern approach",
                "Control of the center from the flanks",
                "Often transposes to other openings"
            ],
            main_ideas=["Hypermodern control", "Flexibility", "Transposition possibilities"],
            key_squares=["d5", "e4"],
            pawn_structure="English",
            difficulty="intermediate",
            style="positional"
        )

        # Réti Opening
        self._add_position(
            "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -",
            eco="A04",
            name="Réti Opening",
            full_name="Réti Opening",
            moves=["Nf3"],
            opening_family="Flank",
            is_mainline=True,
            continuations=[
                Continuation("d5", "A04", "Réti Opening", 0.35, 0.51, 0.35, 0.14),
                Continuation("Nf6", "A04", "Réti Opening", 0.30, 0.50, 0.36, 0.14),
                Continuation("c5", "A09", "Réti Opening", 0.12, 0.51, 0.34, 0.15),
            ],
            typical_plans=[
                "Hypermodern development",
                "Flexible pawn structure",
                "Often transposes to other systems"
            ],
            main_ideas=["Hypermodern approach", "Flexibility", "Piece development"],
            key_squares=["d4", "e4"],
            pawn_structure="Various",
            difficulty="intermediate",
            style="positional"
        )

    def get_position(self, fen: str) -> Optional[dict]:
        """Get opening information for a position."""
        normalized = self._normalize_fen(fen)
        return self._position_db.get(normalized)

    def get_eco_info(self, eco_code: str) -> Optional[dict]:
        """Get information about an ECO code."""
        return self._eco_db.get(eco_code)

    def find_position_by_moves(self, moves: List[str]) -> Optional[dict]:
        """Find position by move sequence."""
        board = chess.Board()
        for move_str in moves:
            try:
                move = board.parse_san(move_str)
                board.push(move)
            except:
                return None

        fen = self._normalize_fen(board.fen())
        return self._position_db.get(fen)

    def get_all_positions(self) -> Dict[str, dict]:
        """Get all positions in the database."""
        return self._position_db

    def search_by_name(self, name_query: str) -> List[dict]:
        """Search for openings by name."""
        results = []
        query_lower = name_query.lower()

        for pos_data in self._position_db.values():
            if (query_lower in pos_data['name'].lower() or
                query_lower in pos_data['full_name'].lower()):
                results.append(pos_data)

        return results
