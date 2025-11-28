/**
 * Enhanced LLM Service with ChessBoardManager Integration
 * Provides comprehensive position context to prevent LLM hallucinations
 */

import OpenAI from 'openai';
import { Chess } from 'chess.js';
import { ActionPlan } from './actions/types';
import { PvLine } from '../engine/stockfishService';
import { formatScore } from '../utils/eval';
import { ChessBoardManager } from './boardManager';
import { LLMResponse } from './llmService';

const ENHANCED_SYSTEM_PROMPT = `You are a chess AI assistant integrated into a chess application. Your role is to help users learn and play chess by providing board actions and conversational responses.

CRITICAL POSITION AWARENESS:
You receive detailed position context including:
- Exact piece positions (verified and validated)
- All legal moves (pre-calculated)
- Tactical features (pins, forks, hanging pieces)
- Positional assessment (center control, king safety, development)
- Material balance
- Square control information

NEVER calculate positions or moves yourself. Use ONLY the information provided in the position context.

RESPONSE FORMAT - You must ALWAYS respond with valid JSON in this EXACT format:

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
2. For move requests, use the exact squares from the legal moves list
3. NEVER suggest illegal moves
4. Reference tactical features when relevant (e.g., "Be careful, your knight on c6 is pinned!")
5. Use the positional assessment to guide your advice
6. When pieces are hanging or there are tactical threats, alert the user
7. Use colors meaningfully:
   - green: good moves, suggestions
   - red: threats, dangers, attacks
   - yellow: important squares, key positions
   - blue: defensive moves, safe squares
8. Keep chat messages concise (under 150 characters when possible)
9. Always provide 2-4 follow-up suggestions
10. If Stockfish analysis is available, reference it appropriately

STOCKFISH INTEGRATION:
- If Stockfish analysis lines are provided, you can reference them
- "show me the top stockfish line" → Show Line 1 (best line) with green arrows
- "show me the top 2 lines" → Show Lines 1 and 2 with different colors
- Use arrows to visualize: Line 1 (green), Line 2 (blue), Line 3 (yellow)

TACTICAL AWARENESS:
When you notice tactical features in the position context:
- Pins: "Your {piece} on {square} is pinned!"
- Hanging pieces: "Watch out! Your {piece} on {square} is undefended"
- Forks: "Be careful of the potential fork on {square}"
- Material imbalances: Reference them in your advice

Always prioritize accuracy over creativity. If unsure, recommend safe moves from the legal moves list.`;

export class EnhancedChessLLMService {
  private client: OpenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  /**
   * Process user message with comprehensive board manager context
   */
  async processMessage(
    userMessage: string,
    boardManager: ChessBoardManager,
    stockfishLines?: PvLine[]
  ): Promise<{ plan: ActionPlan; response: string; followUps?: string[] }> {
    try {
      // Get comprehensive position context from board manager
      const context = boardManager.getContextForLLM();
      const naturalLanguage = context.naturalLanguage;
      const positionData = context.position;

      // Format Stockfish lines if available
      let stockfishInfo = '';
      if (stockfishLines && stockfishLines.length > 0) {
        const isWhiteToMove = positionData.toMove === 'white';
        stockfishInfo = `\n\nStockfish Analysis:\n${this.formatStockfishLines(stockfishLines, isWhiteToMove)}`;
      } else {
        stockfishInfo = '\n\nStockfish Analysis: Not available (engine may still be analyzing or not ready).';
      }

      // Build comprehensive prompt
      const userPrompt = this.buildEnhancedPrompt(
        userMessage,
        context,
        stockfishInfo
      );

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 600,
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
      console.error('Enhanced LLM service error:', error);

      return {
        plan: {},
        response: 'I encountered an error. Please try again.',
        followUps: ['Try a simpler command', 'Check your connection']
      };
    }
  }

