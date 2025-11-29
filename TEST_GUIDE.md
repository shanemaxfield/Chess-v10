# Testing Guide - Chess Opening Knowledge System

This guide will help you verify that all components are working correctly.

## Step 1: Install Dependencies

```bash
# Install Python dependencies
pip install chess requests flask flask-cors

# Verify installation
python -c "import chess, requests, flask; print('✅ All dependencies installed')"
```

Expected output: `✅ All dependencies installed`

## Step 2: Test Core Components

### Test 1: ECO Parser
```bash
python -c "
from chess_opening_system.data import ECOParser

parser = ECOParser()
parser.load_from_csv('data/ECO_codes.csv')

print(f'✅ Loaded {len(parser.openings)} ECO codes')

# Search test
results = parser.search('Sicilian')
print(f'✅ Found {len(results)} Sicilian openings')
print(f'   Example: {results[0].code} - {results[0].name}')
"
```

Expected output:
```
✅ Loaded 500 ECO codes
✅ Found X Sicilian openings
   Example: B20 - Sicilian Defense
```

### Test 2: Zobrist Hashing
```bash
python -c "
from chess_opening_system.core import zobrist_hash
import chess

# Test that same position always gets same hash
fen = chess.STARTING_FEN
hash1 = zobrist_hash(fen)
hash2 = zobrist_hash(fen)

assert hash1 == hash2, 'Hashing inconsistent!'
print(f'✅ Zobrist hashing working')
print(f'   Starting position hash: {hash1}')
"
```

Expected output:
```
✅ Zobrist hashing working
   Starting position hash: [16-digit hex]
```

### Test 3: Position Graph
```bash
python -c "
from chess_opening_system.core import PositionGraph
import chess

graph = PositionGraph()

# Add some positions
start_fen = chess.STARTING_FEN
graph.add_position(start_fen)

# Add a move
board = chess.Board()
board.push_san('e4')
graph.add_move(start_fen, 'e2e4', board.fen(), frequency=0.5)

print(f'✅ Position graph working')
print(f'   Positions: {len(graph.nodes)}')
print(f'   Edges: {sum(len(n.child_moves) for n in graph.nodes.values())}')
"
```

Expected output:
```
✅ Position graph working
   Positions: 2
   Edges: 1
```

### Test 4: Intent Classifier
```bash
python -c "
from chess_opening_system.query import IntentClassifier

classifier = IntentClassifier()

test_queries = [
    'Can I transpose to the Queen\'s Gambit?',
    'What should I play at 1500 elo?',
    'Show me Sicilian lines',
    'What are the main ideas in the French Defense?'
]

print('✅ Intent Classifier Tests:')
for query in test_queries:
    intent = classifier.classify(query)
    print(f'   \"{query}\"')
    print(f'   → Type: {intent.query_type.value}')
    print()
"
```

Expected output:
```
✅ Intent Classifier Tests:
   "Can I transpose to the Queen's Gambit?"
   → Type: transposition

   "What should I play at 1500 elo?"
   → Type: recommendation
   ...
```

## Step 3: Test Main System

### Test 5: System Initialization
```bash
python -c "
from chess_opening_system import create_opening_system

print('Initializing system...')
system = create_opening_system()

stats = system.get_statistics()
print('✅ System initialized successfully')
print(f'   ECO codes: {stats[\"eco_parser\"][\"total_openings\"]}')
print(f'   Position graph nodes: {stats[\"position_graph\"][\"total_positions\"]}')
"
```

Expected output:
```
Initializing system...
✓ Loaded ECO codes: 500 openings
✅ System initialized successfully
   ECO codes: 500
   Position graph nodes: 0 (or more if cached)
```

### Test 6: Query Processing
```bash
python -c "
from chess_opening_system import create_opening_system

system = create_opening_system()

# Test a query
result = system.process_query('What are the main ideas in the Italian Game?')

print('✅ Query processing working')
print(f'   Query type: {result[\"query_type\"]}')
print(f'   Rating range: {result[\"rating_range\"]}')
print(f'   Prompt generated: {len(result[\"prompt\"])} characters')
"
```

Expected output:
```
✅ Query processing working
   Query type: explanation
   Rating range: (1400, 1800)
   Prompt generated: ~1500 characters
```

## Step 4: Run Full Example Suite

```bash
python chess_opening_system/examples.py
```

This will run 7 comprehensive examples. Expected output shows each example working:
```
============================================================
CHESS OPENING KNOWLEDGE SYSTEM - EXAMPLES
============================================================

============================================================
Example 1: Basic Opening Query
============================================================
Query: What are the main ideas in the Italian Game?
Query Type: explanation
...

============================================================
Example 2: Transposition Detection
============================================================
...
```

## Step 5: Test API Server

### Start the Server
```bash
# In one terminal
python chess_opening_system/api_server.py
```

Expected output:
```
Starting Chess Opening Knowledge System API Server...
Server running on http://localhost:5000
...
```

### Test Endpoints (in another terminal)

#### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

Expected: `{"status":"ok","service":"Chess Opening Knowledge System"}`

#### Test 2: ECO Search
```bash
curl "http://localhost:5000/api/eco/search?q=Sicilian"
```

Expected: JSON with Sicilian openings

#### Test 3: Query Processing
```bash
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What should I play?",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "rating_range": [1400, 1600]
  }'
```

Expected: JSON with query type and context data

