# Integration Guide: Chess Opening Knowledge System

This guide explains how to integrate the Chess Opening Knowledge System with your React/TypeScript chess application.

## Architecture Overview

```
┌─────────────────────┐
│  React Frontend     │
│  (TypeScript)       │
└──────────┬──────────┘
           │ HTTP/REST
           ↓
┌─────────────────────┐
│  Flask API Server   │
│  (Python)           │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Opening System     │
│  (Python Modules)   │
└─────────────────────┘
```

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the API Server

```bash
python chess_opening_system/api_server.py
```

The server will run on `http://localhost:5000`

### 3. Frontend Integration

#### TypeScript Service

Create a new service file: `src/services/openingService.ts`

```typescript
// src/services/openingService.ts

export interface OpeningQuery {
  query: string;
  fen: string;
  rating_range: [number, number];
}

export interface OpeningQueryResponse {
  query_type: string;
  rating_range: [number, number];
  prompt: string;
  context_data: any;
}

export interface MoveRecommendation {
  move_uci: string;
  move_san: string;
  popularity: number;
  win_rate: number;
  games_count: number;
  opening_name?: string;
  eco_code?: string;
  key_ideas: string[];
  reason: string;
}

export interface TranspositionPath {
  moves: string[];
  formatted_moves: string;
  opening_name: string;
  eco_code: string;
  variation: string;
  distance: number;
  evaluation?: number;
}

class OpeningService {
  private baseUrl = 'http://localhost:5000/api';

  async processQuery(query: OpeningQuery): Promise<OpeningQueryResponse> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    return response.json();
  }

  async checkTransposition(
    fen: string,
    targetOpening: string,
    maxDepth: number = 10
  ): Promise<{ can_transpose: boolean; paths: TranspositionPath[] }> {
    const response = await fetch(`${this.baseUrl}/transposition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen,
        target_opening: targetOpening,
        max_depth: maxDepth,
      }),
    });

    if (!response.ok) {
      throw new Error(`Transposition check failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getRecommendations(
    fen: string,
    ratingRange: [number, number],
    numMoves: number = 5,
    style?: string
  ): Promise<{ recommendations: MoveRecommendation[] }> {
    const response = await fetch(`${this.baseUrl}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen,
        rating_range: ratingRange,
        num_moves: numMoves,
        style,
      }),
    });

    if (!response.ok) {
      throw new Error(`Recommendations failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getStatistics(
    fen: string,
    ratingRange: [number, number]
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/statistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen,
        rating_range: ratingRange,
      }),
    });

    if (!response.ok) {
      throw new Error(`Statistics fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  async searchECO(query: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/eco/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`ECO search failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const openingService = new OpeningService();
```

#### React Component Example

```typescript
// src/components/OpeningAssistant.tsx

import { useState } from 'react';
import { openingService, MoveRecommendation } from '../services/openingService';

export function OpeningAssistant({ currentFen }: { currentFen: string }) {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState<MoveRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    setLoading(true);
    try {
      // Option 1: Process natural language query
      const result = await openingService.processQuery({
        query,
        fen: currentFen,
        rating_range: [1400, 1600],
      });

      console.log('Query result:', result);

      // Option 2: Get direct recommendations
      const { recommendations: recs } = await openingService.getRecommendations(
        currentFen,
        [1400, 1600],
        5
      );

      setRecommendations(recs);
    } catch (error) {
      console.error('Error processing query:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="opening-assistant">
      <h3>Opening Assistant</h3>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about openings..."
      />

      <button onClick={handleQuery} disabled={loading}>
        {loading ? 'Processing...' : 'Ask'}
      </button>

      {recommendations.length > 0 && (
        <div className="recommendations">
          <h4>Recommended Moves:</h4>
          {recommendations.map((rec, i) => (
            <div key={i} className="recommendation">
              <strong>{rec.move_san}</strong>
              <p>{rec.reason}</p>
              <p>Success rate: {rec.win_rate.toFixed(1)}%</p>
              {rec.opening_name && <p>→ {rec.opening_name}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4. Enhanced LLM Integration

Update your existing LLM service to use opening data:

```typescript
// src/lib/llmServiceEnhanced.ts

import { openingService } from '../services/openingService';

export async function getOpeningAdvice(query: string, fen: string) {
  // Get structured opening data
  const openingData = await openingService.processQuery({
    query,
    fen,
    rating_range: [1400, 1600],
  });

  // Use the generated prompt with your LLM
  const llmResponse = await callOpenAI(openingData.prompt);

  // Parse and apply to board
  return parseLLMResponse(llmResponse);
}
```

## API Endpoints Reference

### POST /api/query
Process natural language opening query

**Request:**
```json
{
  "query": "What should I play?",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "rating_range": [1400, 1600]
}
```

**Response:**
```json
{
  "query_type": "recommendation",
  "rating_range": [1400, 1600],
  "prompt": "Formatted prompt for LLM...",
  "context_data": { ... }
}
```

### POST /api/recommendations
Get move recommendations

**Request:**
```json
{
  "fen": "position FEN",
  "rating_range": [1400, 1600],
  "num_moves": 5,
  "style": "aggressive"
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "move_san": "e4",
      "move_uci": "e2e4",
      "popularity": 0.45,
      "win_rate": 54.3,
      "games_count": 125000,
      "reason": "Most popular opening; leads to dynamic positions"
    }
  ]
}
```

### POST /api/transposition
Check transposition possibilities

**Request:**
```json
{
  "fen": "current position",
  "target_opening": "Queen's Gambit Declined",
  "max_depth": 10
}
```

**Response:**
```json
{
  "can_transpose": true,
  "paths": [
    {
      "moves": ["d4", "d5", "c4"],
      "formatted_moves": "1.d4 d5 2.c4",
      "opening_name": "Queen's Gambit Declined",
      "eco_code": "D30",
      "distance": 3
    }
  ]
}
```

### POST /api/statistics
Get opening statistics

**Request:**
```json
{
  "fen": "position FEN",
  "rating_range": [1400, 1600]
}
```

**Response:**
```json
{
  "total_games": 50000,
  "white_wins": 22000,
  "black_wins": 18000,
  "draws": 10000,
  "white_win_rate": 44.0,
  "draw_rate": 20.0,
  "black_win_rate": 36.0,
  "sources": ["lichess", "master"]
}
```

## Production Deployment

### Environment Variables

Create `.env` file:

```
FLASK_ENV=production
FLASK_DEBUG=0
PORT=5000
LICHESS_RATE_LIMIT=0.1
CACHE_TTL=3600
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "chess_opening_system/api_server.py"]
```

Build and run:

```bash
docker build -t chess-opening-system .
docker run -p 5000:5000 chess-opening-system
```

### NGINX Reverse Proxy

```nginx
location /api/opening/ {
    proxy_pass http://localhost:5000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Performance Optimization

### 1. Enable Caching

The system automatically caches:
- Lichess API responses (1 hour)
- Position graph (persistent)
- ECO codes (loaded once)

### 2. Pre-build Position Graph

```bash
python -c "
from chess_opening_system import create_opening_system
system = create_opening_system()
system.build_position_graph_from_lichess(max_positions=10000)
"
```

### 3. Use Redis for API Caching

```python
# In api_server.py
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'redis'})

@cache.memoize(timeout=3600)
def get_recommendations_cached(fen, rating_range):
    # ...
```

## Troubleshooting

### CORS Issues

If you get CORS errors, ensure Flask-CORS is installed:

```bash
pip install flask-cors
```

### Port Already in Use

Change the port in `api_server.py`:

```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

### Slow Lichess API

Increase rate limit delay or use cached position graph.

## Next Steps

1. **Integrate with existing LLM service** - Use opening data in prompts
2. **Add UI components** - Display recommendations and variations
3. **Implement variation buttons** - Make variations clickable
4. **Add opening explorer** - Browse opening tree visually
5. **Cache management** - Clear and rebuild caches

## Support

For issues or questions, refer to:
- `chess_opening_system/README.md` - System documentation
- `chess_opening_system/examples.py` - Usage examples
- API endpoints - Test with Postman or curl
