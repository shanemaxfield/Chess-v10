"""
Usage examples for the Chess Opening Tracker system.
Demonstrates all major features and use cases.
"""

from chess_opening_tracker import OpeningTracker
import chess


def example_basic_usage():
    """Example 1: Basic opening identification."""
    print("=" * 60)
    print("Example 1: Basic Opening Identification")
    print("=" * 60)

    tracker = OpeningTracker()

    # Identify opening from moves
    moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]
    info = tracker.get_opening_from_moves(moves)

    print(f"\nMoves: {' '.join(moves)}")
    print(f"Opening: {info.full_variation_name}")
    print(f"ECO Code: {info.eco_code}")
    print(f"Family: {info.opening_family}")
    print(f"Difficulty: {info.difficulty_level}")
    print(f"Style: {info.style}")


def example_comprehensive_analysis():
    """Example 2: Comprehensive opening analysis."""
    print("\n" + "=" * 60)
    print("Example 2: Comprehensive Opening Analysis")
    print("=" * 60)

    tracker = OpeningTracker()

    # Analyze Sicilian Najdorf
    moves = ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"]
    info = tracker.get_opening_from_moves(moves)

    print(f"\nOpening: {info.full_variation_name}")
    print(f"ECO Code: {info.eco_code}")
    print(f"Difficulty: {info.difficulty_level}")
    print(f"Style: {info.style}")

    if info.main_ideas:
        print(f"\nMain Ideas:")
        for idea in info.main_ideas:
            print(f"  • {idea}")

    if info.typical_plans:
        print(f"\nTypical Plans:")
        for plan in info.typical_plans[:3]:
            print(f"  • {plan}")

    if info.key_squares:
        print(f"\nKey Squares: {', '.join(info.key_squares)}")

    if info.pawn_structure_type:
        print(f"Pawn Structure: {info.pawn_structure_type}")


def example_transposition_detection():
    """Example 3: Detecting transpositions."""
    print("\n" + "=" * 60)
    print("Example 3: Transposition Detection")
    print("=" * 60)

    tracker = OpeningTracker()

    # Italian Game via different move orders
    routes = [
        ["e4", "e5", "Nf3", "Nc6", "Bc4"],
        ["e4", "e5", "Bc4", "Nc6", "Nf3"],
    ]

    print("\nChecking if different move orders reach same position:\n")

    positions = []
    for i, route in enumerate(routes, 1):
        info = tracker.get_opening_from_moves(route)
        positions.append(tracker._normalize_fen(info.current_position_fen))

        print(f"Route {i}: {' '.join(route)}")
        print(f"  Opening: {info.opening_name}")
        print(f"  ECO: {info.eco_code}")

    if positions[0] == positions[1]:
        print("\n✓ Both routes lead to the same position (transposition detected)")

        # Find all known transpositions
        transpositions = tracker.find_transpositions(positions[0])
        print(f"\nTotal known routes to this position: {len(transpositions)}")

        if transpositions:
            info = tracker.get_opening_from_moves(routes[0])
            if info.transposition_note:
                print(f"Note: {info.transposition_note}")
    else:
        print("\n✗ Different positions")


def example_theory_tracking():
    """Example 4: Track when leaving theory."""
    print("\n" + "=" * 60)
    print("Example 4: Theory Tracking")
    print("=" * 60)

    tracker = OpeningTracker()

    # A game sequence
    game_moves = [
        "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5",  # Giuoco Piano
        "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4+"  # Main line
    ]

    print("\nTracking theory depth through the game:\n")

    for i in range(1, len(game_moves) + 1):
        moves = game_moves[:i]
        info = tracker.get_opening_from_moves(moves)
        theory = tracker.get_theory_depth(info.current_position_fen)

        status_symbol = "✓" if theory.in_theory else "✗"
        status_text = "IN BOOK" if theory.in_theory else "OUT OF BOOK"

        print(f"Move {i:2d} ({game_moves[i-1]:6s}): {status_symbol} {status_text:12s} - {info.opening_name}")

    # Find exact deviation point
    deviation = tracker.get_deviation_point(game_moves)
    if deviation:
        print(f"\n→ Left theory at move {deviation}: {game_moves[deviation-1]}")
    else:
        print(f"\n→ Still in theory after {len(game_moves)} moves")


def example_book_moves():
    """Example 5: Check if moves are in book."""
    print("\n" + "=" * 60)
    print("Example 5: Book Move Analysis")
    print("=" * 60)

    tracker = OpeningTracker()

    # Position after 1.e4 e5 2.Nf3 Nc6
    board = chess.Board()
    for move in ["e4", "e5", "Nf3", "Nc6"]:
        board.push_san(move)

    # Candidate third moves for White
    candidates = [
        ("Bc4", "Italian Game"),
        ("Bb5", "Ruy Lopez"),
        ("d4", "Scotch Game"),
        ("Nc3", "Four Knights"),
        ("d3", "Quiet Variation"),
    ]

    print("\nPosition after 1.e4 e5 2.Nf3 Nc6")
    print("\nAnalyzing candidate moves:\n")

    for move, name in candidates:
        status = tracker.check_if_book_move(board.fen(), move)

        if status.is_book:
            freq_str = f"{status.frequency*100:5.1f}%" if status.frequency else "N/A"
            type_str = status.move_type.value if status.move_type else "Unknown"
            print(f"{move:4s} ({name:20s}): ✓ {freq_str} - {type_str.upper()}")
        else:
            print(f"{move:4s} ({name:20s}): ✗ Not in book")


