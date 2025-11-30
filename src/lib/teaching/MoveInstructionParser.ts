/**
 * MoveInstructionParser - Converts LLM output to structured board commands
 *
 * Takes structured JSON responses from LLM and converts them into:
 * - BoardController commands (move sequences, animations)
 * - Visual feedback (arrows, highlights)
 * - Variation trees
 */

export type SourceType = 'stockfish' | 'database' | 'theory' | 'common' | 'llm';

export interface Variation {
  name: string;
  moves: string[]; // SAN notation
  description: string;
  source: SourceType;
  evaluation?: string; // e.g., "+0.3", "=", "-0.5"
  color?: string; // Color for visualization
}

export interface DemonstrationInstruction {
  type: 'opening_demonstration' | 'tactical_pattern' | 'position_analysis' | 'comparison';
  mainLine: {
    moves: string[]; // SAN notation
    description: string;
    pauseAfterMove?: number; // 1-indexed move number to pause after
  };
  continuations: Variation[]; // Up to 3 variations
  explanation: string;
  visualFeedback?: {
    highlightSquares?: string[];
    arrows?: Array<{ from: string; to: string; color: string }>;
  };
}

export interface PositionAnalysisInstruction {
  type: 'position_analysis';
  topMoves: Variation[]; // Up to 3 best moves
  explanation: string;
  currentPosition?: string; // FEN
  visualFeedback?: {
    highlightSquares?: string[];
    arrows?: Array<{ from: string; to: string; color: string }>;
  };
}

export interface MoveExplanationInstruction {
  type: 'move_explanation';
  move: string; // SAN notation
  explanation: string;
  alternatives?: Variation[]; // Alternative moves
  visualFeedback?: {
    highlightSquares?: string[];
    arrows?: Array<{ from: string; to: string; color: string }>;
  };
}

export type Instruction =
  | DemonstrationInstruction
  | PositionAnalysisInstruction
  | MoveExplanationInstruction;

/**
 * Source type to color mapping for visual feedback
 */
export const SOURCE_COLORS: Record<SourceType, string> = {
  stockfish: '#3b82f6', // Blue
  database: '#10b981',  // Green
  theory: '#8b5cf6',    // Purple
  common: '#f59e0b',    // Yellow/Orange
  llm: '#ec4899',       // Pink
};

/**
 * Parse LLM JSON response into structured instruction
 */
export function parseInstructionFromLLM(jsonResponse: string): Instruction | null {
  try {
    const parsed = JSON.parse(jsonResponse);
    return validateAndNormalizeInstruction(parsed);
  } catch (error) {
    console.error('Failed to parse LLM instruction:', error);
    return null;
  }
}

/**
 * Validate and normalize instruction object
 */
function validateAndNormalizeInstruction(obj: any): Instruction | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  const type = obj.type;

  switch (type) {
    case 'opening_demonstration':
    case 'tactical_pattern':
    case 'comparison':
      return validateDemonstrationInstruction(obj);

    case 'position_analysis':
      return validatePositionAnalysisInstruction(obj);

    case 'move_explanation':
      return validateMoveExplanationInstruction(obj);

    default:
      console.error('Unknown instruction type:', type);
      return null;
  }
}

/**
 * Validate demonstration instruction
 */
function validateDemonstrationInstruction(obj: any): DemonstrationInstruction | null {
  if (!obj.mainLine || !Array.isArray(obj.mainLine.moves)) {
    console.error('Invalid mainLine in demonstration instruction');
    return null;
  }

  const continuations = (obj.continuations || [])
    .slice(0, 3) // Max 3 continuations
    .map((c: any, index: number) => normalizeVariation(c, index));

  return {
    type: obj.type,
    mainLine: {
      moves: obj.mainLine.moves,
      description: obj.mainLine.description || '',
      pauseAfterMove: obj.mainLine.pauseAfterMove,
    },
    continuations,
    explanation: obj.explanation || '',
    visualFeedback: obj.visualFeedback,
  };
}

/**
 * Validate position analysis instruction
 */
function validatePositionAnalysisInstruction(obj: any): PositionAnalysisInstruction | null {
  if (!obj.topMoves || !Array.isArray(obj.topMoves)) {
    console.error('Invalid topMoves in position analysis instruction');
    return null;
  }

  const topMoves = obj.topMoves
    .slice(0, 3) // Max 3 moves
    .map((m: any, index: number) => normalizeVariation(m, index));

  return {
    type: 'position_analysis',
    topMoves,
    explanation: obj.explanation || '',
    currentPosition: obj.currentPosition,
    visualFeedback: obj.visualFeedback,
  };
}

