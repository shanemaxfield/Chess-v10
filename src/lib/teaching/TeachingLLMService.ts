/**
 * TeachingLLMService - LLM integration for chess teaching
 *
 * Generates structured JSON responses with:
 * - Main line moves to demonstrate
 * - Pause points for explanation
 * - Up to 3 continuation variations with source attribution
 * - Explanatory text for each variation
 */

import OpenAI from 'openai';
import { LLM_CONFIG } from '../../config/llmConfig';
import { AnalyzedQuery } from './QueryAnalyzer';
import { ChessOpening } from './OpeningsLibrary';

const TEACHING_SYSTEM_PROMPT = `You are an expert chess teacher and coach. Your role is to help students understand chess through clear explanations and demonstrations.

When responding to chess queries, you should provide structured information including:
1. Main line demonstration (moves in SAN notation)
2. Up to 3 continuation options with different sources
3. Clear explanations for each variation
4. Evaluation assessments when relevant

IMPORTANT OUTPUT FORMAT:
You must respond with TWO parts:
1. A JSON instruction object (wrapped in \`\`\`json code blocks)
2. A human-readable explanation (plain text after the JSON)

JSON STRUCTURE based on query type:

For OPENING DEMONSTRATIONS:
\`\`\`json
{
  "type": "opening_demonstration",
  "mainLine": {
    "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    "description": "The main line of the Italian Game",
    "pauseAfterMove": 5
  },
  "continuations": [
    {
      "name": "Classical Variation",
      "moves": ["Bc5", "d3", "Nf6"],
      "description": "Black mirrors White's development",
      "source": "theory",
      "evaluation": "="
    },
    {
      "name": "Two Knights Defense",
      "moves": ["Nf6"],
      "description": "Sharp tactical play",
      "source": "common",
      "evaluation": "="
    }
  ],
  "explanation": "The Italian Game is one of the oldest openings..."
}
\`\`\`

For POSITION ANALYSIS:
\`\`\`json
{
  "type": "position_analysis",
  "topMoves": [
    {
      "name": "Best move",
      "moves": ["Nf3", "d6", "d4"],
      "description": "Controls the center and develops",
      "source": "stockfish",
      "evaluation": "+0.8"
    }
  ],
  "explanation": "In this position, the key ideas are..."
}
\`\`\`

For TACTICAL PATTERNS:
\`\`\`json
{
  "type": "tactical_pattern",
  "mainLine": {
    "moves": ["Nf3", "Nc6", "Bb5"],
    "description": "Example of a pin",
    "pauseAfterMove": 3
  },
  "continuations": [
    {
      "name": "Breaking the pin",
      "moves": ["a6", "Ba4"],
      "description": "Black attacks the pinning piece",
      "source": "theory",
      "evaluation": "="
    }
  ],
  "explanation": "A pin is a tactical motif where..."
}
\`\`\`

RULES:
- Always use standard algebraic notation (SAN) for moves
- Maximum 3 continuations
- Source types: "stockfish", "theory", "common", "database", "llm"
- Evaluations: "+0.5" (slight advantage), "=" (equal), "-0.3" (disadvantage), "Mate in 3", etc.
- Keep explanations clear and educational
- Focus on understanding, not just memorization

After the JSON, provide a conversational explanation that a student would find helpful.`;

export interface TeachingLLMContext {
  analysis: AnalyzedQuery;
  currentFen?: string;
  openingLibrary?: ChessOpening;
  stockfishResult?: any;
}

export class TeachingLLMService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: LLM_CONFIG.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // For client-side usage
    });
  }

  /**
   * Generate teaching instruction from query
   */
  async generateInstruction(
    query: string,
    context: TeachingLLMContext
  ): Promise<{
    jsonInstruction: string;
    explanation: string;
  }> {
    try {
      const userMessage = this.buildUserMessage(query, context);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: TEACHING_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || '';

      // Extract JSON and explanation
      const { jsonInstruction, explanation } = this.parseResponse(content);

      return { jsonInstruction, explanation };
    } catch (error) {
      console.error('Teaching LLM error:', error);
      return {
        jsonInstruction: '',
        explanation: 'I encountered an error processing your request. Please try again.',
      };
    }
  }

  /**
   * Build user message with context
   */
  private buildUserMessage(query: string, context: TeachingLLMContext): string {
    let message = `User Query: ${query}\n\n`;

    // Add query analysis context
    message += `Query Type: ${context.analysis.type}\n`;
    message += `Confidence: ${(context.analysis.confidence * 100).toFixed(0)}%\n\n`;

    // Add extracted data
    if (context.analysis.extractedData.openingName) {
      message += `Opening: ${context.analysis.extractedData.openingName}\n`;
    }

    if (context.analysis.extractedData.tacticalPattern) {
      message += `Tactical Pattern: ${context.analysis.extractedData.tacticalPattern}\n`;
    }

    // Add opening library data if available
    if (context.openingLibrary) {
      message += `\nOpening Library Entry:\n`;
      message += `Name: ${context.openingLibrary.name}\n`;
      message += `ECO: ${context.openingLibrary.ecoCode}\n`;
      message += `Main Line: ${context.openingLibrary.mainLine.join(' ')}\n`;
      message += `Description: ${context.openingLibrary.description}\n`;

      if (context.openingLibrary.continuations.length > 0) {
        message += `\nKnown Continuations:\n`;
        context.openingLibrary.continuations.forEach((cont) => {
          message += `- ${cont.name}: ${cont.moves.join(' ')} (${cont.source})\n`;
          message += `  ${cont.description}\n`;
        });
      }
    }

    // Add current position if available
    if (context.currentFen) {
      message += `\nCurrent Position (FEN): ${context.currentFen}\n`;
    }

    // Add Stockfish analysis if available
    if (context.stockfishResult) {
      message += `\nStockfish Analysis Available: Yes\n`;
      // Include relevant stockfish data
    }

    message += `\nPlease provide a structured JSON instruction and a helpful explanation for the student.`;

    return message;
  }

  /**
   * Parse response to extract JSON and explanation
   */
  private parseResponse(content: string): {
    jsonInstruction: string;
    explanation: string;
  } {
    // Look for JSON code block
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const jsonInstruction = jsonMatch[1].trim();
      // Everything after the JSON is the explanation
      const explanation = content.replace(/```json\s*[\s\S]*?\s*```/, '').trim();

      return { jsonInstruction, explanation };
    }

    // If no JSON block found, try to find JSON object
    const jsonObjectMatch = content.match(/\{[\s\S]*"type"[\s\S]*\}/);

    if (jsonObjectMatch) {
      return {
        jsonInstruction: jsonObjectMatch[0],
        explanation: content.replace(jsonObjectMatch[0], '').trim(),
      };
    }

    // No JSON found, return content as explanation
    return {
      jsonInstruction: '',
      explanation: content,
    };
  }

  /**
   * Simple text-based query (fallback)
   */
  async query(message: string, context?: any): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: TEACHING_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      return response.choices[0]?.message?.content || 'No response generated.';
    } catch (error) {
      console.error('LLM query error:', error);
      return 'I encountered an error. Please try again.';
    }
  }
}

/**
 * Singleton instance
 */
let teachingLLMService: TeachingLLMService | null = null;

/**
 * Get or create TeachingLLMService instance
 */
export function getTeachingLLMService(): TeachingLLMService {
  if (!teachingLLMService) {
    teachingLLMService = new TeachingLLMService();
  }
  return teachingLLMService;
}
