import OpenAI from 'openai';
import { Chess } from 'chess.js';
import { ActionPlan } from './actions/types';
import { PvLine } from '../engine/stockfishService';
import { formatScore } from '../utils/eval';

export interface LLMResponse {
  board_actions: {
    moves?: Array<{
      from: string;
      to: string;
      promotion?: 'q' | 'r' | 'b' | 'n';
    }>;
    arrows?: Array<{
      from: string;
      to: string;
      color?: string;
    }>;
    highlights?: Array<{
      squares: string[];
      color?: string;
    }>;
    clear_previous?: boolean;
  };
  chat_response: {
    message: string;
    follow_ups?: string[];
  };
}

const SYSTEM_PROMPT = `You are a chess AI assistant integrated into a chess application. Your role is to help users learn and play chess by providing board actions and conversational responses.

CRITICAL: You must ALWAYS respond with valid JSON in this EXACT format:

{
  "board_actions": {
    "moves": [{"from": "e2", "to": "e4"}],
    "arrows": [{"from": "e2", "to": "e4", "color": "green"}],
    "highlights": [{"squares": ["d4", "e5"], "color": "yellow"}],
    "clear_previous": true
  },
  "chat_response": {
    "message": "Your friendly, concise response here",
    "follow_ups": ["Suggested question 1?", "Suggested question 2?"]
  }
}

RULES:
1. ALWAYS return valid JSON - no markdown code blocks, no extra text
2. For move requests (e.g., "e4", "play Nf3", "move pawn to e4"), include the move in board_actions.moves
3. Use UCI format for moves: "e2e4", "g1f3", etc.
4. Validate moves are legal before suggesting them
5. Use colors meaningfully:
   - green: good moves, suggestions
   - red: threats, dangers, attacks
   - yellow: important squares, key positions
   - blue: defensive moves, safe squares
6. Keep chat messages concise (under 150 characters when possible)
7. Always provide 2-4 follow-up suggestions
8. If you can't determine a move, provide helpful arrows or highlights instead
9. Clear previous annotations (clear_previous: true) unless comparing multiple options

USER CONTEXT:
- Current position is provided as FEN notation
- Legal moves are provided to help you validate
- User can make moves, draw arrows, or highlight squares through natural language
- Stockfish engine analysis lines may be provided (if available)

STOCKFISH LINES:
- If Stockfish analysis lines are provided, you can reference them when users ask about:
  - "show me the top stockfish line" / "show me line 1" → Show Line 1 (best line)
  - "show me the top 2 lines" / "show me lines 1 and 2" → Show Lines 1 and 2
  - "show me the top 3 lines" → Show Lines 1, 2, and 3
  - "what does stockfish recommend" → Reference the best line
  - "show me stockfish analysis" → Show all available lines
- When showing Stockfish lines, use arrows to visualize the moves:
  - Line 1 (best): Use green arrows
  - Line 2: Use blue arrows
  - Line 3: Use yellow arrows
- Format: Each line shows moves in UCI format (e.g., "e2e4 e7e5") and evaluation score
- If no Stockfish lines are available, inform the user that analysis is not ready

EXAMPLES:

User: "e4"
{
  "board_actions": {
    "moves": [{"from": "e2", "to": "e4"}],
    "arrows": [{"from": "e2", "to": "e4", "color": "green"}],
    "clear_previous": true
  },
  "chat_response": {
    "message": "Playing e4! This opens the center and develops your king's pawn.",
    "follow_ups": ["What's the best response for Black?", "Show me the Sicilian Defense", "Explain center control"]
  }
}

User: "What's the best move here?"
{
  "board_actions": {
    "arrows": [{"from": "g1", "to": "f3", "color": "green"}],
    "highlights": [{"squares": ["d4", "e4"], "color": "yellow"}],
    "clear_previous": true
  },
  "chat_response": {
    "message": "Nf3 is excellent here, developing your knight and controlling the center.",
    "follow_ups": ["Play this move", "Show me alternatives", "Why is this good?"]
  }
}

User: "Show me where my bishop can go"
{
  "board_actions": {
    "highlights": [{"squares": ["a3", "b4", "c5", "d6", "e7"], "color": "yellow"}],
    "arrows": [{"from": "f1", "to": "c4", "color": "green"}],
    "clear_previous": true
  },
  "chat_response": {
    "message": "I've highlighted all squares your bishop can reach. Bc4 is a strong option!",
    "follow_ups": ["Play Bc4", "Why is Bc4 good?", "Show other piece moves"]
  }
}

User: "show me the top stockfish line" (when Stockfish lines are available)
{
  "board_actions": {
    "arrows": [{"from": "e2", "to": "e4", "color": "green"}, {"from": "e7", "to": "e5", "color": "green"}],
    "clear_previous": true
  },
  "chat_response": {
    "message": "Here's Stockfish's top line: e4 e5 (+0.5 at depth 20). This is the best move according to the engine.",
    "follow_ups": ["Show me the top 2 lines", "Play this move", "Explain why this is best"]
  }
}

User: "show me the top 2 lines" (when Stockfish lines are available)
{
  "board_actions": {
    "arrows": [
      {"from": "e2", "to": "e4", "color": "green"},
      {"from": "e7", "to": "e5", "color": "green"},
      {"from": "d2", "to": "d4", "color": "blue"},
      {"from": "d7", "to": "d5", "color": "blue"}
    ],
    "clear_previous": true
  },
  "chat_response": {
    "message": "Showing Stockfish's top 2 lines: Line 1 (green): e4 e5 (+0.5). Line 2 (blue): d4 d5 (+0.3).",
    "follow_ups": ["Show me all 3 lines", "Play line 1", "What's the difference?"]
  }
}`;

