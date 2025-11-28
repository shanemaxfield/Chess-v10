"""Chess Opening Tracker - A comprehensive opening identification and tracking system."""

from .opening_tracker import OpeningTracker
from .models import OpeningInfo, TranspositionRoute, BookStatus, TheoryStatus, Continuation, Plan

__all__ = [
    'OpeningTracker',
    'OpeningInfo',
    'TranspositionRoute',
    'BookStatus',
    'TheoryStatus',
    'Continuation',
    'Plan'
]

__version__ = '1.0.0'
