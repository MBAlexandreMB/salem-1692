/**
 * Local dev WebSocket server that mirrors the PartyKit room protocol.
 * Run with: node server-dev.mjs
 * PartySocket connects to: ws://localhost:1999/parties/main/{roomId}
 */

import http from "http";
import { createReadStream, existsSync } from "fs";
import { resolve, extname } from "path";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";

const DIST = resolve("dist");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const PORT = process.env.PORT || 1999;

// Room state — one per room ID
const rooms = new Map();

function createRoomState() {
  return {
    phase: "setup",
    playerNames: [],
    selectedVictim: null,
    holdingCount: 0,
    totalConnected: 0,
  };
}

function getRoomId(reqUrl) {
  try {
    const url = new URL(reqUrl, `http://localhost:${PORT}`);
    const parts = url.pathname.split("/");
    return parts[parts.length - 1] || "default";
  } catch {
    return "default";
  }
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      state: createRoomState(),
      connections: new Map(), // connId -> { ws, holding: bool }
      nextId: 0,
    });
  }
  return rooms.get(roomId);
}

function broadcastState(room) {
  const state = {
    ...room.state,
    holdingCount: [...room.connections.values()].filter((c) => c.holding).length,
    totalConnected: room.connections.size,
  };
  const msg = JSON.stringify({ type: "state", state });
  for (const { ws } of room.connections.values()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function checkAllHolding(room) {
  const total = room.connections.size;
  const holding = [...room.connections.values()].filter((c) => c.holding).length;
  if (room.state.phase === "holding" && total > 0 && holding >= total) {
    room.state.phase = "revealed";
  }
}

const server = http.createServer((req, res) => {
  // Em dev, o Vite serve o frontend em :5173. Aqui só servimos em produção (dist/ existe).
  if (!existsSync(DIST)) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Salem 1692 — frontend em :5173");
    return;
  }

  let urlPath = (req.url ?? "/").split("?")[0];
  if (urlPath === "/" || !extname(urlPath)) urlPath = "/index.html";

  const filePath = resolve(DIST, "." + urlPath);
  if (!filePath.startsWith(DIST)) { res.writeHead(403); res.end(); return; }

  if (existsSync(filePath)) {
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(resolve(DIST, "index.html")).pipe(res);
  }
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const roomId = getRoomId(req.url);
  const room = getRoom(roomId);
  const connId = String(room.nextId++);

  room.connections.set(connId, { ws, holding: false });

  // Send current state to new connection
  const initialState = {
    ...room.state,
    holdingCount: [...room.connections.values()].filter((c) => c.holding).length,
    totalConnected: room.connections.size,
  };
  ws.send(JSON.stringify({ type: "state", state: initialState }));

  // Notify others of new connection
  broadcastState(room);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const s = room.state;
    const conn = room.connections.get(connId);

    switch (msg.type) {
      case "set_players":
        s.playerNames = msg.names;
        break;
      case "start_night":
        if (s.phase === "setup") s.phase = "night_start";
        break;
      case "begin_selection":
        if (s.phase === "night_start") s.phase = "selection";
        break;
      case "select_victim":
        if (s.phase === "selection") {
          s.selectedVictim = msg.name;
          s.phase = "pending";
        }
        break;
      case "cancel":
        if (s.phase === "pending") {
          s.selectedVictim = null;
          s.phase = "selection";
        }
        break;
      case "confirm":
        if (s.phase === "pending") {
          for (const c of room.connections.values()) c.holding = false;
          s.phase = "holding";
        }
        break;
      case "hold_start":
        if (s.phase === "holding" && conn) {
          conn.holding = true;
          checkAllHolding(room);
        }
        break;
      case "hold_end":
        if (conn) conn.holding = false;
        break;
      case "next_night":
        if (s.phase === "revealed") {
          s.selectedVictim = null;
          for (const c of room.connections.values()) c.holding = false;
          s.phase = "night_start";
        }
        break;
    }

    broadcastState(room);
  });

  ws.on("close", () => {
    room.connections.delete(connId);
    if (room.state.phase === "holding") checkAllHolding(room);
    broadcastState(room);
    if (room.connections.size === 0) rooms.delete(roomId);
  });
});

server.listen(PORT, () => {
  console.log(`🕯️  Salem dev server running on ws://localhost:${PORT}`);
  console.log(`   Open: http://localhost:5173?room=mesa1`);
});
