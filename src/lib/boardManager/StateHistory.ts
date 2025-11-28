/**
 * StateHistory - Maintains game history with variation support
 * Allows navigation through moves and exploring different lines
 */

import { Chess } from 'chess.js';
import { VariationNode } from './types';

export class StateHistory {
  private nodes: Map<string, VariationNode>;
  private currentNodeId: string;
  private rootNodeId: string;
  private nextId: number;

  constructor(initialFen?: string) {
    this.nodes = new Map();
    this.nextId = 0;

    // Create root node
    const initialPosition = initialFen || new Chess().fen();
    this.rootNodeId = this.generateId();
    this.currentNodeId = this.rootNodeId;

    const rootNode: VariationNode = {
      id: this.rootNodeId,
      move: '',
      fen: initialPosition,
      parent: null,
      children: [],
    };

    this.nodes.set(this.rootNodeId, rootNode);
  }

  /**
   * Add a move to the current line
   */
  addMove(san: string, fen: string, comment?: string): string {
    const currentNode = this.nodes.get(this.currentNodeId);
    if (!currentNode) {
      throw new Error('Current node not found');
    }

    // Check if this move already exists as a child
    for (const childId of currentNode.children) {
      const childNode = this.nodes.get(childId);
      if (childNode && childNode.move === san) {
        // Move already exists, just navigate to it
        this.currentNodeId = childId;
        return childId;
      }
    }

    // Create new node
    const nodeId = this.generateId();
    const newNode: VariationNode = {
      id: nodeId,
      move: san,
      fen,
      parent: this.currentNodeId,
      children: [],
      comment,
    };

    this.nodes.set(nodeId, newNode);
    currentNode.children.push(nodeId);

    // Update current position
    this.currentNodeId = nodeId;

    return nodeId;
  }

  /**
   * Start a new variation from current position
   */
  startVariation(): string {
    // Return current node ID - new moves will branch from here
    return this.currentNodeId;
  }

  /**
   * Go back one move
   */
  goBack(): boolean {
    const currentNode = this.nodes.get(this.currentNodeId);
    if (!currentNode || !currentNode.parent) {
      return false;
    }

    this.currentNodeId = currentNode.parent;
    return true;
  }

  /**
   * Go forward one move (main line)
   */
  goForward(): boolean {
    const currentNode = this.nodes.get(this.currentNodeId);
    if (!currentNode || currentNode.children.length === 0) {
      return false;
    }

    // Take the first child (main line)
    this.currentNodeId = currentNode.children[0];
    return true;
  }

  /**
   * Go to a specific node by ID
   */
  goToNode(nodeId: string): boolean {
    if (!this.nodes.has(nodeId)) {
      return false;
    }

    this.currentNodeId = nodeId;
    return true;
  }

  /**
   * Go to a specific move number in the main line
   */
  goToMove(moveNumber: number): boolean {
    const mainLine = this.getMainLine();

    // moveNumber is 1-indexed, but array is 0-indexed
    // Each full move has 2 plies (white and black)
    const plyIndex = moveNumber * 2 - 1; // -1 because root is at index 0

    if (plyIndex < 0 || plyIndex >= mainLine.length) {
      return false;
    }

    this.currentNodeId = mainLine[plyIndex].id;
    return true;
  }

  /**
   * Go to root position
   */
  goToStart(): void {
    this.currentNodeId = this.rootNodeId;
  }

  /**
   * Go to end of main line
   */
  goToEnd(): void {
    const mainLine = this.getMainLine();
    if (mainLine.length > 0) {
      this.currentNodeId = mainLine[mainLine.length - 1].id;
    }
  }

  /**
   * Get current position FEN
   */
  getCurrentFEN(): string {
    const currentNode = this.nodes.get(this.currentNodeId);
    return currentNode?.fen || new Chess().fen();
  }

  /**
   * Get current node
   */
  getCurrentNode(): VariationNode | null {
    return this.nodes.get(this.currentNodeId) || null;
  }

