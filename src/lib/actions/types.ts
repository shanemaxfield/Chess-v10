export type MoveAction = {
  type: "move";
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n"
};

export type ArrowAction = {
  type: "arrow";
  from: string;
  to: string;
  color?: string
};

export type HighlightAction = {
  type: "highlight";
  squares: string[];
  color?: string;
  mode?: "add" | "clear-and-add"
};

export type ActionPlan = {
  moves?: MoveAction[];
  arrows?: ArrowAction[];
  highlights?: HighlightAction[];
};
