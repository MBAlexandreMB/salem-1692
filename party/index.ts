import type * as Party from "partykit/server";
import type { ClientMessage, GameState, Phase } from "../src/types";

export default class SalemServer implements Party.Server {
  private playerNames: string[] = [];
  private phase: Phase = "setup";
  private selectedVictim: string | null = null;
  private policeTarget: string | null = null;
  private adminId: string | null = null;

  constructor(readonly room: Party.Room) {}

  private get state(): GameState {
    return {
      phase: this.phase,
      playerNames: this.playerNames,
      selectedVictim: this.selectedVictim,
      policeTarget: this.policeTarget,
      adminId: this.adminId,
      totalConnected: [...this.room.getConnections()].length,
    };
  }

  private isAdmin(conn: Party.Connection) {
    return this.adminId !== null && this.adminId === conn.id;
  }

  private broadcast() {
    this.room.broadcast(JSON.stringify({ type: "state", state: this.state }));
  }

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify({ type: "identity", id: conn.id }));
    conn.send(JSON.stringify({ type: "state", state: this.state }));
    this.broadcast();
  }

  onClose(conn: Party.Connection) {
    if (this.adminId === conn.id) this.adminId = null;
    this.broadcast();
  }

  onMessage(raw: string, sender: Party.Connection) {
    const msg = JSON.parse(raw) as ClientMessage;

    switch (msg.type) {
      case "set_players":
        this.playerNames = msg.names;
        break;

      case "claim_admin":
        this.adminId = this.adminId === sender.id ? null : sender.id;
        break;

      case "start_night":
        if (this.phase === "setup" && this.isAdmin(sender)) this.phase = "night_start";
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

      case "select_police":
        if (this.phase === "police_selection") {
          this.policeTarget = msg.name;
          this.phase = "police_pending";
        }
        break;

      case "cancel":
        if (this.phase === "pending") {
          this.selectedVictim = null;
          this.phase = "selection";
        } else if (this.phase === "police_pending") {
          this.policeTarget = null;
          this.phase = "police_selection";
        }
        break;

      case "confirm":
        if (this.phase === "pending") this.phase = "police_selection";
        else if (this.phase === "police_pending") this.phase = "holding";
        break;

      case "reveal":
        if (this.phase === "holding" && this.isAdmin(sender)) this.phase = "saved";
        break;

      case "show_victim":
        if (this.phase === "saved" && this.isAdmin(sender)) this.phase = "revealed";
        break;

      case "next_night":
        if (this.phase === "revealed") {
          this.selectedVictim = null;
          this.policeTarget = null;
          this.phase = "night_start";
        }
        break;

      case "reset":
        if (!this.isAdmin(sender)) break;
        this.playerNames = [];
        this.selectedVictim = null;
        this.policeTarget = null;
        this.adminId = null;
        this.phase = "setup";
        break;
    }

    this.broadcast();
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