#### Test 4: Statistics (requires Lichess API)
```bash
curl -X POST http://localhost:5000/api/statistics \
  -H "Content-Type: application/json" \
  -d '{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "rating_range": [1400, 1600]
  }'
```

Expected: JSON with game statistics (may be empty if API call fails)

#### Test 5: System Stats
```bash
curl http://localhost:5000/api/system/stats
```

Expected: JSON with system statistics

## Step 6: Test Lichess API Integration (Optional)

This requires internet connection and may take a moment:

```bash
python -c "
from chess_opening_system.data import LichessClient
import chess

client = LichessClient()

print('Testing Lichess API...')
stats = client.get_opening_stats(chess.STARTING_FEN, rating_range=(1400, 1600))

if stats:
    print(f'✅ Lichess API working')
    print(f'   Total games: {stats.total_games}')
    print(f'   White win rate: {stats.white_win_rate:.1f}%')
else:
    print('⚠️  Lichess API not responding (may be rate limited or offline)')
"
```

Expected output:
```
Testing Lichess API...
✅ Lichess API working
   Total games: XXXXX
   White win rate: XX.X%
```

## Step 7: Build and Test Position Graph (Optional, ~5 minutes)

```bash
python -c "
from chess_opening_system import create_opening_system

system = create_opening_system()
print('Building position graph from Lichess...')
print('This will take ~5 minutes for 100 positions\n')

system.build_position_graph_from_lichess(max_positions=100)

stats = system.get_statistics()
print(f'\n✅ Position graph built')
print(f'   Positions: {stats[\"position_graph\"][\"total_positions\"]}')
print(f'   Edges: {stats[\"position_graph\"][\"total_edges\"]}')
"
```

Expected output:
```
Building position graph from Lichess...
This will take ~5 minutes for 100 positions

  Processed 100 positions...
✓ Built position graph with 100 positions
✓ Saved position graph cache to data/position_graph.pkl

✅ Position graph built
   Positions: 100
   Edges: ~300
```

## Quick Verification Script

Save this as `test_system.py` and run `python test_system.py`:

```python
#!/usr/bin/env python3
"""Quick system verification script"""

import sys

def test_imports():
    """Test that all modules can be imported"""
    try:
        import chess
        import requests
        import flask
        from chess_opening_system import create_opening_system
        print("✅ All imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False

def test_eco_parser():
    """Test ECO parser"""
    try:
        from chess_opening_system.data import ECOParser
        parser = ECOParser()
        parser.load_from_csv('data/ECO_codes.csv')
        assert len(parser.openings) > 0
        print(f"✅ ECO Parser working ({len(parser.openings)} codes)")
        return True
    except Exception as e:
        print(f"❌ ECO Parser failed: {e}")
        return False

def test_intent_classifier():
    """Test intent classification"""
    try:
        from chess_opening_system.query import IntentClassifier
        classifier = IntentClassifier()
        intent = classifier.classify("What should I play?")
        assert intent.query_type.value == "recommendation"
        print("✅ Intent Classifier working")
        return True
    except Exception as e:
        print(f"❌ Intent Classifier failed: {e}")
        return False

def test_system_initialization():
    """Test main system"""
    try:
        from chess_opening_system import create_opening_system
        system = create_opening_system()
        stats = system.get_statistics()
        print(f"✅ System initialized ({stats['eco_parser']['total_openings']} openings)")
        return True
    except Exception as e:
        print(f"❌ System initialization failed: {e}")
        return False

def test_query_processing():
    """Test query processing"""
    try:
        from chess_opening_system import create_opening_system
        system = create_opening_system()
        result = system.process_query("What are the main ideas in the Italian Game?")
        assert 'query_type' in result
        assert 'prompt' in result
        print("✅ Query processing working")
        return True
    except Exception as e:
        print(f"❌ Query processing failed: {e}")
        return False

def main():
    print("=" * 60)
    print("Chess Opening Knowledge System - Verification Tests")
    print("=" * 60)
    print()

    tests = [
        ("Imports", test_imports),
        ("ECO Parser", test_eco_parser),
        ("Intent Classifier", test_intent_classifier),
        ("System Initialization", test_system_initialization),
        ("Query Processing", test_query_processing),
    ]

    passed = 0
    total = len(tests)

    for name, test_func in tests:
        print(f"Testing {name}...")
        if test_func():
            passed += 1
        print()

    print("=" * 60)
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60)

    if passed == total:
        print("\n🎉 All tests passed! System is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. See errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

Run it:
```bash
python test_system.py
```

## Troubleshooting

### Issue: "No module named 'chess'"
**Solution**: `pip install chess`

### Issue: "FileNotFoundError: data/ECO_codes.csv"
**Solution**: Ensure you're running from the project root directory where `data/` exists

### Issue: "Lichess API not responding"
**Solution**: This is normal - API has rate limits. Use cached position graph or increase delay.

### Issue: "Port 5000 already in use"
**Solution**: Change port in `api_server.py` line 220 or kill the process using port 5000

### Issue: Empty position graph
**Solution**: Run `build_position_graph_from_lichess()` to populate it, or use without graph for basic functionality

## Success Criteria

✅ All imports work
✅ ECO parser loads 500+ codes
✅ Intent classifier recognizes query types
✅ System initializes without errors
✅ Query processing generates prompts
✅ API server starts on port 5000
✅ API endpoints respond correctly
✅ (Optional) Lichess API returns statistics
✅ (Optional) Position graph builds successfully

If all these pass, your system is fully functional! 🎉
