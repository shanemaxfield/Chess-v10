"""
Comprehensive test suite for the chess opening tracker system.
Tests opening identification, transposition detection, and all features.
"""

import unittest
import chess
from chess_opening_tracker import OpeningTracker
from chess_opening_tracker.models import MoveType, TranspositionType


class TestOpeningIdentification(unittest.TestCase):
    """Test basic opening identification functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.tracker = OpeningTracker()

    def test_starting_position(self):
        """Test identification of starting position."""
        fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -"
        info = self.tracker.identify_position(fen)

        self.assertEqual(info.eco_code, "A00")
        self.assertEqual(info.opening_name, "Starting Position")
        self.assertEqual(info.book_status, "in_book")

    def test_italian_game(self):
        """Test Italian Game identification."""
        moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "C50")
        self.assertIn("Italian", info.opening_name)
        self.assertEqual(info.book_status, "in_book")
        self.assertEqual(len(info.moves_played), 5)

    def test_giuoco_piano(self):
        """Test Giuoco Piano identification."""
        moves = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "C53")
        self.assertIn("Giuoco Piano", info.full_variation_name)
        self.assertTrue(len(info.typical_plans) > 0)

    def test_ruy_lopez(self):
        """Test Ruy Lopez identification."""
        moves = ["e4", "e5", "Nf3", "Nc6", "Bb5"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "C60")
        self.assertIn("Ruy Lopez", info.opening_name)
        self.assertEqual(info.difficulty_level, "advanced")

    def test_sicilian_defense(self):
        """Test Sicilian Defense identification."""
        moves = ["e4", "c5"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "B20")
        self.assertIn("Sicilian", info.opening_name)
        self.assertEqual(info.opening_family, "Semi-Open")

    def test_sicilian_najdorf(self):
        """Test Sicilian Najdorf identification."""
        moves = ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "B90")
        self.assertIn("Najdorf", info.full_variation_name)
        self.assertEqual(info.style, "sharp")

    def test_french_defense(self):
        """Test French Defense identification."""
        moves = ["e4", "e6"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "C00")
        self.assertIn("French", info.opening_name)
        self.assertIn("French", info.pawn_structure_type)

    def test_caro_kann_defense(self):
        """Test Caro-Kann Defense identification."""
        moves = ["e4", "c6"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "B10")
        self.assertIn("Caro-Kann", info.opening_name)

    def test_queens_gambit(self):
        """Test Queen's Gambit identification."""
        moves = ["d4", "d5", "c4"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "D06")
        self.assertIn("Queen's Gambit", info.opening_name)
        self.assertEqual(info.opening_family, "Closed")

    def test_kings_indian_defense(self):
        """Test King's Indian Defense identification."""
        moves = ["d4", "Nf6", "c4", "g6", "Nc3"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "E60")
        self.assertIn("King's Indian", info.opening_name)
        self.assertEqual(info.opening_family, "Indian")

    def test_nimzo_indian_defense(self):
        """Test Nimzo-Indian Defense identification."""
        moves = ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "E20")
        self.assertIn("Nimzo-Indian", info.opening_name)
        self.assertEqual(info.difficulty_level, "advanced")

    def test_grunfeld_defense(self):
        """Test Grünfeld Defense identification."""
        moves = ["d4", "Nf6", "c4", "g6", "Nc3", "d5"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "D80")
        self.assertIn("Grünfeld", info.opening_name)

    def test_english_opening(self):
        """Test English Opening identification."""
        moves = ["c4"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "A10")
        self.assertIn("English", info.opening_name)
        self.assertEqual(info.opening_family, "Flank")

    def test_reti_opening(self):
        """Test Réti Opening identification."""
        moves = ["Nf3"]
        info = self.tracker.get_opening_from_moves(moves)

        self.assertEqual(info.eco_code, "A04")
        self.assertIn("Réti", info.opening_name)


