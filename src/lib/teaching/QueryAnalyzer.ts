/**
 * QueryAnalyzer - Pattern recognition for chess queries
 *
 * Categorizes user input into different query types:
 * - Opening demonstrations
 * - Position analysis
 * - Tactical patterns
 * - Move explanations
 * - General questions
 */

import { findOpening, searchOpenings } from './OpeningsLibrary';

export type QueryType =
  | 'opening_demonstration'
  | 'position_analysis'
  | 'tactical_pattern'
  | 'move_explanation'
  | 'comparison'
  | 'general_question'
  | 'unknown';

export interface AnalyzedQuery {
  type: QueryType;
  confidence: number; // 0-1
  extractedData: {
    openingName?: string;
    tacticalPattern?: string;
    moveSAN?: string;
    comparison?: string[];
    keywords?: string[];
  };
  requiresStockfish: boolean;
  requiresLLM: boolean;
  requiresOpeningLibrary: boolean;
}

/**
 * Patterns for opening demonstration queries
 */
const OPENING_PATTERNS = [
  /show\s+(?:me\s+)?(?:the\s+)?(.+?)\s*(?:opening|game|defense)?/i,
  /what(?:'s|\s+is)\s+(?:the\s+)?(.+?)\s*(?:opening|game|defense)/i,
  /tell\s+me\s+about\s+(?:the\s+)?(.+?)\s*(?:opening|game|defense)?/i,
  /(?:demonstrate|explain)\s+(?:the\s+)?(.+?)\s*(?:opening|game|defense)?/i,
  /(?:main\s+line|theory)\s+(?:of\s+)?(?:the\s+)?(.+)/i,
];

/**
 * Patterns for position analysis queries
 */
const POSITION_ANALYSIS_PATTERNS = [
  /what(?:'s|\s+is)\s+(?:the\s+)?best\s+move/i,
  /analyze\s+(?:this\s+)?(?:position|board)/i,
  /what\s+should\s+i\s+(?:play|do)/i,
  /(?:good|strong)\s+moves?/i,
  /how\s+to\s+continue/i,
  /evaluation/i,
];

/**
 * Patterns for tactical pattern queries
 */
const TACTICAL_PATTERNS = [
  /show\s+(?:me\s+)?(?:a\s+)?(?:an\s+)?(pin|fork|skewer|discovered\s+attack|double\s+attack|sacrifice)/i,
  /what(?:'s|\s+is)\s+(?:a\s+)?(?:an\s+)?(pin|fork|skewer|discovered\s+attack|double\s+attack)/i,
  /(?:explain|demonstrate)\s+(?:a\s+)?(?:an\s+)?(pin|fork|skewer|discovered\s+attack|double\s+attack|sacrifice)/i,
  /(greek\s+gift|smothered\s+mate|back\s+rank|clearance)/i,
];

/**
 * Patterns for move explanation queries
 */
const MOVE_EXPLANATION_PATTERNS = [
  /why\s+(?:is\s+)?([a-h][1-8]|[NBRQK][a-h]?[1-8]?x?[a-h][1-8])/i,
  /explain\s+(?:the\s+move\s+)?([a-h][1-8]|[NBRQK][a-h]?[1-8]?x?[a-h][1-8])/i,
  /what(?:'s|\s+is)\s+(?:the\s+)?(?:idea|point)\s+(?:of|behind)\s+([a-h][1-8]|[NBRQK][a-h]?[1-8]?x?[a-h][1-8])/i,
];

/**
 * Patterns for comparison queries
 */
const COMPARISON_PATTERNS = [
  /(?:compare|difference\s+between)\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+)/i,
  /(.+?)\s+(?:vs\.?|versus)\s+(.+)/i,
];

/**
 * Known tactical patterns
 */
const KNOWN_TACTICS = [
  'pin',
  'fork',
  'skewer',
  'discovered attack',
  'double attack',
  'sacrifice',
  'greek gift',
  'smothered mate',
  'back rank',
  'clearance',
  'deflection',
  'decoy',
  'interference',
  'zwischenzug',
  'zugzwang',
];

/**
 * Analyze a user query and categorize it
 */
export function analyzeQuery(query: string): AnalyzedQuery {
  const lowerQuery = query.toLowerCase().trim();

  // Check for opening demonstration
  const openingResult = analyzeOpeningQuery(query);
  if (openingResult) {
    return openingResult;
  }

  // Check for comparison queries
  const comparisonResult = analyzeComparisonQuery(query);
  if (comparisonResult) {
    return comparisonResult;
  }

  // Check for tactical pattern queries
  const tacticalResult = analyzeTacticalQuery(query);
  if (tacticalResult) {
    return tacticalResult;
  }

  // Check for move explanation queries
  const moveExplanationResult = analyzeMoveExplanationQuery(query);
  if (moveExplanationResult) {
    return moveExplanationResult;
  }

  // Check for position analysis queries
  const positionAnalysisResult = analyzePositionAnalysisQuery(query);
  if (positionAnalysisResult) {
    return positionAnalysisResult;
  }

  // Default to general question
  return {
    type: 'general_question',
    confidence: 0.5,
    extractedData: {
      keywords: extractKeywords(lowerQuery),
    },
    requiresStockfish: false,
    requiresLLM: true,
    requiresOpeningLibrary: false,
  };
}

/**
 * Analyze opening demonstration queries
 */
function analyzeOpeningQuery(query: string): AnalyzedQuery | null {
  for (const pattern of OPENING_PATTERNS) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const openingName = match[1].trim();

      // Check if this opening exists in our library
      const opening = findOpening(openingName);
      const searchResults = searchOpenings(openingName);

      if (opening || searchResults.length > 0) {
        return {
          type: 'opening_demonstration',
          confidence: opening ? 0.95 : 0.75,
          extractedData: {
            openingName: opening ? opening.name : openingName,
          },
          requiresStockfish: false,
          requiresLLM: true,
          requiresOpeningLibrary: true,
        };
      }

      // Even if not in library, still categorize as opening demonstration
      return {
        type: 'opening_demonstration',
        confidence: 0.6,
        extractedData: {
          openingName,
        },
        requiresStockfish: false,
        requiresLLM: true,
        requiresOpeningLibrary: true,
      };
    }
  }

  return null;
}

/**
 * Analyze position analysis queries
 */
function analyzePositionAnalysisQuery(query: string): AnalyzedQuery | null {
  for (const pattern of POSITION_ANALYSIS_PATTERNS) {
    if (pattern.test(query)) {
      return {
        type: 'position_analysis',
        confidence: 0.9,
        extractedData: {},
        requiresStockfish: true,
        requiresLLM: true,
        requiresOpeningLibrary: false,
      };
    }
  }

  return null;
}

/**
 * Analyze tactical pattern queries
 */
function analyzeTacticalQuery(query: string): AnalyzedQuery | null {
  for (const pattern of TACTICAL_PATTERNS) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const tacticalPattern = match[1].toLowerCase().trim();

      return {
        type: 'tactical_pattern',
        confidence: 0.85,
        extractedData: {
          tacticalPattern,
        },
        requiresStockfish: false,
        requiresLLM: true,
        requiresOpeningLibrary: false,
      };
    }
  }

  // Check for known tactics in the query
  for (const tactic of KNOWN_TACTICS) {
    if (query.toLowerCase().includes(tactic)) {
      return {
        type: 'tactical_pattern',
        confidence: 0.7,
        extractedData: {
          tacticalPattern: tactic,
        },
        requiresStockfish: false,
        requiresLLM: true,
        requiresOpeningLibrary: false,
      };
    }
  }

  return null;
}