  /**
   * Build enhanced prompt with full position context
   */
  private buildEnhancedPrompt(
    userMessage: string,
    context: ReturnType<ChessBoardManager['getContextForLLM']>,
    stockfishInfo: string
  ): string {
    const pos = context.position;

    let prompt = `POSITION OVERVIEW:
${context.naturalLanguage}

CURRENT POSITION:
${context.ascii}

FEN: ${pos.fen}
Turn: ${pos.toMove} to move (move #${pos.moveNumber})

LEGAL MOVES:
`;

    // Add categorized legal moves
    const categorized = pos.legalMoves.categorized;
    if (categorized.captures.length > 0) {
      prompt += `Captures: ${categorized.captures.slice(0, 10).join(', ')}${categorized.captures.length > 10 ? '...' : ''}\n`;
    }
    if (categorized.checks.length > 0) {
      prompt += `Checks: ${categorized.checks.join(', ')}\n`;
    }
    if (categorized.tactical.length > 0) {
      prompt += `Tactical: ${categorized.tactical.slice(0, 5).join(', ')}${categorized.tactical.length > 5 ? '...' : ''}\n`;
    }
    prompt += `All moves (UCI): ${pos.legalMoves.allMovesUCI.slice(0, 20).join(', ')}${pos.legalMoves.allMovesUCI.length > 20 ? '...' : ''}\n`;

    // Add tactical features
    if (pos.tacticalFeatures.hangingPieces.length > 0) {
      prompt += `\nTACTICAL ALERT - Hanging Pieces:\n`;
      for (const hp of pos.tacticalFeatures.hangingPieces.slice(0, 3)) {
        prompt += `- ${hp.description}\n`;
      }
    }

    if (pos.tacticalFeatures.pins.length > 0) {
      prompt += `\nPins Detected:\n`;
      for (const pin of pos.tacticalFeatures.pins.slice(0, 2)) {
        prompt += `- ${pin.pinnedPiece.color} ${pin.pinnedPiece.type} on ${pin.pinnedPiece.square} is pinned by ${pin.pinningPiece.color} ${pin.pinningPiece.type} on ${pin.pinningPiece.square}\n`;
      }
    }

    if (pos.tacticalFeatures.forks.length > 0) {
      prompt += `\nPotential Forks: ${pos.tacticalFeatures.forks.length} detected\n`;
    }

    // Add positional assessment
    prompt += `\nPOSITIONAL ASSESSMENT:
${pos.positionalFeatures.centerControl}
${pos.positionalFeatures.development}
Material: ${pos.material.balance}
King Safety (White): ${pos.positionalFeatures.kingSafety.white.status}
King Safety (Black): ${pos.positionalFeatures.kingSafety.black.status}
`;

    // Add game state
    if (pos.gameState.isCheck) {
      prompt += `\nGAME STATE: ${pos.toMove} is in CHECK!\n`;
    }
    if (pos.gameState.isCheckmate) {
      prompt += `\nGAME STATE: CHECKMATE!\n`;
    }
    if (pos.gameState.isStalemate) {
      prompt += `\nGAME STATE: STALEMATE!\n`;
    }

    // Add Stockfish info
    prompt += stockfishInfo;

    // Add user request
    prompt += `\n\nUser Request: "${userMessage}"

Respond with JSON only (no markdown, no code blocks):`;

    return prompt;
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
      const uciMoves = line.pv.slice(0, 10);
      const sanMoves = line.san && line.san.length > 0
        ? line.san.slice(0, 10).join(' ')
        : null;
      const depthStr = line.depth ? `depth ${line.depth}` : '';
      const movesDisplay = sanMoves ? `${sanMoves}` : uciMoves.join(' ');
      return `Line ${line.multipv} (${index === 0 ? 'Best' : `#${line.multipv}`}): ${movesDisplay} | Score: ${scoreStr} | ${depthStr}`;
    }).join('\n');
  }

  /**
   * Parse and validate LLM response
   */
  private parseResponse(content: string): LLMResponse {
    try {
      const parsed = JSON.parse(content);

      if (!parsed.board_actions || !parsed.chat_response) {
        throw new Error('Invalid response structure');
      }

      return parsed as LLMResponse;
    } catch (error) {
      console.error('Failed to parse LLM response:', content, error);

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

    if (response.board_actions.moves && response.board_actions.moves.length > 0) {
      plan.moves = response.board_actions.moves.map(m => ({
        type: 'move' as const,
        from: m.from,
        to: m.to,
        promotion: m.promotion
      }));
    }

    if (response.board_actions.arrows && response.board_actions.arrows.length > 0) {
      plan.arrows = response.board_actions.arrows.map(a => ({
        type: 'arrow' as const,
        from: a.from,
        to: a.to,
        color: a.color || '#00aa00'
      }));
    }

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
}

// Export singleton instance
let enhancedLLMServiceInstance: EnhancedChessLLMService | null = null;

export function initializeEnhancedLLMService(apiKey: string): void {
  enhancedLLMServiceInstance = new EnhancedChessLLMService(apiKey);
}

export function getEnhancedLLMService(): EnhancedChessLLMService | null {
  return enhancedLLMServiceInstance;
}
