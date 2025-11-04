import { ActionPlan } from "./types";

/**
 * Action Planner - Maps user input to ActionPlan
 * TEMP: Simple, hard-coded dispatcher. NO ML, NO API.
 */
export function planActions(input: string): ActionPlan {
  const q = input.trim().toLowerCase();

  // A) Piece movement demo
  // Example trigger: "play the move e2e4" or "move e2 to e4"
  if (q.includes("e2e4") || (q.includes("move") && q.includes("e2") && q.includes("e4"))) {
    return {
      moves: [{ type: "move", from: "e2", to: "e4" }]
    };
  }

  // B) Arrow drawing demo
  // Example trigger: "show an arrow from b1 to c3"
  if (q.includes("arrow") && q.includes("b1") && q.includes("c3")) {
    return {
      arrows: [{ type: "arrow", from: "b1", to: "c3", color: "#00aa00" }]
    };
  }

  // C) Square highlighting demo
  // Example trigger: "highlight f7 and h7"
  if (q.includes("highlight") && (q.includes("f7") || q.includes("h7"))) {
    return {
      highlights: [{ type: "highlight", squares: ["f7", "h7"], color: "#ffd54f", mode: "clear-and-add" }]
    };
  }

  // Fallback: no actions
  return {};
}
