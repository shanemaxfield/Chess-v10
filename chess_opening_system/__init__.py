"""
Chess Opening Knowledge System
A comprehensive system for chess opening analysis and recommendations
"""

from .main import ChessOpeningSystem, create_opening_system, process_opening_query
from .core.position_graph import PositionGraph, PositionNode
from .core.opening_tree import OpeningTree, OpeningTreeNode
from .core.zobrist import zobrist_hash, ZobristHasher
from .data.eco_parser import ECOParser, ECOOpening
from .query.intent_classifier import IntentClassifier, QueryType, QueryIntent
from .query.transposition import TranspositionFinder, TranspositionPath
from .query.recommendations import RecommendationEngine, MoveRecommendation, OpeningRecommendation

__version__ = "1.0.0"

__all__ = [
    # Main system
    'ChessOpeningSystem',
    'create_opening_system',
    'process_opening_query',

    # Core
    'PositionGraph',
    'PositionNode',
    'OpeningTree',
    'OpeningTreeNode',
    'zobrist_hash',
    'ZobristHasher',

    # Data
    'ECOParser',
    'ECOOpening',

    # Query
    'IntentClassifier',
    'QueryType',
    'QueryIntent',
    'TranspositionFinder',
    'TranspositionPath',
    'RecommendationEngine',
    'MoveRecommendation',
    'OpeningRecommendation',
]
