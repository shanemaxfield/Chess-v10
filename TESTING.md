# Quick Testing Guide

## Prerequisites Check

Before testing, ensure you have Python 3.8+ installed:

```bash
python --version  # Should show Python 3.8 or higher
```

## Installation & Testing (5 minutes)

### Step 1: Install Dependencies

```bash
# Install required packages
pip install chess requests flask flask-cors

# Verify installation
python -c "import chess, requests, flask; print('✅ Dependencies installed')"
```

### Step 2: Quick Verification

Run the automated test script:

```bash
python test_system.py
```

**Expected Output:**
```
============================================================
Chess Opening Knowledge System - Verification Tests
============================================================

Testing Imports...
✅ All imports successful

Testing ECO Parser...
✅ ECO Parser working (500 codes)

Testing Intent Classifier...
✅ Intent Classifier working

Testing System Initialization...
✓ Loaded ECO codes: 500 openings
✅ System initialized (500 openings)

Testing Query Processing...
✅ Query processing working

============================================================
Results: 5/5 tests passed
============================================================

🎉 All tests passed! System is working correctly.
```

### Step 3: Run Examples

```bash
# Run all examples (takes ~1 minute)
python chess_opening_system/examples.py
```

This will demonstrate:
- Basic query processing
- Transposition detection
- Move recommendations
- Opening exploration
- Statistics fetching
- Intent classification
- ECO parsing

### Step 4: Test API Server

**Terminal 1 - Start Server:**
```bash
python chess_opening_system/api_server.py
```

**Terminal 2 - Test Endpoints:**
```bash
# Health check
curl http://localhost:5000/health

# Search ECO codes
curl "http://localhost:5000/api/eco/search?q=Sicilian"

# Process a query
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What should I play at 1500 elo?",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "rating_range": [1400, 1600]
  }'
```

## Manual Component Tests

### Test 1: Import Test
```python
python -c "
from chess_opening_system import create_opening_system
print('✅ Imports working')
"
```

### Test 2: ECO Parser
```python
python -c "
from chess_opening_system.data import ECOParser
parser = ECOParser()
parser.load_from_csv('data/ECO_codes.csv')
print(f'✅ Loaded {len(parser.openings)} ECO codes')
results = parser.search('Sicilian')
print(f'✅ Found {len(results)} Sicilian variations')
"
```

### Test 3: Intent Classification
```python
python -c "
from chess_opening_system.query import IntentClassifier
classifier = IntentClassifier()
queries = [
    'Can I transpose to Queens Gambit?',
    'What should I play?',
    'Show me Sicilian lines',
]
for q in queries:
    intent = classifier.classify(q)
    print(f'{q} → {intent.query_type.value}')
"
```

### Test 4: Full Query
```python
python -c "
from chess_opening_system import create_opening_system
system = create_opening_system()
result = system.process_query('What are the main ideas in the Italian Game?')
print(f'✅ Query Type: {result[\"query_type\"]}')
print(f'✅ Prompt Length: {len(result[\"prompt\"])} chars')
"
```

## Validation Checklist

After testing, verify:

- [ ] Dependencies install without errors
- [ ] test_system.py shows 5/5 tests passed
- [ ] examples.py runs all 7 examples successfully
- [ ] API server starts on port 5000
- [ ] Health check endpoint responds
- [ ] ECO search returns results
- [ ] Query endpoint processes requests

## If Tests Fail

### "No module named 'chess'"
```bash
pip install chess
```

### "FileNotFoundError: data/ECO_codes.csv"
```bash
# Make sure you're in the project root
cd /path/to/Chess-v10
pwd  # Should end with /Chess-v10
```

### "Port 5000 already in use"
Edit `chess_opening_system/api_server.py` line 220:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Changed to 5001
```

## What Each Test Validates

| Test | What It Checks |
|------|----------------|
| **Imports** | All Python modules can be imported |
| **ECO Parser** | ECO codes CSV loads correctly (500+ codes) |
| **Intent Classifier** | Query classification works for 7 types |
| **System Init** | Main system initializes without errors |
| **Query Processing** | End-to-end query flow works |
| **API Server** | REST endpoints respond correctly |
| **Examples** | All use cases work as documented |

## Success Criteria

✅ **Minimum (Core Functionality)**
- test_system.py passes 5/5 tests
- Can process basic queries
- ECO codes load successfully

✅ **Full (With API)**
- API server starts successfully
- All endpoints respond
- Integration with frontend works

✅ **Production (Optional)**
- Position graph built from Lichess
- Lichess API integration works
- 1000+ positions cached

## Next Steps After Testing

Once all tests pass:

1. **Build Position Graph** (optional, ~10 min):
   ```bash
   python -c "
   from chess_opening_system import create_opening_system
   s = create_opening_system()
   s.build_position_graph_from_lichess(1000)
   "
   ```

2. **Integrate with React App**:
   - Follow `INTEGRATION_GUIDE.md`
   - Start API server
   - Use TypeScript service to call endpoints

3. **Customize**:
   - Add custom opening trees
   - Extend query types
   - Add new data sources

## Performance Benchmarks

On a typical system, you should see:

- System initialization: <2 seconds
- Query processing: <100ms
- ECO search: <10ms
- API endpoint response: <200ms

If times are significantly slower, check:
- Python version (3.8+ recommended)
- Available memory (1GB+ recommended)
- Disk I/O (SSD recommended for graph cache)