/**
 * Validate move explanation instruction
 */
function validateMoveExplanationInstruction(obj: any): MoveExplanationInstruction | null {
  if (!obj.move) {
    console.error('Invalid move in move explanation instruction');
    return null;
  }

  const alternatives = (obj.alternatives || [])
    .slice(0, 3)
    .map((a: any, index: number) => normalizeVariation(a, index));

  return {
    type: 'move_explanation',
    move: obj.move,
    explanation: obj.explanation || '',
    alternatives,
    visualFeedback: obj.visualFeedback,
  };
}

/**
 * Normalize variation object and assign color based on source
 */
function normalizeVariation(variation: any, index: number): Variation {
  const source: SourceType = variation.source || 'llm';
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b']; // Blue, Green, Yellow

  return {
    name: variation.name || `Variation ${index + 1}`,
    moves: variation.moves || [],
    description: variation.description || '',
    source,
    evaluation: variation.evaluation,
    color: variation.color || SOURCE_COLORS[source] || defaultColors[index % 3],
  };
}

/**
 * Create arrows from variation moves
 */
export function createArrowsFromVariation(
  variation: Variation,
  currentFen: string
): Array<{ from: string; to: string; color: string }> {
  const arrows: Array<{ from: string; to: string; color: string }> = [];

  if (variation.moves.length === 0) {
    return arrows;
  }

  // For now, just show the first move as an arrow
  // In a more advanced version, we could parse the move and extract from/to squares
  // This would require a chess library to convert SAN to from/to

  return arrows;
}

/**
 * Create a demonstration instruction for an opening
 */
export function createOpeningDemonstration(
  openingName: string,
  mainLineMoves: string[],
  description: string,
  continuations: Array<{
    name: string;
    moves: string[];
    description: string;
    source: SourceType;
    evaluation?: string;
  }>
): DemonstrationInstruction {
  return {
    type: 'opening_demonstration',
    mainLine: {
      moves: mainLineMoves,
      description,
      pauseAfterMove: mainLineMoves.length,
    },
    continuations: continuations.slice(0, 3).map((c, index) => ({
      ...c,
      color: SOURCE_COLORS[c.source],
    })),
    explanation: `This is the ${openingName}. ${description}`,
  };
}

/**
 * Create a position analysis instruction from Stockfish results
 */
export function createPositionAnalysisFromStockfish(
  pvLines: Array<{
    moves: string[];
    score: number;
    mate?: number;
  }>,
  explanation: string
): PositionAnalysisInstruction {
  const topMoves = pvLines.slice(0, 3).map((pv, index) => {
    const evaluation = pv.mate !== undefined
      ? `Mate in ${pv.mate}`
      : pv.score > 0
      ? `+${(pv.score / 100).toFixed(2)}`
      : (pv.score / 100).toFixed(2);

    return {
      name: `Line ${index + 1}`,
      moves: pv.moves,
      description: `Evaluation: ${evaluation}`,
      source: 'stockfish' as SourceType,
      evaluation,
      color: SOURCE_COLORS.stockfish,
    };
  });

  return {
    type: 'position_analysis',
    topMoves,
    explanation,
  };
}

/**
 * Extract moves from SAN notation string
 */
export function extractMovesFromSAN(sanString: string): string[] {
  // Remove move numbers and extra whitespace
  const cleaned = sanString
    .replace(/\d+\./g, '') // Remove move numbers like "1.", "2.", etc.
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();

  return cleaned.split(' ').filter(move => move.length > 0);
}

/**
 * Format variation for display
 */
export function formatVariationForDisplay(variation: Variation): string {
  const movesStr = variation.moves.join(' ');
  const evalStr = variation.evaluation ? ` (${variation.evaluation})` : '';
  return `${variation.name}${evalStr}: ${movesStr} - ${variation.description}`;
}

/**
 * Get source badge text
 */
export function getSourceBadge(source: SourceType): string {
  switch (source) {
    case 'stockfish': return 'Engine';
    case 'database': return 'Database';
    case 'theory': return 'Theory';
    case 'common': return 'Common';
    case 'llm': return 'AI';
    default: return 'Unknown';
  }
}
