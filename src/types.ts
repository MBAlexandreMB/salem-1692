export type Phase =
  | "setup"
  | "night_start"
  | "selection"
  | "pending"
  | "holding"
  | "revealed";

export interface GameState {
  phase: Phase;
  playerNames: string[];
  selectedVictim: string | null;
  holdingCount: number;
  totalConnected: number;
}

export type ClientMessage =
  | { type: "set_players"; names: string[] }
  | { type: "start_night" }
  | { type: "begin_selection" }
  | { type: "select_victim"; name: string }
  | { type: "cancel" }
  | { type: "confirm" }
  | { type: "hold_start" }
  | { type: "hold_end" }
  | { type: "next_night" };

export type ServerMessage = { type: "state"; state: GameState };
