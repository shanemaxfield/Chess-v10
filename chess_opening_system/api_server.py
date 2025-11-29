"""
Flask API Server for Chess Opening Knowledge System
Provides REST endpoints for the frontend to query opening data
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import chess

from chess_opening_system import create_opening_system
from chess_opening_system.llm import ResponseParser

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Initialize chess opening system (singleton)
opening_system = None


def get_system():
    """Get or create opening system instance."""
    global opening_system
    if opening_system is None:
        opening_system = create_opening_system()
    return opening_system


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'service': 'Chess Opening Knowledge System'})


@app.route('/api/query', methods=['POST'])
def process_query():
    """
    Process a chess opening query.

    Request body:
    {
        "query": "What should I play?",
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "rating_range": [1400, 1600]
    }

    Response:
    {
        "query_type": "recommendation",
        "context_data": {...},
        "prompt": "..."
    }
    """
    try:
        data = request.json

        query = data.get('query', '')
        fen = data.get('fen', chess.STARTING_FEN)
        rating_range = tuple(data.get('rating_range', [1400, 1800]))

        if not query:
            return jsonify({'error': 'Query is required'}), 400

        # Process query
        system = get_system()
        result = system.process_query(query, fen, rating_range)

        # Convert to JSON-serializable format
        response = {
            'query_type': result['query_type'],
            'rating_range': result['rating_range'],
            'prompt': result['prompt'],
            'context_data': serialize_context(result.get('context_data', {}))
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transposition', methods=['POST'])
def check_transposition():
    """
    Check transposition to target opening.

    Request body:
    {
        "fen": "current position FEN",
        "target_opening": "Queen's Gambit Declined",
        "max_depth": 10
    }
    """
    try:
        data = request.json

        fen = data.get('fen', chess.STARTING_FEN)
        target_opening = data.get('target_opening', '')
        max_depth = data.get('max_depth', 10)

        if not target_opening:
            return jsonify({'error': 'Target opening is required'}), 400

        system = get_system()
        paths = system.transposition_finder.find_transpositions(
            fen, target_opening, max_depth
        )

        response = {
            'can_transpose': len(paths) > 0,
            'paths': [serialize_transposition_path(p) for p in paths[:5]]
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    """
    Get move recommendations.

    Request body:
    {
        "fen": "position FEN",
        "rating_range": [1400, 1600],
        "num_moves": 5,
        "style": "aggressive"  // optional
    }
    """
    try:
        data = request.json

        fen = data.get('fen', chess.STARTING_FEN)
        rating_range = tuple(data.get('rating_range', [1400, 1800]))
        num_moves = data.get('num_moves', 5)
        style = data.get('style')

        system = get_system()
        recommendations = system.recommendation_engine.recommend_moves(
            fen, rating_range, num_moves, style
        )

        response = {
            'recommendations': [serialize_move_recommendation(r) for r in recommendations]
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/statistics', methods=['POST'])
def get_statistics():
    """
    Get opening statistics.

    Request body:
    {
        "fen": "position FEN",
        "rating_range": [1400, 1600]
    }
    """
    try:
        data = request.json

        fen = data.get('fen', chess.STARTING_FEN)
        rating_range = tuple(data.get('rating_range', [1400, 1800]))

        system = get_system()
        stats = system.statistics_aggregator.get_comprehensive_stats(
            fen, rating_range
        )

        response = {
            'total_games': stats.total_games,
            'white_wins': stats.white_wins,
            'black_wins': stats.black_wins,
            'draws': stats.draws,
            'white_win_rate': stats.white_win_rate,
            'draw_rate': stats.draw_rate,
            'black_win_rate': stats.black_win_rate,
            'sources': stats.sources
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/eco/search', methods=['GET'])
def search_eco():
    """
    Search ECO codes.

    Query params:
    - q: Search query
    """
    try:
        query = request.args.get('q', '')

        if not query:
            return jsonify({'error': 'Query parameter q is required'}), 400

        system = get_system()
        results = system.eco_parser.search(query)

        response = {
            'results': [
                {
                    'code': r.code,
                    'name': r.name,
                    'variation': r.variation
                }
                for r in results[:20]
            ]
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/system/stats', methods=['GET'])
def system_statistics():
    """Get system statistics."""
    try:
        system = get_system()
        stats = system.get_statistics()

        return jsonify(stats)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Serialization helpers

def serialize_context(context):
    """Serialize context data to JSON-compatible format."""
    serialized = {}

    for key, value in context.items():
        if key == 'transposition_paths':
            serialized[key] = [serialize_transposition_path(p) for p in value]
        elif key == 'move_recommendations':
            serialized[key] = [serialize_move_recommendation(r) for r in value]
        elif key == 'statistics':
            serialized[key] = serialize_statistics(value)
        else:
            serialized[key] = value

    return serialized


def serialize_transposition_path(path):
    """Serialize TranspositionPath to dict."""
    return {
        'moves': path.moves,
        'formatted_moves': path.format_moves(),
        'opening_name': path.opening_name,
        'eco_code': path.eco_code,
        'variation': path.variation,
        'distance': path.distance,
        'evaluation': path.evaluation
    }


def serialize_move_recommendation(rec):
    """Serialize MoveRecommendation to dict."""
    return {
        'move_uci': rec.move_uci,
        'move_san': rec.move_san,
        'popularity': rec.popularity,
        'win_rate': rec.win_rate,
        'games_count': rec.games_count,
        'opening_name': rec.opening_name,
        'eco_code': rec.eco_code,
        'key_ideas': rec.key_ideas,
        'reason': rec.reason
    }


def serialize_statistics(stats):
    """Serialize AggregatedStats to dict."""
    return {
        'position_fen': stats.position_fen,
        'rating_range': stats.rating_range,
        'total_games': stats.total_games,
        'white_wins': stats.white_wins,
        'black_wins': stats.black_wins,
        'draws': stats.draws,
        'white_win_rate': stats.white_win_rate,
        'draw_rate': stats.draw_rate,
        'black_win_rate': stats.black_win_rate,
        'sources': stats.sources
    }


if __name__ == '__main__':
    print("Starting Chess Opening Knowledge System API Server...")
    print("Server running on http://localhost:5000")
    print("\nAvailable endpoints:")
    print("  POST /api/query - Process opening query")
    print("  POST /api/transposition - Check transpositions")
    print("  POST /api/recommendations - Get move recommendations")
    print("  POST /api/statistics - Get opening statistics")
    print("  GET  /api/eco/search?q=<query> - Search ECO codes")
    print("  GET  /api/system/stats - Get system statistics")
    print("  GET  /health - Health check")

    app.run(debug=True, host='0.0.0.0', port=5000)
