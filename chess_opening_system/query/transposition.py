"""
Transposition Detection
Finds paths between positions to reach target openings
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
import chess

from ..core.position_graph import PositionGraph, PositionNode
from ..core.opening_tree import OpeningTree
from ..data.eco_parser import ECOParser


@dataclass
class TranspositionPath:
    """Represents a path to transpose to a target opening."""
    moves: List[str]  # SAN notation
    target_position: PositionNode
    opening_name: str
    eco_code: str
    variation: str = ""
    distance: int = 0  # Number of moves
    evaluation: Optional[float] = None

    def format_moves(self) -> str:
        """Format moves as a readable string."""
        result = []
        for i, move in enumerate(self.moves):
            if i % 2 == 0:
                move_num = (i // 2) + 1
                result.append(f"{move_num}.{move}")
            else:
                result.append(move)
        return ' '.join(result)


class TranspositionFinder:
    """
    Finds transposition paths between positions.
    Uses both position graph and opening tree.
    """

    def __init__(self, position_graph: PositionGraph,
                 opening_tree: OpeningTree,
                 eco_parser: ECOParser):
        """
        Initialize transposition finder.

        Args:
            position_graph: Position graph database
            opening_tree: Opening tree
            eco_parser: ECO parser for opening classification
        """
        self.position_graph = position_graph
        self.opening_tree = opening_tree
        self.eco_parser = eco_parser

    def find_transpositions(self, from_fen: str, target_opening: str,
                           max_depth: int = 10) -> List[TranspositionPath]:
        """
        Find all transposition paths to a target opening.

        Args:
            from_fen: Starting position FEN
            target_opening: Target opening name
            max_depth: Maximum search depth

        Returns:
            List of TranspositionPath objects
        """
        # Search in position graph
        graph_results = self.position_graph.find_transpositions(
            from_fen, target_opening, max_depth
        )

        paths = []
        for move_sequence, target_node in graph_results:
            # Get opening info
            opening_info = target_node.openings[0] if target_node.openings else None

            if opening_info:
                path = TranspositionPath(
                    moves=move_sequence,
                    target_position=target_node,
                    opening_name=opening_info.name,
                    eco_code=opening_info.eco,
                    variation=opening_info.variation,
                    distance=len(move_sequence),
                    evaluation=target_node.evaluation
                )
                paths.append(path)

        # Sort by distance (shortest first)
        paths.sort(key=lambda p: p.distance)

        return paths

    def can_transpose(self, from_fen: str, target_opening: str,
                     max_depth: int = 10) -> bool:
        """
        Check if transposition to target opening is possible.

        Args:
            from_fen: Starting position FEN
            target_opening: Target opening name
            max_depth: Maximum search depth

        Returns:
            True if transposition is possible
        """
        paths = self.find_transpositions(from_fen, target_opening, max_depth)
        return len(paths) > 0

    def get_shortest_path(self, from_fen: str, target_opening: str,
                         max_depth: int = 10) -> Optional[TranspositionPath]:
        """
        Get the shortest transposition path.

        Args:
            from_fen: Starting position FEN
            target_opening: Target opening name
            max_depth: Maximum search depth

        Returns:
            Shortest TranspositionPath or None
        """
        paths = self.find_transpositions(from_fen, target_opening, max_depth)
        return paths[0] if paths else None

    def get_all_transposition_targets(self, from_fen: str,
                                     max_depth: int = 5) -> Dict[str, List[TranspositionPath]]:
        """
        Get all openings reachable via transposition from current position.

        Args:
            from_fen: Starting position FEN
            max_depth: Maximum search depth

        Returns:
            Dictionary mapping opening names to paths
        """
        from_hash = self.position_graph.get_hash(from_fen)
        if from_hash not in self.position_graph.nodes:
            return {}

        results: Dict[str, List[TranspositionPath]] = {}

        # BFS from current position
        from collections import deque
        queue = deque([(from_hash, [])])
        visited = set()

        while queue:
            current_hash, path = queue.popleft()

            if len(path) > max_depth:
                continue

            if current_hash in visited:
                continue

            visited.add(current_hash)
            current_node = self.position_graph.nodes[current_hash]

            # Check if this position has opening classifications
            for opening in current_node.openings:
                opening_name = opening.name

                transposition = TranspositionPath(
                    moves=path,
                    target_position=current_node,
                    opening_name=opening_name,
                    eco_code=opening.eco,
                    variation=opening.variation,
                    distance=len(path),
                    evaluation=current_node.evaluation
                )

                if opening_name not in results:
                    results[opening_name] = []
                results[opening_name].append(transposition)

            # Explore children
            for edge in current_node.child_moves:
                new_path = path + [edge.move_san]
                queue.append((edge.target_hash, new_path))

        return results

    def compare_transposition_routes(self, from_fen: str, target_opening: str,
                                    max_routes: int = 3) -> List[TranspositionPath]:
        """
        Compare multiple routes to the same opening.

        Args:
            from_fen: Starting position FEN
            target_opening: Target opening name
            max_routes: Maximum number of routes to compare

        Returns:
            List of best transposition paths
        """
        all_paths = self.find_transpositions(from_fen, target_opening, max_depth=15)

        # Sort by: 1) distance, 2) evaluation (if available)
        def path_score(path: TranspositionPath) -> Tuple[int, float]:
            eval_score = path.evaluation if path.evaluation is not None else 0.0
            return (path.distance, -eval_score)

        all_paths.sort(key=path_score)

        return all_paths[:max_routes]

    def get_transposition_statistics(self, from_fen: str) -> Dict[str, any]:
        """
        Get statistics about transposition possibilities.

        Args:
            from_fen: Starting position FEN

        Returns:
            Dictionary with statistics
        """
        targets = self.get_all_transposition_targets(from_fen, max_depth=8)

        stats = {
            'total_reachable_openings': len(targets),
            'openings_by_distance': {},
            'most_common_targets': []
        }

        # Group by distance
        for opening_name, paths in targets.items():
            min_distance = min(p.distance for p in paths)
            if min_distance not in stats['openings_by_distance']:
                stats['openings_by_distance'][min_distance] = []
            stats['openings_by_distance'][min_distance].append(opening_name)

        # Most common targets (those with multiple paths)
        common_targets = [
            (name, len(paths)) for name, paths in targets.items()
        ]
        common_targets.sort(key=lambda x: x[1], reverse=True)
        stats['most_common_targets'] = common_targets[:5]

        return stats

    def validate_transposition(self, from_fen: str, moves: List[str],
                              target_opening: str) -> bool:
        """
        Validate that a sequence of moves leads to the target opening.

        Args:
            from_fen: Starting position FEN
            moves: List of moves in SAN
            target_opening: Expected opening name

        Returns:
            True if the moves lead to the target opening
        """
        try:
            board = chess.Board(from_fen)

            for move_san in moves:
                move = board.parse_san(move_san)
                board.push(move)

            final_fen = board.fen()

            # Check if position matches target opening
            position = self.position_graph.get_position(final_fen)
            if position:
                for opening in position.openings:
                    if target_opening.lower() in opening.name.lower():
                        return True

            return False

        except (ValueError, chess.IllegalMoveError):
            return False


# Convenience functions

def find_transpositions(from_fen: str, target_opening: str,
                       position_graph: PositionGraph,
                       opening_tree: OpeningTree,
                       eco_parser: ECOParser,
                       max_depth: int = 10) -> List[TranspositionPath]:
    """
    Find transposition paths.

    Args:
        from_fen: Starting position
        target_opening: Target opening name
        position_graph: Position graph
        opening_tree: Opening tree
        eco_parser: ECO parser
        max_depth: Maximum depth

    Returns:
        List of TranspositionPath objects
    """
    finder = TranspositionFinder(position_graph, opening_tree, eco_parser)
    return finder.find_transpositions(from_fen, target_opening, max_depth)


def can_transpose_to(from_fen: str, target_opening: str,
                     position_graph: PositionGraph,
                     opening_tree: OpeningTree,
                     eco_parser: ECOParser) -> bool:
    """
    Check if transposition is possible.

    Args:
        from_fen: Starting position
        target_opening: Target opening
        position_graph: Position graph
        opening_tree: Opening tree
        eco_parser: ECO parser

    Returns:
        True if transposition is possible
    """
    finder = TranspositionFinder(position_graph, opening_tree, eco_parser)
    return finder.can_transpose(from_fen, target_opening)
