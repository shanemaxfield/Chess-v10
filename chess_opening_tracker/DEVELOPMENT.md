# Development Guide

## Setup

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pip install -r chess_opening_tracker/requirements.txt
```

Or install dependencies individually:

```bash
pip install python-chess requests
```

### Running Tests

Run the comprehensive test suite:

```bash
# From the project root
python chess_opening_tracker/tests/test_openings.py

# Or with pytest (if installed)
pytest chess_opening_tracker/tests/ -v
```

### Running Examples

```bash
python chess_opening_tracker/examples.py
```

### Building the Database

To populate the opening database with data from Lichess:

```bash
# Build just ECO codes
python -m chess_opening_tracker.database_builder --eco-only

# Build complete database
python -m chess_opening_tracker.database_builder

# Specify custom data directory
python -m chess_opening_tracker.database_builder --data-dir /path/to/data

# Build with custom depth
python -m chess_opening_tracker.database_builder --tree-depth 6
```

## Project Structure

```
chess_opening_tracker/
├── __init__.py                 # Package initialization
├── models.py                   # Data models (OpeningInfo, etc.)
├── opening_tracker.py          # Main OpeningTracker class
├── opening_database.py         # Opening database with ECO codes
├── transposition_detector.py   # Transposition detection
├── database_builder.py         # Build database from sources
├── examples.py                 # Usage examples
├── validate_structure.py       # Structure validation script
├── requirements.txt            # Python dependencies
├── README.md                   # User documentation
├── DEVELOPMENT.md              # This file
├── data/                       # Data files (generated)
│   ├── eco_codes.json
│   ├── opening_tree.json
│   └── transposition_map.json
└── tests/
    ├── __init__.py
    └── test_openings.py        # Comprehensive test suite
```

## Development Workflow

### Adding New Openings

1. Edit `opening_database.py`
2. Add position in the appropriate `_build_*_openings()` method
3. Use `_add_position()` helper method
4. Run tests to verify

Example:

```python
self._add_position(
    fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    eco="B00",
    name="King's Pawn Opening",
    full_name="King's Pawn Opening",
    moves=["e4"],
    opening_family="Open",
    is_mainline=True,
    typical_plans=["Control center", "Develop pieces"],
    main_ideas=["Central control", "Quick development"],
    difficulty="beginner",
    style="balanced"
)
```

### Adding Transposition Groups

1. Edit `transposition_detector.py`
2. Add to `_build_transposition_map()` method
3. Include all known move orders that reach the same position

Example:

```python
italian_routes = [
    ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    ["e4", "e5", "Bc4", "Nc6", "Nf3"],
]
self._add_transposition_group(italian_routes, "Italian Game", "C50")
```

### Writing Tests

Add tests to `tests/test_openings.py`:

```python
def test_my_new_opening(self):
    """Test My New Opening identification."""
    moves = ["e4", "e5", "..."]
    info = self.tracker.get_opening_from_moves(moves)

    self.assertEqual(info.eco_code, "C50")
    self.assertIn("Expected Name", info.opening_name)
```

## Code Style

- Follow PEP 8 style guidelines
- Use type hints for all function signatures
- Document all public methods with docstrings
- Keep methods focused and single-purpose
- Use descriptive variable names

## Performance Considerations

- Position lookups are cached for fast repeated queries
- Normalize FENs before comparison (ignore move counters)
- Use dictionary lookups instead of linear searches
- Lazy-load Lichess data only when needed

## Testing Guidelines

Test categories:

1. **Opening Identification**: Test that positions are correctly identified
2. **Transpositions**: Verify different move orders reach same position
3. **Theory Depth**: Check book move detection
4. **Metadata**: Verify plans, ideas, and descriptions
5. **Edge Cases**: Handle invalid moves, unusual openings
6. **Performance**: Benchmark lookup speed

## Debugging Tips

Enable verbose output:

```python
tracker = OpeningTracker()
info = tracker.identify_position(fen)
print(info)  # Prints full opening information
```

Check cache statistics:

```python
stats = tracker.get_cache_stats()
print(f"Hit rate: {stats['hit_rate']:.1%}")
```

## Contributing

When contributing:

1. Write tests for new features
2. Update documentation (README.md)
3. Follow existing code style
4. Add examples for new functionality
5. Ensure all tests pass

## Release Checklist

Before releasing a new version:

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Examples work correctly
- [ ] Performance benchmarks acceptable
- [ ] CHANGELOG.md updated
- [ ] Version number incremented

## Known Issues

- Database builder requires internet connection for Lichess API
- Very deep variations (>15 moves) may not be in database
- Some rare openings may not be recognized
- Transposition detection is limited to pre-defined groups

## Future Enhancements

Planned improvements:

- [ ] Add more opening variations (target: 500+ positions)
- [ ] Enhance transposition detection with automatic discovery
- [ ] Add master game database integration
- [ ] Support for opening repertoire building
- [ ] Export to various formats (PGN, JSON, etc.)
- [ ] Multi-language support
- [ ] Opening quiz/training mode