export class ChessLLMService {
  private client: OpenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    });
  }

  /**
   * Get legal moves in UCI format for the current position
   */
  private getLegalMovesUCI(chess: Chess): string[] {
    const moves = chess.moves({ verbose: true });
    return moves.map(m => `${m.from}${m.to}${m.promotion || ''}`);
  }

  /**
   * Parse and validate LLM response
   */
  private parseResponse(content: string): LLMResponse {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);

      // Validate structure
      if (!parsed.board_actions || !parsed.chat_response) {
        throw new Error('Invalid response structure');
      }

      return parsed as LLMResponse;
    } catch (error) {
      console.error('Failed to parse LLM response:', content, error);

      // Return a fallback response
      return {
        board_actions: {
          clear_previous: true
        },
        chat_response: {
          message: "I'm having trouble processing that request. Can you rephrase?",
          follow_ups: ["Try a simple move like 'e4'", "Ask 'what's the best move?'"]
        }
      };
    }
  }

  /**
   * Convert LLM response to ActionPlan format
   */
  private convertToActionPlan(response: LLMResponse): ActionPlan {
    const plan: ActionPlan = {};

    // Convert moves
    if (response.board_actions.moves && response.board_actions.moves.length > 0) {
      plan.moves = response.board_actions.moves.map(m => ({
        type: 'move' as const,
        from: m.from,
        to: m.to,
        promotion: m.promotion
      }));
    }

    // Convert arrows
    if (response.board_actions.arrows && response.board_actions.arrows.length > 0) {
      plan.arrows = response.board_actions.arrows.map(a => ({
        type: 'arrow' as const,
        from: a.from,
        to: a.to,
        color: a.color || '#00aa00'
      }));
    }

    // Convert highlights
    if (response.board_actions.highlights && response.board_actions.highlights.length > 0) {
      plan.highlights = response.board_actions.highlights.map(h => ({
        type: 'highlight' as const,
        squares: h.squares,
        color: h.color || '#ffd54f',
        mode: response.board_actions.clear_previous ? 'clear-and-add' as const : 'add' as const
      }));
    }

    return plan;
  }

  /**
   * Format Stockfish lines for the prompt
   */
  private formatStockfishLines(lines: PvLine[], isWhiteToMove: boolean): string {
    if (!lines || lines.length === 0) {
      return 'No Stockfish analysis available yet.';
    }

    return lines.map((line, index) => {
      const scoreStr = formatScore(line.score, isWhiteToMove, true);
      const uciMoves = line.pv.slice(0, 10); // First 10 moves in UCI format
      const sanMoves = line.san && line.san.length > 0 
        ? line.san.slice(0, 10).join(' ') 
        : null;
      const depthStr = line.depth ? `depth ${line.depth}` : '';
      const movesDisplay = sanMoves ? `${sanMoves} (UCI: ${uciMoves.join(' ')})` : uciMoves.join(' ');
      return `Line ${line.multipv} (${index === 0 ? 'Best' : `#${line.multipv}`}): Score ${scoreStr}, ${depthStr}, Moves: ${movesDisplay}${line.pv.length > 10 ? '...' : ''}`;
    }).join('\n');
  }

  /**
   * Process user message with LLM
   */
  async processMessage(
    userMessage: string,
    chess: Chess,
    stockfishLines?: PvLine[]
  ): Promise<{ plan: ActionPlan; response: string; followUps?: string[] }> {
    try {
      const fen = chess.fen();
      const legalMoves = this.getLegalMovesUCI(chess);
      const turn = chess.turn() === 'w' ? 'White' : 'Black';
      const moveNumber = chess.moveNumber();
      const isWhiteToMove = chess.turn() === 'w';

      let stockfishInfo = '';
      if (stockfishLines && stockfishLines.length > 0) {
        stockfishInfo = `\n\nCurrent Stockfish Analysis:\n${this.formatStockfishLines(stockfishLines, isWhiteToMove)}`;
      } else {
        stockfishInfo = '\n\nStockfish Analysis: Not available (engine may still be analyzing or not ready).';
      }

      const userPrompt = `Current Position (FEN): ${fen}
Turn: ${turn} to move (move #${moveNumber})
Legal Moves (UCI format): ${legalMoves.slice(0, 20).join(', ')}${legalMoves.length > 20 ? '...' : ''}${stockfishInfo}

User Request: "${userMessage}"

Respond with JSON only (no markdown, no code blocks):`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || '';
      const llmResponse = this.parseResponse(content);
      const actionPlan = this.convertToActionPlan(llmResponse);

      return {
        plan: actionPlan,
        response: llmResponse.chat_response.message,
        followUps: llmResponse.chat_response.follow_ups
      };
    } catch (error) {
      console.error('LLM service error:', error);

      // Return a fallback response
      return {
        plan: {},
        response: 'I encountered an error. Please try again.',
        followUps: ['Try a simpler command', 'Check your connection']
      };
    }
  }
}

// Export singleton instance
let llmServiceInstance: ChessLLMService | null = null;

export function initializeLLMService(apiKey: string): void {
  llmServiceInstance = new ChessLLMService(apiKey);
}

export function getLLMService(): ChessLLMService | null {
  return llmServiceInstance;
}