/**
 * Analyze move explanation queries
 */
function analyzeMoveExplanationQuery(query: string): AnalyzedQuery | null {
  for (const pattern of MOVE_EXPLANATION_PATTERNS) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const moveSAN = match[1].trim();

      return {
        type: 'move_explanation',
        confidence: 0.9,
        extractedData: {
          moveSAN,
        },
        requiresStockfish: true,
        requiresLLM: true,
        requiresOpeningLibrary: false,
      };
    }
  }

  return null;
}

/**
 * Analyze comparison queries
 */
function analyzeComparisonQuery(query: string): AnalyzedQuery | null {
  for (const pattern of COMPARISON_PATTERNS) {
    const match = query.match(pattern);
    if (match && match[1] && match[2]) {
      const item1 = match[1].trim();
      const item2 = match[2].trim();

      // Check if these are openings
      const opening1 = findOpening(item1);
      const opening2 = findOpening(item2);

      if (opening1 || opening2) {
        return {
          type: 'comparison',
          confidence: 0.9,
          extractedData: {
            comparison: [item1, item2],
          },
          requiresStockfish: false,
          requiresLLM: true,
          requiresOpeningLibrary: true,
        };
      }

      return {
        type: 'comparison',
        confidence: 0.75,
        extractedData: {
          comparison: [item1, item2],
        },
        requiresStockfish: false,
        requiresLLM: true,
        requiresOpeningLibrary: false,
      };
    }
  }

  return null;
}

/**
 * Extract keywords from a query
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'me', 'my', 'this', 'that', 'these', 'those',
  ]);

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Get a human-readable description of the query type
 */
export function getQueryTypeDescription(type: QueryType): string {
  switch (type) {
    case 'opening_demonstration':
      return 'Opening Demonstration';
    case 'position_analysis':
      return 'Position Analysis';
    case 'tactical_pattern':
      return 'Tactical Pattern';
    case 'move_explanation':
      return 'Move Explanation';
    case 'comparison':
      return 'Comparison';
    case 'general_question':
      return 'General Question';
    default:
      return 'Unknown';
  }
}
