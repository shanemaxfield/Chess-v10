"""
LLM Response Parser
Parses LLM responses and converts them to UI commands
"""

import json
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class VariationButton:
    """Represents a clickable variation button."""
    label: str
    moves: List[str]  # SAN notation
    description: Optional[str] = None


@dataclass
class UICommands:
    """UI commands to execute on the chess board."""
    highlight_squares: List[str] = None
    show_arrows: List[List[str]] = None  # List of [from_square, to_square]
    variation_buttons: List[VariationButton] = None
    moves_to_play: List[str] = None  # Moves to actually make on the board

    def __post_init__(self):
        if self.highlight_squares is None:
            self.highlight_squares = []
        if self.show_arrows is None:
            self.show_arrows = []
        if self.variation_buttons is None:
            self.variation_buttons = []
        if self.moves_to_play is None:
            self.moves_to_play = []

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            'highlight_squares': self.highlight_squares,
            'show_arrows': self.show_arrows,
            'variation_buttons': [
                {
                    'label': btn.label,
                    'moves': btn.moves,
                    'description': btn.description
                }
                for btn in self.variation_buttons
            ],
            'moves_to_play': self.moves_to_play
        }


@dataclass
class ParsedResponse:
    """Parsed LLM response."""
    explanation: str
    moves: List[str] = None
    variations: List[Dict] = None
    ui_commands: UICommands = None
    raw_response: str = ""

    def __post_init__(self):
        if self.moves is None:
            self.moves = []
        if self.variations is None:
            self.variations = []
        if self.ui_commands is None:
            self.ui_commands = UICommands()


