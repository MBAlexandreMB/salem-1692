import type * as Party from "partykit/server";
import type { ClientMessage, GameState, Phase } from "../src/types";

export default class SalemServer implements Party.Server {
  private playerNames: string[] = [];
  private phase: Phase = "setup";
  private selectedVictim: string | null = null;
  private holdingSet = new Set<string>();

  constructor(readonly room: Party.Room) {}

  private get state(): GameState {
    return {
      phase: this.phase,
      playerNames: this.playerNames,
      selectedVictim: this.selectedVictim,
      holdingCount: this.holdingSet.size,
      totalConnected: [...this.room.getConnections()].length,
    };
  }

  private broadcast() {
    this.room.broadcast(JSON.stringify({ type: "state", state: this.state }));
  }

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify({ type: "state", state: this.state }));
    this.broadcast();
  }

  onClose(conn: Party.Connection) {
    this.holdingSet.delete(conn.id);
    this.checkAllHolding();
    this.broadcast();
  }

  onMessage(raw: string, sender: Party.Connection) {
    const msg = JSON.parse(raw) as ClientMessage;

    switch (msg.type) {
      case "set_players":
        this.playerNames = msg.names;
        break;

      case "start_night":
        if (this.phase === "setup") this.phase = "night_start";
        break;

      case "begin_selection":
        if (this.phase === "night_start") this.phase = "selection";
        break;

      case "select_victim":
        if (this.phase === "selection") {
          this.selectedVictim = msg.name;
          this.phase = "pending";
        }
        break;

      case "cancel":
        if (this.phase === "pending") {
          this.selectedVictim = null;
          this.phase = "selection";
        }
        break;

      case "confirm":
        if (this.phase === "pending") {
          this.holdingSet.clear();
          this.phase = "holding";
        }
        break;

      case "hold_start":
        if (this.phase === "holding") {
          this.holdingSet.add(sender.id);
          this.checkAllHolding();
        }
        break;

      case "hold_end":
        this.holdingSet.delete(sender.id);
        break;

      case "next_night":
        if (this.phase === "revealed") {
          this.selectedVictim = null;
          this.holdingSet.clear();
          this.phase = "night_start";
        }
        break;
    }

    this.broadcast();
  }

  private checkAllHolding() {
    const total = [...this.room.getConnections()].length;
    if (this.phase === "holding" && total > 0 && this.holdingSet.size >= total) {
      this.phase = "revealed";
    }
  }

  onRequest(req: Party.Request): Response | Promise<Response> {
    if (req.method === "GET") {
      return new Response(JSON.stringify(this.state), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Method not allowed", { status: 405 });
  }
}

SalemServer satisfies Party.Worker;
