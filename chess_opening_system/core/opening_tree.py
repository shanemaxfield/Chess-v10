"""
Traditional Opening Tree Structure
Hierarchical tree of opening moves with annotations
"""

from typing import List, Optional, Dict
from dataclasses import dataclass, field
import chess


@dataclass
class OpeningTreeNode:
    """Node in the opening tree representing a position in a line."""
    moves: str  # e.g., "1.e4 e5 2.Nf3"
    position_hash: str
    fen: str
    opening_name: str = ""
    eco_code: str = ""
    variation: str = ""
    key_ideas: List[str] = field(default_factory=list)
    common_structures: List[str] = field(default_factory=list)  # FENs of typical structures
    strategic_themes: List[str] = field(default_factory=list)
    typical_plans: Dict[str, List[str]] = field(default_factory=dict)  # "white": [...], "black": [...]
    critical_position: bool = False  # Is this a tabiya?
    children: List['OpeningTreeNode'] = field(default_factory=list)
    parent: Optional['OpeningTreeNode'] = None
    move_annotation: str = ""  # Annotation for the move leading to this position
    evaluation: Optional[float] = None
    popularity: float = 0.0  # 0.0 to 1.0

    def add_child(self, child: 'OpeningTreeNode'):
        """Add child node."""
        child.parent = self
        self.children.append(child)

    def get_path_from_root(self) -> List['OpeningTreeNode']:
        """Get path from root to this node."""
        path = []
        current = self
        while current:
            path.append(current)
            current = current.parent
        return list(reversed(path))

    def get_depth(self) -> int:
        """Get depth of this node in the tree."""
        depth = 0
        current = self.parent
        while current:
            depth += 1
            current = current.parent
        return depth

    def find_child_by_move(self, move: str) -> Optional['OpeningTreeNode']:
        """Find child node by move string."""
        for child in self.children:
            # Extract last move from child's move string
            child_moves = child.moves.strip().split()
            if child_moves and child_moves[-1] == move:
                return child
        return None

    def to_dict(self, include_children: bool = True, max_depth: Optional[int] = None) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {
            'moves': self.moves,
            'position_hash': self.position_hash,
            'fen': self.fen,
            'opening_name': self.opening_name,
            'eco_code': self.eco_code,
            'variation': self.variation,
            'key_ideas': self.key_ideas,
            'strategic_themes': self.strategic_themes,
            'typical_plans': self.typical_plans,
            'critical_position': self.critical_position,
            'move_annotation': self.move_annotation,
            'evaluation': self.evaluation,
            'popularity': self.popularity
        }

        if include_children and (max_depth is None or self.get_depth() < max_depth):
            result['children'] = [
                child.to_dict(include_children=True, max_depth=max_depth)
                for child in self.children
            ]

        return result


