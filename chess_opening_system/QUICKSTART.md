# Quick Start Guide

Get the Chess Opening Knowledge System running in 5 minutes.

## Installation

```bash
# 1. Install Python dependencies
pip install chess requests flask flask-cors

# 2. Verify installation
python -c "import chess; print('✓ Chess library installed')"
```

## Basic Usage

### Option 1: Python API

```python
from chess_opening_system import create_opening_system

# Initialize system
system = create_opening_system()

# Process a query
result = system.process_query("What are the main ideas in the Italian Game?")

print(f"Query Type: {result['query_type']}")
print(f"Prompt:\n{result['prompt']}")
```

### Option 2: REST API Server

```bash
# Start the server
python chess_opening_system/api_server.py

# Server runs on http://localhost:5000
```

Test with curl:

```bash
# Get move recommendations
curl -X POST http://localhost:5000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "rating_range": [1400, 1600],
    "num_moves": 3
  }'
```

## Run Examples

```bash
# Run all examples
python chess_opening_system/examples.py
```

## Build Position Graph (Optional)

For full functionality, build the position graph from Lichess:

```bash
python -c "
from chess_opening_system import create_opening_system
system = create_opening_system()
system.build_position_graph_from_lichess(max_positions=1000)
print('✓ Position graph built and cached')
"
```

This takes ~5-10 minutes for 1000 positions. The graph is cached to `data/position_graph.pkl`.

## Integration with React App

1. **Start the API server** (in one terminal):
```bash
python chess_opening_system/api_server.py
```

2. **Use in your React app**:
```typescript
// Fetch recommendations
const response = await fetch('http://localhost:5000/api/recommendations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fen: currentPosition,
    rating_range: [1400, 1600],
    num_moves: 5
  })
});

const data = await response.json();
console.log(data.recommendations);
```

## Next Steps

- Read [INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md) for full integration details
- Check [README.md](README.md) for comprehensive documentation
- Explore [examples.py](examples.py) for code samples

## Common Issues

### "No ECO codes loaded"
✅ ECO codes are in `data/ECO_codes.csv` - already included

### "Port 5000 already in use"
✅ Change port in `api_server.py` line 220: `port=5001`

### "Lichess API rate limit"
✅ Use cached position graph or increase delay in `lichess_client.py`

## Quick Commands Reference

```bash
# Install dependencies
pip install -r requirements.txt

# Run examples
python chess_opening_system/examples.py

# Start API server
python chess_opening_system/api_server.py

# Build position graph
python -c "from chess_opening_system import create_opening_system; create_opening_system().build_position_graph_from_lichess(1000)"

# Test API endpoint
curl http://localhost:5000/health
```

That's it! You're ready to use the Chess Opening Knowledge System.