  /**
   * Get main line (sequence of moves from root to current or end)
   */
  getMainLine(): VariationNode[] {
    const line: VariationNode[] = [];
    let nodeId: string | null = this.rootNodeId;

    while (nodeId) {
      const node = this.nodes.get(nodeId);
      if (!node) break;

      line.push(node);

      // Follow first child
      if (node.children.length > 0) {
        nodeId = node.children[0];
      } else {
        nodeId = null;
      }
    }

    return line;
  }

  /**
   * Get path from root to current position
   */
  getCurrentPath(): VariationNode[] {
    const path: VariationNode[] = [];
    let nodeId: string | null = this.currentNodeId;

    while (nodeId) {
      const node = this.nodes.get(nodeId);
      if (!node) break;

      path.unshift(node); // Add to beginning
      nodeId = node.parent;
    }

    return path;
  }

  /**
   * Get move history as SAN strings
   */
  getMoveHistory(): string[] {
    const path = this.getCurrentPath();
    return path.slice(1).map((node) => node.move); // Skip root
  }

  /**
   * Get move history with move numbers
   */
  getMoveHistoryFormatted(): string {
    const path = this.getCurrentPath();
    const moves = path.slice(1); // Skip root

    const formatted: string[] = [];
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        // White's move
        formatted.push(`${Math.floor(i / 2) + 1}.${moves[i].move}`);
      } else {
        // Black's move
        formatted.push(moves[i].move);
      }
    }

    return formatted.join(' ');
  }

  /**
   * Get all variations from current position
   */
  getVariations(): Array<{ move: string; nodeId: string }> {
    const currentNode = this.nodes.get(this.currentNodeId);
    if (!currentNode) return [];

    return currentNode.children.map((childId) => {
      const child = this.nodes.get(childId);
      return {
        move: child?.move || '',
        nodeId: childId,
      };
    });
  }

  /**
   * Delete a variation
   */
  deleteVariation(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || !node.parent || nodeId === this.rootNodeId) {
      return false;
    }

    // Remove from parent's children
    const parent = this.nodes.get(node.parent);
    if (parent) {
      parent.children = parent.children.filter((id) => id !== nodeId);
    }

    // Delete node and all its descendants
    this.deleteNodeAndDescendants(nodeId);

    // If we deleted current node, go to parent
    if (this.currentNodeId === nodeId) {
      this.currentNodeId = node.parent;
    }

    return true;
  }

  /**
   * Add comment to current position
   */
  addComment(comment: string): void {
    const currentNode = this.nodes.get(this.currentNodeId);
    if (currentNode) {
      currentNode.comment = comment;
    }
  }

  /**
   * Get comment for current position
   */
  getComment(): string | undefined {
    const currentNode = this.nodes.get(this.currentNodeId);
    return currentNode?.comment;
  }

  /**
   * Reset to initial position
   */
  reset(initialFen?: string): void {
    this.nodes.clear();
    this.nextId = 0;

    const initialPosition = initialFen || new Chess().fen();
    this.rootNodeId = this.generateId();
    this.currentNodeId = this.rootNodeId;

    const rootNode: VariationNode = {
      id: this.rootNodeId,
      move: '',
      fen: initialPosition,
      parent: null,
      children: [],
    };

    this.nodes.set(this.rootNodeId, rootNode);
  }

  /**
   * Get total number of moves in current line
   */
  getTotalMoves(): number {
    const path = this.getCurrentPath();
    return path.length - 1; // Exclude root
  }

  /**
   * Get current move number (ply)
   */
  getCurrentPly(): number {
    const path = this.getCurrentPath();
    return path.length - 1; // Exclude root
  }

  /**
   * Generate unique ID for nodes
   */
  private generateId(): string {
    return `node_${this.nextId++}`;
  }

  /**
   * Delete a node and all its descendants
   */
  private deleteNodeAndDescendants(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Recursively delete children
    for (const childId of node.children) {
      this.deleteNodeAndDescendants(childId);
    }

    // Delete this node
    this.nodes.delete(nodeId);
  }
}