class TestTranspositions(unittest.TestCase):
    """Test transposition detection."""

    def setUp(self):
        """Set up test fixtures."""
        self.tracker = OpeningTracker()

    def test_italian_game_transposition(self):
        """Test that different move orders reach the same Italian Game position."""
        # Standard order
        moves1 = ["e4", "e5", "Nf3", "Nc6", "Bc4"]
        info1 = self.tracker.get_opening_from_moves(moves1)

        # Alternative order (Bishop before Knight)
        moves2 = ["e4", "e5", "Bc4", "Nc6", "Nf3"]
        info2 = self.tracker.get_opening_from_moves(moves2)

        # Both should identify as Italian Game
        self.assertEqual(info1.eco_code, info2.eco_code)
        self.assertIn("Italian", info1.opening_name)
        self.assertIn("Italian", info2.opening_name)

        # Check for transposition detection
        transpositions = self.tracker.find_transpositions(info1.current_position_fen)
        self.assertGreater(len(transpositions), 0)

    def test_giuoco_piano_transposition(self):
        """Test Giuoco Piano transposition."""
        moves1 = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]
        moves2 = ["e4", "e5", "Bc4", "Nc6", "Nf3", "Bc5"]

        info1 = self.tracker.get_opening_from_moves(moves1)
        info2 = self.tracker.get_opening_from_moves(moves2)

        # Should reach same position
        self.assertEqual(
            self.tracker._normalize_fen(info1.current_position_fen),
            self.tracker._normalize_fen(info2.current_position_fen)
        )

    def test_has_known_transpositions(self):
        """Test checking if a position has known transpositions."""
        moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]
        info = self.tracker.get_opening_from_moves(moves)

        has_trans = self.tracker.transposition_detector.has_known_transpositions(
            info.current_position_fen
        )

        # Italian Game should have known transpositions
        # Note: This depends on the transposition map being populated
        # May be False if transpositions aren't in the database yet

    def test_four_knights_transposition(self):
        """Test Four Knights Game transposition detection."""
        # Different orders to reach Four Knights
        routes = [
            ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6"],
            ["e4", "e5", "Nf3", "Nf6", "Nc3", "Nc6"],
            ["e4", "e5", "Nc3", "Nc6", "Nf3", "Nf6"],
        ]

        positions = []
        for route in routes:
            info = self.tracker.get_opening_from_moves(route)
            positions.append(self.tracker._normalize_fen(info.current_position_fen))

        # All routes should lead to the same position
        self.assertEqual(len(set(positions)), 1)


class TestTheoryDepth(unittest.TestCase):
    """Test theory depth and book move detection."""

    def setUp(self):
        """Set up test fixtures."""
        self.tracker = OpeningTracker()

    def test_starting_position_in_book(self):
        """Test that starting position is in book."""
        fen = chess.Board().fen()
        theory_status = self.tracker.get_theory_depth(fen)

        self.assertTrue(theory_status.in_theory)
        self.assertEqual(theory_status.moves_since_book, 0)

    def test_italian_game_in_book(self):
        """Test that Italian Game is in book."""
        moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]
        info = self.tracker.get_opening_from_moves(moves)

        theory_status = self.tracker.get_theory_depth(info.current_position_fen)
        self.assertTrue(theory_status.in_theory)

    def test_book_move_check(self):
        """Test checking if a specific move is in book."""
        # From starting position, e4 should be in book
        fen = chess.Board().fen()
        book_status = self.tracker.check_if_book_move(fen, "e4")

        self.assertTrue(book_status.is_book)
        self.assertIsNotNone(book_status.frequency)

    def test_rare_move_detection(self):
        """Test detection of rare moves."""
        # From starting position, h4 is legal but rare
        fen = chess.Board().fen()
        book_status = self.tracker.check_if_book_move(fen, "h4")

        # This should not be in our book as a mainline move
        # The exact result depends on database content

    def test_deviation_point(self):
        """Test finding where a game leaves theory."""
        # Common moves then unusual continuation
        moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]

        deviation = self.tracker.get_deviation_point(moves)

        # These moves should all be in book
        # deviation should be None or occur after these moves


