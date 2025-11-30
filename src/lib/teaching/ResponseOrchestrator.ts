/**
 * ResponseOrchestrator - Coordinates LLM, Stockfish, and board control
 *
 * Main orchestrator that:
 * 1. Analyzes user queries
 * 2. Retrieves data from multiple sources in parallel
 * 3. Combines results intelligently
 * 4. Returns structured instructions for board demonstration
 */

import { analyzeQuery, AnalyzedQuery } from './QueryAnalyzer';
import { findOpening, searchOpenings, ChessOpening } from './OpeningsLibrary';
import {
  Instruction,
  DemonstrationInstruction,
  PositionAnalysisInstruction,
  Variation,
  SourceType,
  SOURCE_COLORS,
  createOpeningDemonstration,
  createPositionAnalysisFromStockfish,
} from './MoveInstructionParser';

export interface OrchestratorConfig {
  maxContinuations: number; // Max variations to show (1-3)
  enableStockfish: boolean;
  enableLLM: boolean;
  enableOpeningsLibrary: boolean;
  stockfishDepth?: number;
  stockfishMultiPV?: number;
}

export interface OrchestratorResult {
  instruction: Instruction | null;
  analysis: AnalyzedQuery;
  sources: {
    openingLibrary?: ChessOpening;
    stockfish?: any;
    llm?: any;
  };
  responseText: string; // Human-readable explanation
  error?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OrchestratorConfig = {
  maxContinuations: 3,
  enableStockfish: true,
  enableLLM: true,
  enableOpeningsLibrary: true,
  stockfishDepth: 15,
  stockfishMultiPV: 3,
};

export class ResponseOrchestrator {
  private config: OrchestratorConfig;
  private stockfishCallback?: (fen: string, depth: number, multiPV: number) => Promise<any>;
  private llmCallback?: (query: string, context: any) => Promise<string>;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set Stockfish callback for analysis
   */
  setStockfishCallback(
    callback: (fen: string, depth: number, multiPV: number) => Promise<any>
  ): void {
    this.stockfishCallback = callback;
  }

  /**
   * Set LLM callback for natural language processing
   */
  setLLMCallback(
    callback: (query: string, context: any) => Promise<string>
  ): void {
    this.llmCallback = callback;
  }

  /**
   * Process a user query and return structured instruction
   */
  async processQuery(
    query: string,
    currentFen?: string
  ): Promise<OrchestratorResult> {
    // Step 1: Analyze the query
    const analysis = analyzeQuery(query);

    // Step 2: Execute parallel search strategy
    const searchResults = await this.parallelSearch(query, analysis, currentFen);

    // Step 3: Combine results and create instruction
    const instruction = await this.createInstruction(analysis, searchResults);

    // Step 4: Generate human-readable response
    const responseText = this.generateResponseText(analysis, searchResults, instruction);

    return {
      instruction,
      analysis,
      sources: searchResults,
      responseText,
    };
  }

  /**
   * Execute parallel search across multiple sources
   */
  private async parallelSearch(
    query: string,
    analysis: AnalyzedQuery,
    currentFen?: string
  ): Promise<{
    openingLibrary?: ChessOpening;
    stockfish?: any;
    llm?: any;
  }> {
    const promises: Promise<any>[] = [];
    const results: any = {};

    // Search openings library
    if (
      this.config.enableOpeningsLibrary &&
      analysis.requiresOpeningLibrary &&
      analysis.extractedData.openingName
    ) {
      promises.push(
        this.searchOpeningsLibrary(analysis.extractedData.openingName).then(
          (result) => {
            results.openingLibrary = result;
          }
        )
      );
    }

    // Run Stockfish analysis
    if (
      this.config.enableStockfish &&
      analysis.requiresStockfish &&
      currentFen &&
      this.stockfishCallback
    ) {
      promises.push(
        this.runStockfishAnalysis(currentFen).then((result) => {
          results.stockfish = result;
        })
      );
    }

    // Query LLM
    if (this.config.enableLLM && analysis.requiresLLM && this.llmCallback) {
      promises.push(
        this.queryLLM(query, {
          analysis,
          currentFen,
          openingLibrary: results.openingLibrary,
        }).then((result) => {
          results.llm = result;
        })
      );
    }

    // Wait for all promises to complete
    await Promise.all(promises);

    return results;
  }

  /**
   * Search openings library
   */
  private async searchOpeningsLibrary(
    openingName: string
  ): Promise<ChessOpening | undefined> {
    const opening = findOpening(openingName);
    if (opening) {
      return opening;
    }

    const searchResults = searchOpenings(openingName);
    if (searchResults.length > 0) {
      return searchResults[0];
    }

    return undefined;
  }

  /**
   * Run Stockfish analysis
   */
  private async runStockfishAnalysis(fen: string): Promise<any> {
    if (!this.stockfishCallback) {
      return null;
    }

    try {
      const depth = this.config.stockfishDepth || 15;
      const multiPV = this.config.stockfishMultiPV || 3;
      return await this.stockfishCallback(fen, depth, multiPV);
    } catch (error) {
      console.error('Stockfish analysis failed:', error);
      return null;
    }
  }

  /**
   * Query LLM for natural language response
   */
  private async queryLLM(query: string, context: any): Promise<string> {
    if (!this.llmCallback) {
      return '';
    }

    try {
      return await this.llmCallback(query, context);
    } catch (error) {
      console.error('LLM query failed:', error);
      return '';
    }
  }