class ResponseParser:
    """
    Parses LLM responses and extracts structured data.
    Handles various response formats and error cases.
    """

    def __init__(self):
        """Initialize response parser."""
        pass

    def parse(self, llm_response: str) -> ParsedResponse:
        """
        Parse LLM response.

        Args:
            llm_response: Raw response from LLM

        Returns:
            ParsedResponse object
        """
        # Try to parse as JSON
        parsed_json = self._extract_json(llm_response)

        if parsed_json:
            return self._parse_json_response(parsed_json, llm_response)
        else:
            # Fallback to text parsing
            return self._parse_text_response(llm_response)

    def _extract_json(self, text: str) -> Optional[Dict]:
        """Extract JSON from text (handles markdown code blocks)."""
        # Try direct JSON parse
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass

        # Try to extract from markdown code block
        json_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
        match = re.search(json_pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to find JSON object in text
        json_obj_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.finditer(json_obj_pattern, text, re.DOTALL)

        for match in matches:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                continue

        return None

    def _parse_json_response(self, json_data: Dict, raw: str) -> ParsedResponse:
        """Parse JSON-formatted response."""
        explanation = json_data.get('explanation', '')
        moves = json_data.get('moves', [])
        variations = json_data.get('variations', [])

        # Parse UI commands
        ui_data = json_data.get('ui_commands', {})
        ui_commands = UICommands(
            highlight_squares=ui_data.get('highlight_squares', []),
            show_arrows=ui_data.get('show_arrows', []),
            variation_buttons=[
                VariationButton(
                    label=btn.get('label', ''),
                    moves=btn.get('moves', []),
                    description=btn.get('description')
                )
                for btn in ui_data.get('variation_buttons', [])
            ],
            moves_to_play=moves[:1] if moves else []  # First move to play
        )

        return ParsedResponse(
            explanation=explanation,
            moves=moves,
            variations=variations,
            ui_commands=ui_commands,
            raw_response=raw
        )

    def _parse_text_response(self, text: str) -> ParsedResponse:
        """Parse plain text response (fallback)."""
        # Extract moves from text (simple pattern matching)
        moves = self._extract_moves_from_text(text)

        ui_commands = UICommands(
            highlight_squares=moves[:5] if moves else [],
            moves_to_play=moves[:1] if moves else []
        )

        return ParsedResponse(
            explanation=text,
            moves=moves,
            ui_commands=ui_commands,
            raw_response=text
        )

    def _extract_moves_from_text(self, text: str) -> List[str]:
        """Extract chess moves from plain text."""
        # Pattern for chess moves in algebraic notation
        move_pattern = r'\b([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|O-O(?:-O)?)\b'
        matches = re.findall(move_pattern, text)

        return matches[:10]  # Limit to 10 moves

    def to_board_actions(self, parsed: ParsedResponse) -> Dict[str, Any]:
        """
        Convert parsed response to board action format.
        Compatible with existing llmServiceEnhanced.ts format.

        Args:
            parsed: ParsedResponse object

        Returns:
            Dictionary in board_actions format
        """
        # Convert moves to from/to format (simplified - would need chess library)
        move_actions = []
        for move in parsed.ui_commands.moves_to_play:
            # This is a placeholder - in real implementation would parse move
            move_actions.append({
                "from": "",  # Would need to calculate from move
                "to": ""
            })

        # Convert arrows
        arrows = []
        for arrow in parsed.ui_commands.show_arrows:
            if len(arrow) >= 2:
                arrows.append({
                    "from": arrow[0],
                    "to": arrow[1],
                    "color": "green"
                })

        # Convert highlights
        highlights = []
        if parsed.ui_commands.highlight_squares:
            highlights.append({
                "squares": parsed.ui_commands.highlight_squares,
                "color": "yellow"
            })

        return {
            "board_actions": {
                "moves": move_actions,
                "arrows": arrows,
                "highlights": highlights,
                "clear_previous": True
            },
            "chat_response": {
                "message": parsed.explanation,
                "follow_ups": [
                    btn.label for btn in parsed.ui_commands.variation_buttons[:3]
                ]
            }
        }

    def format_variations_for_ui(self, variations: List[Dict]) -> List[Dict]:
        """
        Format variations for UI display.

        Args:
            variations: List of variation dictionaries

        Returns:
            Formatted variations
        """
        formatted = []

        for var in variations:
            formatted.append({
                'name': var.get('opening', 'Variation'),
                'moves': var.get('continuation', '').split(),
                'evaluation': var.get('evaluation', 0.0),
                'popularity': var.get('popularity', 0.0),
                'description': var.get('description', '')
            })

        return formatted


class ResponseValidator:
    """Validates LLM responses."""

    @staticmethod
    def validate(parsed: ParsedResponse) -> tuple[bool, List[str]]:
        """
        Validate parsed response.

        Args:
            parsed: ParsedResponse object

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        if not parsed.explanation:
            errors.append("Missing explanation")

        # Validate moves format (basic check)
        for move in parsed.moves:
            if not isinstance(move, str):
                errors.append(f"Invalid move format: {move}")

        # Validate UI commands
        if parsed.ui_commands:
            for square in parsed.ui_commands.highlight_squares:
                if not re.match(r'^[a-h][1-8]$', square):
                    errors.append(f"Invalid square: {square}")

            for arrow in parsed.ui_commands.show_arrows:
                if len(arrow) != 2:
                    errors.append(f"Invalid arrow format: {arrow}")

        return (len(errors) == 0, errors)


# Convenience functions

def parse_llm_response(response: str) -> ParsedResponse:
    """
    Parse LLM response.

    Args:
        response: Raw LLM response

    Returns:
        ParsedResponse object
    """
    parser = ResponseParser()
    return parser.parse(response)


def response_to_board_actions(response: str) -> Dict[str, Any]:
    """
    Convert LLM response to board actions.

    Args:
        response: Raw LLM response

    Returns:
        Board actions dictionary
    """
    parser = ResponseParser()
    parsed = parser.parse(response)
    return parser.to_board_actions(parsed)


def validate_response(response: str) -> tuple[bool, List[str]]:
    """
    Validate LLM response.

    Args:
        response: Raw LLM response

    Returns:
        Tuple of (is_valid, errors)
    """
    parser = ResponseParser()
    parsed = parser.parse(response)
    return ResponseValidator.validate(parsed)