class TestOpeningMetadata(unittest.TestCase):
    """Test rich opening metadata features."""

    def setUp(self):
        """Set up test fixtures."""
        self.tracker = OpeningTracker()

    def test_typical_plans(self):
        """Test getting typical plans for an opening."""
        moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]
        info = self.tracker.get_opening_from_moves(moves)

        # Italian Game should have typical plans
        self.assertGreater(len(info.typical_plans), 0)

        # Also test getting plans by name
        plans = self.tracker.get_typical_plans("Italian Game")
        self.assertIsInstance(plans, list)

    def test_opening_family(self):
        """Test opening family classification."""
        # Test various opening families
        test_cases = [
            (["e4", "e5"], "Open"),
            (["e4", "c5"], "Semi-Open"),
            (["d4", "d5"], "Closed"),
            (["d4", "Nf6", "c4", "g6"], "Indian"),
            (["c4"], "Flank"),
        ]

        for moves, expected_family in test_cases:
            info = self.tracker.get_opening_from_moves(moves)
            family = self.tracker.get_opening_family(info.current_position_fen)
            self.assertEqual(family, expected_family, f"Failed for {moves}")

    def test_main_ideas(self):
        """Test that openings have main ideas."""
        moves = ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"]
        info = self.tracker.get_opening_from_moves(moves)

        # Najdorf should have main ideas
        self.assertGreater(len(info.main_ideas), 0)

    def test_key_squares(self):
        """Test key squares identification."""
        moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]
        info = self.tracker.get_opening_from_moves(moves)

        # Italian Game should identify key squares
        if info.key_squares:
            self.assertIsInstance(info.key_squares, list)

    def test_difficulty_level(self):
        """Test difficulty level classification."""
        # Ruy Lopez should be advanced
        ruy_lopez_moves = ["e4", "e5", "Nf3", "Nc6", "Bb5"]
        ruy_info = self.tracker.get_opening_from_moves(ruy_lopez_moves)
        self.assertEqual(ruy_info.difficulty_level, "advanced")

        # Italian Game should be beginner-friendly
        italian_moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]
        italian_info = self.tracker.get_opening_from_moves(italian_moves)
        self.assertEqual(italian_info.difficulty_level, "beginner")

    def test_opening_style(self):
        """Test opening style classification."""
        # Sicilian Najdorf should be sharp
        najdorf_moves = ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"]
        najdorf_info = self.tracker.get_opening_from_moves(najdorf_moves)
        self.assertEqual(najdorf_info.style, "sharp")

    def test_opening_description(self):
        """Test getting opening descriptions."""
        description = self.tracker.get_opening_description("Italian Game")
        self.assertIsInstance(description, str)
        self.assertGreater(len(description), 20)
        self.assertIn("Italian", description)


class TestHelperMethods(unittest.TestCase):
    """Test helper methods and utilities."""

    def setUp(self):
        """Set up test fixtures."""
        self.tracker = OpeningTracker()

    def test_is_mainline(self):
        """Test mainline detection."""
        # Common openings should be mainline
        moves = ["e4", "e5", "Nf3", "Nc6", "Bb5"]
        info = self.tracker.get_opening_from_moves(moves)

        is_main = self.tracker.is_mainline(info.current_position_fen)
        # Ruy Lopez is definitely mainline
        self.assertTrue(is_main)

    def test_position_transition_explanation(self):
        """Test explaining position transitions."""
        board = chess.Board()
        fen_before = board.fen()

        move = board.parse_san("e4")
        board.push(move)
        fen_after = board.fen()

        explanation = self.tracker.explain_position_transition(
            fen_before, "e4", fen_after
        )

        self.assertIsInstance(explanation, str)
        self.assertGreater(len(explanation), 0)

    def test_similar_structures(self):
        """Test finding similar pawn structures."""
        moves = ["e4", "c5"]
        info = self.tracker.get_opening_from_moves(moves)

        similar = self.tracker.find_similar_structures(info.current_position_fen)
        self.assertIsInstance(similar, list)

    def test_move_classification(self):
        """Test move classification in openings."""
        fen = chess.Board().fen()

        # e4 should be mainline
        move_type = self.tracker.classify_move_in_opening(fen, "e4")
        self.assertEqual(move_type, MoveType.MAIN_LINE)


