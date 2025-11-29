"""
Examples demonstrating multi-intent query processing
"""

from chess_opening_system.query.multi_intent_classifier import MultiIntentClassifier
from chess_opening_system.main_multi_intent import EnhancedChessOpeningSystem
import chess


def example_1_compound_query():
    """Example: Query with multiple intents."""
    print("=" * 70)
    print("Example 1: Compound Query (Transposition + Recommendation)")
    print("=" * 70)

    classifier = MultiIntentClassifier()

    query = "Can I transpose to the Queen's Gambit Declined and what should I play at 1500 elo?"

    multi_intent = classifier.classify_multi(query)

    print(f"Query: {query}\n")
    print(f"Detected Intent Types: {[qt.value for qt in multi_intent.query_types]}")
    print(f"Primary Type: {multi_intent.primary_type.value}")
    print(f"Is Multi-Intent: {multi_intent.is_multi_intent()}")
    print(f"Target Opening: {multi_intent.target_opening}")
    print(f"Rating Range: {multi_intent.rating_range}")
    print()


def example_2_exploration_and_explanation():
    """Example: Exploration + Explanation."""
    print("=" * 70)
    print("Example 2: Compound Query (Exploration + Explanation)")
    print("=" * 70)

    classifier = MultiIntentClassifier()

    query = "Show me popular Sicilian Defense lines and explain the main ideas"

    multi_intent = classifier.classify_multi(query)

    print(f"Query: {query}\n")
    print(f"Detected Intent Types: {[qt.value for qt in multi_intent.query_types]}")
    print(f"Primary Type: {multi_intent.primary_type.value}")
    print(f"Target Opening: {multi_intent.target_opening}")
    print()


def example_3_stats_and_recommendations():
    """Example: Statistics + Recommendations."""
    print("=" * 70)
    print("Example 3: Compound Query (Statistics + Recommendations)")
    print("=" * 70)

    classifier = MultiIntentClassifier()

    query = "How popular is the French Defense and what are good continuations?"

    multi_intent = classifier.classify_multi(query)

    print(f"Query: {query}\n")
    print(f"Detected Intent Types: {[qt.value for qt in multi_intent.query_types]}")
    print()


def example_4_enhanced_system():
    """Example: Using enhanced system with multi-intent."""
    print("=" * 70)
    print("Example 4: Full System with Multi-Intent Processing")
    print("=" * 70)

    system = EnhancedChessOpeningSystem()

    # Compound query
    query = "Can I transpose to the Italian Game and what should I play at 1600 elo?"

    result = system.process_query(query, use_multi_intent=True)

    print(f"Query: {query}\n")
    print(f"Query Types Detected: {result['query_types']}")
    print(f"Primary Type: {result['primary_type']}")
    print(f"Is Multi-Intent: {result['is_multi_intent']}")
    print(f"\nContext Data Keys: {list(result['context_data'].keys())}")

    # Show what data was fetched for each intent
    if 'transposition_paths' in result['context_data']:
        paths = result['context_data']['transposition_paths']
        print(f"\n✓ Transposition data: {len(paths)} path(s) found")

    if 'move_recommendations' in result['context_data']:
        recs = result['context_data']['move_recommendations']
        print(f"✓ Recommendation data: {len(recs)} move(s)")

    print(f"\nPrompt length: {len(result['prompt'])} characters")
    print("\n--- Prompt Preview ---")
    print(result['prompt'][:500] + "...\n")


def example_5_query_splitting():
    """Example: Splitting compound queries."""
    print("=" * 70)
    print("Example 5: Query Splitting")
    print("=" * 70)

    classifier = MultiIntentClassifier()

    complex_query = "Can I transpose to the Ruy Lopez, and what are the statistics, and show me variations"

    # Split into sub-queries
    sub_queries = classifier.split_compound_query(complex_query)

    print(f"Original Query:\n  {complex_query}\n")
    print(f"Split into {len(sub_queries)} sub-queries:")
    for i, sq in enumerate(sub_queries, 1):
        print(f"  {i}. {sq}")

    print("\nClassifying each sub-query:")
    for i, sq in enumerate(sub_queries, 1):
        intent = classifier.classify(sq)
        print(f"  {i}. {sq}")
        print(f"     → {intent.query_type.value}")
    print()


