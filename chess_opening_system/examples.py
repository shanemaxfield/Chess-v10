"""
Example usage of the Chess Opening Knowledge System
"""

import chess
from chess_opening_system import create_opening_system


def example_1_basic_query():
    """Example 1: Basic opening query processing."""
    print("=" * 60)
    print("Example 1: Basic Opening Query")
    print("=" * 60)

    system = create_opening_system()

    query = "What are the main ideas in the Italian Game?"
    result = system.process_query(query)

    print(f"Query: {query}")
    print(f"Query Type: {result['query_type']}")
    print(f"Rating Range: {result['rating_range']}")
    print("\nGenerated Prompt Preview:")
    print(result['prompt'][:500] + "...\n")


def example_2_transposition_check():
    """Example 2: Check transposition possibilities."""
    print("=" * 60)
    print("Example 2: Transposition Detection")
    print("=" * 60)

    system = create_opening_system()

    # Current position after 1.e4 e5 2.Nf3 Nc6 3.Bc4
    board = chess.Board()
    board.push_san("e4")
    board.push_san("e5")
    board.push_san("Nf3")
    board.push_san("Nc6")
    board.push_san("Bc4")

    query = "Can I transpose to the Two Knights Defense?"
    result = system.process_query(query, current_fen=board.fen())

    print(f"Query: {query}")
    print(f"Current Position: {board.fen()}")
    print(f"Query Type: {result['query_type']}")

    context = result.get('context_data', {})
    paths = context.get('transposition_paths', [])

    if paths:
        print(f"\nFound {len(paths)} transposition path(s):")
        for i, path in enumerate(paths[:3], 1):
            print(f"\nPath {i}:")
            print(f"  Moves: {path.format_moves()}")
            print(f"  Target: {path.opening_name}")
            print(f"  Distance: {path.distance} moves")
    else:
        print("\nNo transposition paths found.")


def example_3_move_recommendations():
    """Example 3: Get move recommendations."""
    print("=" * 60)
    print("Example 3: Move Recommendations")
    print("=" * 60)

    system = create_opening_system()

    query = "What should I play at 1500 elo?"
    rating_range = (1400, 1600)

    result = system.process_query(query, rating_range=rating_range)

    print(f"Query: {query}")
    print(f"Rating Range: {rating_range}")
    print(f"Query Type: {result['query_type']}")

    context = result.get('context_data', {})
    recommendations = context.get('move_recommendations', [])

    if recommendations:
        print(f"\nTop {len(recommendations)} recommended moves:")
        for i, rec in enumerate(recommendations, 1):
            print(f"\n{i}. {rec.move_san}")
            print(f"   Popularity: {rec.popularity*100:.1f}%")
            print(f"   Expected score: {rec.win_rate:.1f}%")
            print(f"   Reason: {rec.reason}")


def example_4_opening_exploration():
    """Example 4: Explore opening variations."""
    print("=" * 60)
    print("Example 4: Opening Exploration")
    print("=" * 60)

    system = create_opening_system()

    query = "Show me popular Sicilian Defense lines at 1600 elo"
    result = system.process_query(query, rating_range=(1500, 1700))

    print(f"Query: {query}")
    print(f"Query Type: {result['query_type']}")

    context = result.get('context_data', {})
    variations = context.get('variations', [])

    if variations:
        print(f"\nFound {len(variations)} variations:")
        for i, var in enumerate(variations, 1):
            print(f"\n{i}. {var.get('name', 'Variation')}")
            print(f"   Moves: {var.get('moves', '')}")
            print(f"   Popularity: {var.get('popularity', 0)*100:.1f}%")


def example_5_statistics():
    """Example 5: Get opening statistics."""
    print("=" * 60)
    print("Example 5: Opening Statistics")
    print("=" * 60)

    system = create_opening_system()

    query = "How popular is the French Defense?"
    result = system.process_query(query)

    print(f"Query: {query}")
    print(f"Query Type: {result['query_type']}")

    context = result.get('context_data', {})
    stats = context.get('statistics')

    if stats:
        print(f"\nStatistics:")
        print(f"  Total games: {stats.total_games}")
        print(f"  White wins: {stats.white_win_rate:.1f}%")
        print(f"  Draws: {stats.draw_rate:.1f}%")
        print(f"  Black wins: {stats.black_win_rate:.1f}%")
        print(f"  Sources: {', '.join(stats.sources)}")


def example_6_build_position_graph():
    """Example 6: Build position graph from Lichess."""
    print("=" * 60)
    print("Example 6: Build Position Graph")
    print("=" * 60)

    system = create_opening_system()

    # Build a small position graph (100 positions for demo)
    print("Building position graph from Lichess API...")
    print("(This may take a few minutes)\n")

    system.build_position_graph_from_lichess(max_positions=100)

    # Show statistics
    stats = system.get_statistics()
    print("\nSystem Statistics:")
    print(f"  Position Graph: {stats['position_graph']}")
    print(f"  ECO Parser: {stats['eco_parser']}")


def example_7_intent_classification():
    """Example 7: Query intent classification."""
    print("=" * 60)
    print("Example 7: Query Intent Classification")
    print("=" * 60)

    from chess_opening_system.query import IntentClassifier

    classifier = IntentClassifier()

    queries = [
        "Can I transpose to the Queen's Gambit?",
        "Show me popular lines in the Sicilian",
        "What should I play as White at 1500 elo?",
        "Explain the main ideas in the French Defense",
        "How popular is the King's Indian?",
        "Compare the Italian Game vs Spanish Opening"
    ]

    for query in queries:
        intent = classifier.classify(query)
        print(f"\nQuery: {query}")
        print(f"  Type: {intent.query_type.value}")
        print(f"  Target Opening: {intent.target_opening}")
        print(f"  Rating Range: {intent.rating_range}")
        print(f"  Num Variations: {intent.num_variations}")


def example_8_eco_parser():
    """Example 8: ECO code parsing."""
    print("=" * 60)
    print("Example 8: ECO Code Parsing")
    print("=" * 60)

    from chess_opening_system.data import ECOParser

    parser = ECOParser()
    parser.load_from_csv("data/ECO_codes.csv")

    print(f"Loaded {len(parser.openings)} ECO codes\n")

    # Search for openings
    search_queries = ["Sicilian", "King's Gambit", "French"]

    for query in search_queries:
        results = parser.search(query)
        print(f"Search '{query}': {len(results)} results")
        for opening in results[:3]:
            print(f"  {opening.code}: {opening.name}")
        print()


def main():
    """Run all examples."""
    examples = [
        example_1_basic_query,
        example_2_transposition_check,
        example_3_move_recommendations,
        example_4_opening_exploration,
        example_5_statistics,
        # example_6_build_position_graph,  # Commented out - takes time
        example_7_intent_classification,
        example_8_eco_parser,
    ]

    print("\n" + "=" * 60)
    print("CHESS OPENING KNOWLEDGE SYSTEM - EXAMPLES")
    print("=" * 60 + "\n")

    for i, example_func in enumerate(examples, 1):
        try:
            example_func()
            print()
        except Exception as e:
            print(f"\nError in example {i}: {e}\n")

    print("=" * 60)
    print("All examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
