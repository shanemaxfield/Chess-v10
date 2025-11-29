"""
LLM Prompt Builder
Formats chess opening data into structured prompts for the LLM
"""

from typing import Dict, List, Optional, Any
import json

from ..query.intent_classifier import QueryIntent, QueryType
from ..query.transposition import TranspositionPath
from ..query.recommendations import MoveRecommendation, OpeningRecommendation
from ..data.statistics import AggregatedStats


class PromptBuilder:
    """
    Builds structured prompts for the LLM with chess opening context.
    """

    def __init__(self):
        """Initialize prompt builder."""
        pass

    def build_prompt(self, query_intent: QueryIntent,
                    context_data: Dict[str, Any]) -> str:
        """
        Build a comprehensive prompt for the LLM.

        Args:
            query_intent: Parsed query intent
            context_data: Dictionary containing relevant chess data

        Returns:
            Formatted prompt string
        """
        prompt_parts = []

        # Add system context
        prompt_parts.append(self._build_system_context())

        # Add query type specific context
        if query_intent.query_type == QueryType.TRANSPOSITION:
            prompt_parts.append(self._build_transposition_context(context_data))
        elif query_intent.query_type == QueryType.EXPLORATION:
            prompt_parts.append(self._build_exploration_context(context_data))
        elif query_intent.query_type == QueryType.RECOMMENDATION:
            prompt_parts.append(self._build_recommendation_context(context_data))
        elif query_intent.query_type == QueryType.EXPLANATION:
            prompt_parts.append(self._build_explanation_context(context_data))
        elif query_intent.query_type == QueryType.STATISTICS:
            prompt_parts.append(self._build_statistics_context(context_data))

        # Add current position context
        if 'current_fen' in context_data:
            prompt_parts.append(self._build_position_context(context_data))

        # Add user query
        prompt_parts.append(f"\nUser Query: {query_intent.original_query}\n")

        # Add response format instructions
        prompt_parts.append(self._build_response_format_instructions(query_intent))

        return "\n".join(prompt_parts)

    def _build_system_context(self) -> str:
        """Build system context section."""
        return """You are a chess opening expert assistant. You have access to:
- Comprehensive opening database with ECO codes
- Position-based opening graph with transposition detection
- Statistical data from millions of games across rating ranges
- Strategic themes and typical plans for each opening

Your role is to:
1. Provide accurate opening information based on the data
2. Explain strategic ideas clearly
3. Suggest UI interactions (moves to show, variations to display)
4. NEVER hallucinate - only use provided data

CRITICAL: All chess positions, moves, and opening information below are verified and accurate.
"""

    def _build_transposition_context(self, data: Dict[str, Any]) -> str:
        """Build context for transposition queries."""
        context = ["\n=== TRANSPOSITION ANALYSIS ==="]

        transposition_paths: List[TranspositionPath] = data.get('transposition_paths', [])

        if transposition_paths:
            context.append(f"\nFound {len(transposition_paths)} path(s) to the target opening:")

            for i, path in enumerate(transposition_paths[:3], 1):
                context.append(f"\nPath {i}:")
                context.append(f"  Moves: {path.format_moves()}")
                context.append(f"  Opening: {path.opening_name}")
                context.append(f"  ECO: {path.eco_code}")
                if path.variation:
                    context.append(f"  Variation: {path.variation}")
                context.append(f"  Distance: {path.distance} moves")
                if path.evaluation is not None:
                    context.append(f"  Evaluation: {path.evaluation:+.2f}")
        else:
            context.append("\nNo transposition paths found to the target opening.")

        return "\n".join(context)

    def _build_exploration_context(self, data: Dict[str, Any]) -> str:
        """Build context for exploration queries."""
        context = ["\n=== OPENING VARIATIONS ==="]

        variations = data.get('variations', [])
        opening_info = data.get('opening_info', {})

        if opening_info:
            context.append(f"\nOpening: {opening_info.get('name', 'Unknown')}")
            context.append(f"ECO Code: {opening_info.get('eco', 'Unknown')}")

        if variations:
            context.append(f"\nPopular variations ({len(variations)}):")

            for i, var in enumerate(variations, 1):
                context.append(f"\n{i}. {var.get('name', 'Unnamed variation')}")
                context.append(f"   Moves: {var.get('moves', '')}")
                if 'key_ideas' in var and var['key_ideas']:
                    context.append(f"   Key ideas: {', '.join(var['key_ideas'])}")
                if 'popularity' in var:
                    context.append(f"   Popularity: {var['popularity']*100:.1f}%")

        return "\n".join(context)

    def _build_recommendation_context(self, data: Dict[str, Any]) -> str:
        """Build context for recommendation queries."""
        context = ["\n=== MOVE RECOMMENDATIONS ==="]

        recommendations: List[MoveRecommendation] = data.get('move_recommendations', [])
        rating_range = data.get('rating_range', (1400, 1800))

        context.append(f"\nRating range: {rating_range[0]}-{rating_range[1]}")

        if recommendations:
            context.append(f"\nTop {len(recommendations)} recommended moves:")

            for i, rec in enumerate(recommendations, 1):
                context.append(f"\n{i}. {rec.move_san}")
                context.append(f"   Popularity: {rec.popularity*100:.1f}%")
                context.append(f"   White's score: {rec.win_rate:.1f}%")
                context.append(f"   Games: {rec.games_count}")
                if rec.opening_name:
                    context.append(f"   Leads to: {rec.opening_name}")
                if rec.key_ideas:
                    context.append(f"   Ideas: {', '.join(rec.key_ideas[:3])}")
                context.append(f"   Reason: {rec.reason}")

        return "\n".join(context)

    def _build_explanation_context(self, data: Dict[str, Any]) -> str:
        """Build context for explanation queries."""
        context = ["\n=== OPENING EXPLANATION ==="]

        opening_info = data.get('opening_info', {})
        strategic_themes = data.get('strategic_themes', [])
        typical_plans = data.get('typical_plans', {})

        if opening_info:
            context.append(f"\nOpening: {opening_info.get('name', 'Unknown')}")
            context.append(f"ECO Code: {opening_info.get('eco', 'Unknown')}")
            if opening_info.get('variation'):
                context.append(f"Variation: {opening_info.get('variation')}")

        if strategic_themes:
            context.append(f"\nStrategic Themes:")
            for theme in strategic_themes:
                context.append(f"  - {theme}")

        if typical_plans:
            for side, plans in typical_plans.items():
                context.append(f"\nTypical plans for {side}:")
                for plan in plans:
                    context.append(f"  - {plan}")

        return "\n".join(context)

    def _build_statistics_context(self, data: Dict[str, Any]) -> str:
        """Build context for statistics queries."""
        context = ["\n=== STATISTICAL DATA ==="]

        stats: Optional[AggregatedStats] = data.get('statistics')

        if stats:
            context.append(f"\nTotal games: {stats.total_games}")
            context.append(f"White wins: {stats.white_win_rate:.1f}%")
            context.append(f"Draws: {stats.draw_rate:.1f}%")
            context.append(f"Black wins: {stats.black_win_rate:.1f}%")
            context.append(f"Data sources: {', '.join(stats.sources)}")

        # Rating breakdown
        rating_stats = data.get('rating_breakdown', {})
        if rating_stats:
            context.append("\nBreakdown by rating:")
            for range_key, range_stats in rating_stats.items():
                context.append(f"\n  {range_key}:")
                context.append(f"    Games: {range_stats.total_games}")
                context.append(f"    White: {range_stats.white_win_rate:.1f}%")

        return "\n".join(context)

    def _build_position_context(self, data: Dict[str, Any]) -> str:
        """Build current position context."""
        context = ["\n=== CURRENT POSITION ==="]

        fen = data.get('current_fen', '')
        position_info = data.get('current_position_info', {})

        context.append(f"\nFEN: {fen}")

        if position_info:
            if position_info.get('openings'):
                openings = position_info['openings']
                context.append(f"Classification: {openings[0]['name']}")
                context.append(f"ECO Code: {openings[0]['eco']}")

        return "\n".join(context)

    def _build_response_format_instructions(self, query_intent: QueryIntent) -> str:
        """Build response format instructions."""
        instructions = """\n=== RESPONSE FORMAT ===

You must respond with valid JSON in this exact format:

{
  "explanation": "Your natural language explanation here",
  "moves": ["e4", "d4"],  // Moves to highlight on the board
  "variations": [
    {
      "move": "e4",
      "continuation": "e5 Nf3 Nc6",  // Next moves in the line
      "opening": "Italian Game",
      "popularity": 0.35,
      "evaluation": 0.3,
      "description": "Brief description"
    }
  ],
  "ui_commands": {
    "highlight_squares": ["e4", "d4"],  // Squares to highlight
    "show_arrows": [["e2", "e4"]],  // Arrows to draw
    "variation_buttons": [
      {
        "label": "Main Line",
        "moves": ["e4", "e5", "Nf3"]
      }
    ]
  }
}

Instructions:
- explanation: Concise, educational response (2-4 sentences)
- moves: List of move suggestions in algebraic notation
- variations: Detailed variation data with continuations
- ui_commands: Visual elements to display on the chess board

IMPORTANT: Return ONLY valid JSON. No markdown code blocks, no extra text.
"""

        return instructions

    def format_for_json_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format data as JSON response structure.

        Args:
            data: Data to format

        Returns:
            Dictionary ready for JSON serialization
        """
        return {
            "explanation": data.get("explanation", ""),
            "moves": data.get("moves", []),
            "variations": data.get("variations", []),
            "ui_commands": data.get("ui_commands", {
                "highlight_squares": [],
                "show_arrows": [],
                "variation_buttons": []
            })
        }


# Convenience functions

def build_transposition_prompt(query: str, transposition_paths: List[TranspositionPath],
                               current_fen: str) -> str:
    """
    Build prompt for transposition query.

    Args:
        query: User query
        transposition_paths: Found transposition paths
        current_fen: Current position FEN

    Returns:
        Formatted prompt
    """
    from ..query.intent_classifier import QueryIntent, QueryType

    intent = QueryIntent(
        query_type=QueryType.TRANSPOSITION,
        original_query=query
    )

    context_data = {
        'transposition_paths': transposition_paths,
        'current_fen': current_fen
    }

    builder = PromptBuilder()
    return builder.build_prompt(intent, context_data)


def build_recommendation_prompt(query: str, recommendations: List[MoveRecommendation],
                               rating_range: tuple, current_fen: str) -> str:
    """
    Build prompt for recommendation query.

    Args:
        query: User query
        recommendations: Move recommendations
        rating_range: Rating range
        current_fen: Current position FEN

    Returns:
        Formatted prompt
    """
    from ..query.intent_classifier import QueryIntent, QueryType

    intent = QueryIntent(
        query_type=QueryType.RECOMMENDATION,
        original_query=query,
        rating_range=rating_range
    )

    context_data = {
        'move_recommendations': recommendations,
        'rating_range': rating_range,
        'current_fen': current_fen
    }

    builder = PromptBuilder()
    return builder.build_prompt(intent, context_data)