class OpeningTree:
    """
    Traditional hierarchical opening tree.
    Organized by move sequences from the starting position.
    """

    def __init__(self):
        # Root node is the starting position
        self.root = OpeningTreeNode(
            moves="",
            position_hash="",
            fen=chess.STARTING_FEN,
            opening_name="Starting Position"
        )
        self._eco_index: Dict[str, List[OpeningTreeNode]] = {}  # ECO code -> nodes
        self._name_index: Dict[str, List[OpeningTreeNode]] = {}  # Opening name -> nodes

    def add_line(self, moves: List[str], eco_code: str, opening_name: str,
                 variation: str = "", key_ideas: List[str] = None,
                 strategic_themes: List[str] = None) -> OpeningTreeNode:
        """
        Add a complete opening line to the tree.

        Args:
            moves: List of moves in SAN format ["e4", "e5", "Nf3", ...]
            eco_code: ECO code (e.g., "C50")
            opening_name: Opening name (e.g., "Italian Game")
            variation: Variation name (e.g., "Giuoco Piano")
            key_ideas: List of strategic ideas
            strategic_themes: List of themes (e.g., ["center control", "quick development"])

        Returns:
            The leaf node representing the final position
        """
        current_node = self.root
        board = chess.Board()
        move_text = ""

        for i, move_san in enumerate(moves):
            try:
                move = board.parse_san(move_san)
            except ValueError:
                raise ValueError(f"Invalid move: {move_san} in sequence {moves}")

            # Build move text
            if board.turn == chess.WHITE:
                move_num = (i // 2) + 1
                move_text += f"{move_num}.{move_san} "
            else:
                move_text += f"{move_san} "

            board.push(move)
            fen = board.fen()

            # Check if child already exists
            existing_child = current_node.find_child_by_move(move_san)

            if existing_child:
                current_node = existing_child
            else:
                # Create new node
                from .zobrist import zobrist_hash
                new_node = OpeningTreeNode(
                    moves=move_text.strip(),
                    position_hash=zobrist_hash(fen),
                    fen=fen
                )
                current_node.add_child(new_node)
                current_node = new_node

        # Set opening information on the final node
        current_node.eco_code = eco_code
        current_node.opening_name = opening_name
        current_node.variation = variation

        if key_ideas:
            current_node.key_ideas = key_ideas

        if strategic_themes:
            current_node.strategic_themes = strategic_themes

        # Index the node
        if eco_code:
            if eco_code not in self._eco_index:
                self._eco_index[eco_code] = []
            self._eco_index[eco_code].append(current_node)

        if opening_name:
            name_key = opening_name.lower()
            if name_key not in self._name_index:
                self._name_index[name_key] = []
            self._name_index[name_key].append(current_node)

        return current_node

    def get_opening_by_eco(self, eco_code: str) -> List[OpeningTreeNode]:
        """Get all nodes with the specified ECO code."""
        return self._eco_index.get(eco_code, [])

    def get_opening_by_name(self, opening_name: str) -> List[OpeningTreeNode]:
        """Get all nodes matching the opening name (case-insensitive)."""
        name_key = opening_name.lower()
        results = []

        # Exact match
        if name_key in self._name_index:
            results.extend(self._name_index[name_key])

        # Partial match
        for indexed_name, nodes in self._name_index.items():
            if name_key in indexed_name or indexed_name in name_key:
                for node in nodes:
                    if node not in results:
                        results.append(node)

        return results

    def get_node_by_moves(self, moves: List[str]) -> Optional[OpeningTreeNode]:
        """
        Navigate to a node by following a sequence of moves.

        Args:
            moves: List of moves in SAN format

        Returns:
            The node reached, or None if path doesn't exist
        """
        current_node = self.root
        board = chess.Board()

        for move_san in moves:
            try:
                move = board.parse_san(move_san)
                board.push(move)
            except ValueError:
                return None

            child = current_node.find_child_by_move(move_san)
            if not child:
                return None

            current_node = child

        return current_node

    def get_subtree(self, moves: List[str], max_depth: int = 10) -> Optional[OpeningTreeNode]:
        """
        Get a subtree starting from a position.

        Args:
            moves: Move sequence to the root of the subtree
            max_depth: Maximum depth to include

        Returns:
            Root node of the subtree
        """
        return self.get_node_by_moves(moves)

    def mark_critical_positions(self, positions: List[List[str]]):
        """
        Mark positions as critical (tabiyas).

        Args:
            positions: List of move sequences leading to critical positions
        """
        for move_sequence in positions:
            node = self.get_node_by_moves(move_sequence)
            if node:
                node.critical_position = True

    def get_all_variations(self, opening_name: str, max_depth: int = 15) -> List[OpeningTreeNode]:
        """
        Get all variations of an opening.

        Args:
            opening_name: Opening name to search for
            max_depth: Maximum depth to search

        Returns:
            List of all variation nodes
        """
        return self.get_opening_by_name(opening_name)

    def to_dict(self, max_depth: Optional[int] = None) -> dict:
        """
        Convert entire tree to dictionary.

        Args:
            max_depth: Maximum depth to serialize

        Returns:
            Dictionary representation
        """
        return {
            'root': self.root.to_dict(max_depth=max_depth),
            'statistics': {
                'total_openings': len(self._eco_index),
                'total_variations': sum(len(nodes) for nodes in self._name_index.values())
            }
        }

    def search_themes(self, themes: List[str]) -> List[OpeningTreeNode]:
        """
        Find all positions matching specific strategic themes.

        Args:
            themes: List of themes to search for

        Returns:
            List of matching nodes
        """
        results = []
        theme_set = set(t.lower() for t in themes)

        def traverse(node: OpeningTreeNode):
            node_themes = set(t.lower() for t in node.strategic_themes)
            if theme_set & node_themes:  # Intersection
                results.append(node)

            for child in node.children:
                traverse(child)

        traverse(self.root)
        return results

    def get_popular_lines(self, opening_name: str, min_popularity: float = 0.1,
                         max_depth: int = 10) -> List[OpeningTreeNode]:
        """
        Get popular variations of an opening.

        Args:
            opening_name: Opening name
            min_popularity: Minimum popularity threshold
            max_depth: Maximum depth

        Returns:
            List of popular variation nodes
        """
        variations = self.get_opening_by_name(opening_name)
        return [
            node for node in variations
            if node.popularity >= min_popularity and node.get_depth() <= max_depth
        ]