  /**
   * Create instruction from search results
   */
  private async createInstruction(
    analysis: AnalyzedQuery,
    searchResults: any
  ): Promise<Instruction | null> {
    switch (analysis.type) {
      case 'opening_demonstration':
        return this.createOpeningInstruction(analysis, searchResults);

      case 'position_analysis':
        return this.createPositionAnalysisInstruction(analysis, searchResults);

      case 'comparison':
        return this.createComparisonInstruction(analysis, searchResults);

      case 'tactical_pattern':
        return this.createTacticalInstruction(analysis, searchResults);

      case 'move_explanation':
        return this.createMoveExplanationInstruction(analysis, searchResults);

      default:
        return null;
    }
  }

  /**
   * Create opening demonstration instruction
   */
  private createOpeningInstruction(
    analysis: AnalyzedQuery,
    searchResults: any
  ): DemonstrationInstruction | null {
    const opening = searchResults.openingLibrary as ChessOpening | undefined;

    if (!opening) {
      return null;
    }

    const continuations: Array<{
      name: string;
      moves: string[];
      description: string;
      source: SourceType;
      evaluation?: string;
    }> = opening.continuations.slice(0, this.config.maxContinuations).map((cont) => ({
      name: cont.name,
      moves: cont.moves,
      description: cont.description,
      source: cont.source as SourceType,
      evaluation: cont.evaluation,
    }));

    return createOpeningDemonstration(
      opening.name,
      opening.mainLine,
      opening.description,
      continuations
    );
  }

  /**
   * Create position analysis instruction
   */
  private createPositionAnalysisInstruction(
    analysis: AnalyzedQuery,
    searchResults: any
  ): PositionAnalysisInstruction | null {
    const stockfishResult = searchResults.stockfish;

    if (!stockfishResult) {
      return null;
    }

    // Parse Stockfish PV lines
    const pvLines = this.parseStockfishPVLines(stockfishResult);

    return createPositionAnalysisFromStockfish(
      pvLines,
      searchResults.llm || 'Here are the best moves in this position:'
    );
  }

  /**
   * Create comparison instruction
   */
  private createComparisonInstruction(
    analysis: AnalyzedQuery,
    searchResults: any
  ): DemonstrationInstruction | null {
    const comparison = analysis.extractedData.comparison;
    if (!comparison || comparison.length < 2) {
      return null;
    }

    const opening1 = findOpening(comparison[0]);
    const opening2 = findOpening(comparison[1]);

    if (!opening1 || !opening2) {
      return null;
    }

    // Create a comparison demonstration
    return {
      type: 'comparison',
      mainLine: {
        moves: opening1.mainLine,
        description: `${opening1.name}: ${opening1.description}`,
        pauseAfterMove: opening1.mainLine.length,
      },
      continuations: [
        {
          name: opening2.name,
          moves: opening2.mainLine,
          description: opening2.description,
          source: 'theory' as SourceType,
          color: SOURCE_COLORS.theory,
        },
      ],
      explanation: `Comparing ${opening1.name} and ${opening2.name}. ${searchResults.llm || ''}`,
    };
  }

  /**
   * Create tactical instruction
   */
  private createTacticalInstruction(
    analysis: AnalyzedQuery,
    searchResults: any
  ): DemonstrationInstruction | null {
    // For tactical patterns, we rely on LLM to provide examples
    return null; // TODO: Implement tactical pattern demonstrations
  }

  /**
   * Create move explanation instruction
   */
  private createMoveExplanationInstruction(
    analysis: AnalyzedQuery,
    searchResults: any
  ): Instruction | null {
    // For move explanations, we rely on LLM and Stockfish
    return null; // TODO: Implement move explanation instructions
  }

  /**
   * Parse Stockfish PV lines from engine output
   */
  private parseStockfishPVLines(stockfishResult: any): Array<{
    moves: string[];
    score: number;
    mate?: number;
  }> {
    // This is a placeholder - actual implementation depends on your Stockfish service
    // format
    if (!stockfishResult || !stockfishResult.pvLines) {
      return [];
    }

    return stockfishResult.pvLines.map((pv: any) => ({
      moves: pv.moves || [],
      score: pv.score || 0,
      mate: pv.mate,
    }));
  }

  /**
   * Generate human-readable response text
   */
  private generateResponseText(
    analysis: AnalyzedQuery,
    searchResults: any,
    instruction: Instruction | null
  ): string {
    if (searchResults.llm) {
      return searchResults.llm;
    }

    switch (analysis.type) {
      case 'opening_demonstration':
        const opening = searchResults.openingLibrary as ChessOpening | undefined;
        if (opening) {
          return `${opening.name} (${opening.ecoCode}): ${opening.description}\n\nMain line: ${opening.mainLine.join(' ')}`;
        }
        return 'Opening not found in library.';

      case 'position_analysis':
        return 'Here are the best moves in this position based on Stockfish analysis:';

      case 'comparison':
        const comparison = analysis.extractedData.comparison;
        if (comparison) {
          return `Comparing ${comparison[0]} and ${comparison[1]}:`;
        }
        return 'Comparison requested.';

      default:
        return 'I understand your question. Let me help you with that.';
    }
  }
}

/**
 * Create a default orchestrator instance
 */
export function createDefaultOrchestrator(): ResponseOrchestrator {
  return new ResponseOrchestrator();
}