def example_6_comparison():
    """Example: Single vs Multi-Intent."""
    print("=" * 70)
    print("Example 6: Single-Intent vs Multi-Intent Comparison")
    print("=" * 70)

    classifier = MultiIntentClassifier()

    query = "What should I play and can I transpose to the Sicilian?"

    # Single-intent (legacy)
    single_intent = classifier.classify(query)
    print(f"Query: {query}\n")
    print("SINGLE-INTENT MODE (Legacy):")
    print(f"  Type: {single_intent.query_type.value}")
    print(f"  ❌ Only handles first match, ignores transposition!\n")

    # Multi-intent (new)
    multi_intent = classifier.classify_multi(query)
    print("MULTI-INTENT MODE (Enhanced):")
    print(f"  Types: {[qt.value for qt in multi_intent.query_types]}")
    print(f"  ✓ Handles BOTH recommendation AND transposition!")
    print()


def example_7_triple_intent():
    """Example: Query with 3+ intents."""
    print("=" * 70)
    print("Example 7: Triple-Intent Query")
    print("=" * 70)

    classifier = MultiIntentClassifier()

    query = "Show me Sicilian lines, explain the ideas, and give me statistics"

    multi_intent = classifier.classify_multi(query)

    print(f"Query: {query}\n")
    print(f"Detected {len(multi_intent.query_types)} intent types:")
    for i, qt in enumerate(multi_intent.query_types, 1):
        print(f"  {i}. {qt.value}")

    print(f"\nPriority Order:")
    print(f"  Primary: {multi_intent.primary_type.value}")
    print(f"  (Most specific intent is prioritized)")
    print()


def example_8_integration_code():
    """Example: How to integrate multi-intent in your app."""
    print("=" * 70)
    print("Example 8: Integration Code Sample")
    print("=" * 70)

    code = '''
# In your React/TypeScript app:

async function processQuery(query: string, fen: string) {
  const response = await fetch('http://localhost:5000/api/query/multi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query,
      fen: fen,
      rating_range: [1400, 1600],
      use_multi_intent: true  // Enable multi-intent processing
    })
  });

  const data = await response.json();

  // Check if compound query
  if (data.is_multi_intent) {
    console.log(`Handling ${data.query_types.length} intents:`, data.query_types);

    // Process each type of data
    if (data.context_data.transposition_paths) {
      showTranspositionPaths(data.context_data.transposition_paths);
    }

    if (data.context_data.move_recommendations) {
      showRecommendations(data.context_data.move_recommendations);
    }

    if (data.context_data.statistics) {
      showStatistics(data.context_data.statistics);
    }
  } else {
    // Single intent - process normally
    processSingleIntent(data);
  }
}
'''

    print("Integration Example:\n")
    print(code)


def main():
    """Run all examples."""
    examples = [
        example_1_compound_query,
        example_2_exploration_and_explanation,
        example_3_stats_and_recommendations,
        example_4_enhanced_system,
        example_5_query_splitting,
        example_6_comparison,
        example_7_triple_intent,
        example_8_integration_code,
    ]

    print("\n" + "=" * 70)
    print("MULTI-INTENT QUERY PROCESSING - EXAMPLES")
    print("=" * 70 + "\n")

    for i, example_func in enumerate(examples, 1):
        try:
            example_func()
        except Exception as e:
            print(f"\nError in example {i}: {e}\n")

    print("=" * 70)
    print("All examples completed!")
    print("=" * 70)


if __name__ == "__main__":
    main()