def example_opening_family():
    """Example 6: Opening family classification."""
    print("\n" + "=" * 60)
    print("Example 6: Opening Family Classification")
    print("=" * 60)

    tracker = OpeningTracker()

    openings = [
        (["e4", "e5"], "King's Pawn Game"),
        (["e4", "c5"], "Sicilian Defense"),
        (["d4", "d5"], "Queen's Pawn Game"),
        (["d4", "Nf6", "c4", "g6"], "King's Indian Setup"),
        (["c4"], "English Opening"),
        (["Nf3"], "Réti Opening"),
    ]

    print("\nOpening Family Classification:\n")

    for moves, name in openings:
        info = tracker.get_opening_from_moves(moves)
        family = tracker.get_opening_family(info.current_position_fen)

        print(f"{name:25s} → {family}")


def example_teaching_recommendations():
    """Example 7: Opening recommendations for teaching."""
    print("\n" + "=" * 60)
    print("Example 7: Teaching Recommendations")
    print("=" * 60)

    tracker = OpeningTracker()

    # Check various openings for suitability
    openings = [
        ["e4", "e5", "Nf3", "Nc6", "Bc4"],  # Italian
        ["e4", "e5", "Nf3", "Nc6", "Bb5"],  # Ruy Lopez
        ["d4", "d5", "c4"],                  # Queen's Gambit
        ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],  # Najdorf
    ]

    print("\nRecommendations by Difficulty Level:\n")

    for moves in openings:
        info = tracker.get_opening_from_moves(moves)

        # Recommendation based on difficulty
        if info.difficulty_level == "beginner":
            recommendation = "✓ RECOMMENDED for beginners"
        elif info.difficulty_level == "intermediate":
            recommendation = "○ Good for intermediate players"
        else:
            recommendation = "△ Advanced players only"

        print(f"{info.opening_name}")
        print(f"  Difficulty: {info.difficulty_level}")
        print(f"  Style: {info.style}")
        print(f"  {recommendation}")

        # Get description
        description = tracker.get_opening_description(info.opening_name)
        print(f"  {description[:70]}...")
        print()


def example_similar_structures():
    """Example 8: Find similar pawn structures."""
    print("\n" + "=" * 60)
    print("Example 8: Similar Pawn Structures")
    print("=" * 60)

    tracker = OpeningTracker()

    # Analyze a position
    moves = ["e4", "c5"]
    info = tracker.get_opening_from_moves(moves)

    print(f"\nAnalyzing: {info.opening_name}")
    print(f"Pawn Structure: {info.pawn_structure_type}")

    # Find similar structures
    similar = tracker.find_similar_structures(info.current_position_fen)

    if similar:
        print(f"\nOpenings with similar pawn structures:")
        for opening in similar[:5]:  # Show first 5
            print(f"  • {opening}")
    else:
        print("\nNo similar structures found in database")


def example_position_transitions():
    """Example 9: Explain position transitions."""
    print("\n" + "=" * 60)
    print("Example 9: Position Transition Explanations")
    print("=" * 60)

    tracker = OpeningTracker()

    # Start from a position and make moves
    board = chess.Board()
    moves = ["e4", "e5", "Nf3", "Nc6", "Bc4"]

    print("\nTracking opening changes:\n")

    for i, move_str in enumerate(moves):
        fen_before = board.fen()
        move = board.parse_san(move_str)
        board.push(move)
        fen_after = board.fen()

        explanation = tracker.explain_position_transition(fen_before, move_str, fen_after)
        print(f"Move {i+1}. {move_str:6s}: {explanation}")


def example_performance_benchmark():
    """Example 10: Performance benchmark."""
    print("\n" + "=" * 60)
    print("Example 10: Performance Benchmark")
    print("=" * 60)

    import time

    tracker = OpeningTracker()

    # Test positions
    test_positions = [
        ["e4"],
        ["e4", "e5"],
        ["e4", "e5", "Nf3"],
        ["e4", "e5", "Nf3", "Nc6"],
        ["e4", "e5", "Nf3", "Nc6", "Bc4"],
        ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
        ["d4", "Nf6", "c4", "g6", "Nc3"],
        ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4"],
    ]

    print(f"\nBenchmarking {len(test_positions)} positions...\n")

    # First pass (cache misses)
    start = time.time()
    for moves in test_positions:
        tracker.get_opening_from_moves(moves)
    first_pass = time.time() - start

    # Second pass (cache hits)
    start = time.time()
    for moves in test_positions:
        tracker.get_opening_from_moves(moves)
    second_pass = time.time() - start

    # Stats
    stats = tracker.get_cache_stats()

    print(f"First pass (no cache):  {first_pass*1000:.2f}ms ({first_pass*1000/len(test_positions):.2f}ms per position)")
    print(f"Second pass (cached):   {second_pass*1000:.2f}ms ({second_pass*1000/len(test_positions):.2f}ms per position)")
    print(f"\nSpeedup: {first_pass/second_pass:.1f}x faster with cache")

    print(f"\nCache Statistics:")
    print(f"  Hits: {stats['hits']}")
    print(f"  Misses: {stats['misses']}")
    print(f"  Hit Rate: {stats['hit_rate']:.1%}")
    print(f"  Cache Size: {stats['size']} positions")


def run_all_examples():
    """Run all examples."""
    examples = [
        example_basic_usage,
        example_comprehensive_analysis,
        example_transposition_detection,
        example_theory_tracking,
        example_book_moves,
        example_opening_family,
        example_teaching_recommendations,
        example_similar_structures,
        example_position_transitions,
        example_performance_benchmark,
    ]

    for example_func in examples:
        example_func()
        input("\nPress Enter to continue to next example...")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Chess Opening Tracker - Usage Examples")
    print("=" * 60)

    run_all_examples()

    print("\n" + "=" * 60)
    print("All examples completed!")
    print("=" * 60)