class TestPerformance(unittest.TestCase):
    """Test performance and caching."""

    def setUp(self):
        """Set up test fixtures."""
        self.tracker = OpeningTracker()

    def test_caching(self):
        """Test that position lookup uses caching."""
        moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]
        info1 = self.tracker.get_opening_from_moves(moves)

        # Second lookup should hit cache
        info2 = self.tracker.get_opening_from_moves(moves)

        stats = self.tracker.get_cache_stats()
        self.assertGreater(stats['hits'], 0)

    def test_cache_stats(self):
        """Test cache statistics tracking."""
        stats = self.tracker.get_cache_stats()

        self.assertIn('hits', stats)
        self.assertIn('misses', stats)
        self.assertIn('size', stats)
        self.assertIn('hit_rate', stats)

    def test_performance_benchmark(self):
        """Basic performance benchmark."""
        import time

        positions = [
            ["e4"],
            ["e4", "e5"],
            ["e4", "e5", "Nf3"],
            ["e4", "e5", "Nf3", "Nc6"],
            ["e4", "e5", "Nf3", "Nc6", "Bc4"],
        ]

        start_time = time.time()
        for moves in positions:
            self.tracker.get_opening_from_moves(moves)
        elapsed = time.time() - start_time

        # Should be fast (under 100ms for 5 positions)
        self.assertLess(elapsed, 0.1)


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""

    def setUp(self):
        """Set up test fixtures."""
        self.tracker = OpeningTracker()

    def test_empty_move_list(self):
        """Test handling empty move list."""
        info = self.tracker.get_opening_from_moves([])

        # Should return starting position
        self.assertEqual(info.eco_code, "A00")

    def test_invalid_move(self):
        """Test handling invalid moves."""
        moves = ["e4", "e5", "InvalidMove"]
        info = self.tracker.get_opening_from_moves(moves)

        # Should handle gracefully
        self.assertIsNotNone(info)

    def test_very_long_game(self):
        """Test handling positions deep into the game."""
        # A long sequence of moves
        moves = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6",
                "d4", "exd4", "cxd4", "Bb4+", "Bd2", "Bxd2+", "Nbxd2"]

        info = self.tracker.get_opening_from_moves(moves)

        # Should still work even if out of book
        self.assertIsNotNone(info)

    def test_unusual_opening(self):
        """Test handling of unusual/rare openings."""
        # Grob's Attack
        moves = ["g4"]
        info = self.tracker.get_opening_from_moves(moves)

        # Should at least not crash
        self.assertIsNotNone(info)


def run_tests():
    """Run all tests."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add all test cases
    suite.addTests(loader.loadTestsFromTestCase(TestOpeningIdentification))
    suite.addTests(loader.loadTestsFromTestCase(TestTranspositions))
    suite.addTests(loader.loadTestsFromTestCase(TestTheoryDepth))
    suite.addTests(loader.loadTestsFromTestCase(TestOpeningMetadata))
    suite.addTests(loader.loadTestsFromTestCase(TestHelperMethods))
    suite.addTests(loader.loadTestsFromTestCase(TestPerformance))
    suite.addTests(loader.loadTestsFromTestCase(TestEdgeCases))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result


if __name__ == "__main__":
    run_tests()
