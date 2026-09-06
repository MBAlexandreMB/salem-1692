export type Phase =
  | "setup"
  | "night_start"
  | "selection"
  | "pending"
  | "police_selection"
  | "police_pending"
  | "holding"
  | "saved"
  | "revealed";

export interface GameState {
  phase: Phase;
  playerNames: string[];
  selectedVictim: string | null;
  policeTarget: string | null;
  adminId: string | null;
  totalConnected: number;
}

export type ClientMessage =
  | { type: "set_players"; names: string[] }
  | { type: "claim_admin" }
  | { type: "start_night" }
  | { type: "begin_selection" }
  | { type: "select_victim"; name: string }
  | { type: "select_police"; name: string }
  | { type: "cancel" }
  | { type: "confirm" }
  | { type: "reveal" }
  | { type: "show_victim" }
  | { type: "next_night" }
  | { type: "reset" };

export type ServerMessage =
  | { type: "state"; state: GameState }
  | { type: "identity"; id: string };
