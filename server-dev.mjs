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
    policeTarget: null,
    adminId: null,
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
      connections: new Map(), // connId -> ws
      nextId: 0,
    });
  }
  return rooms.get(roomId);
}

function roomState(room) {
  return { ...room.state, totalConnected: room.connections.size };
}

function broadcastState(room) {
  const msg = JSON.stringify({ type: "state", state: roomState(room) });
  for (const ws of room.connections.values()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
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

  room.connections.set(connId, ws);

  // Tell the connection who it is, then send current state
  ws.send(JSON.stringify({ type: "identity", id: connId }));
  ws.send(JSON.stringify({ type: "state", state: roomState(room) }));

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
    const isAdmin = s.adminId !== null && s.adminId === connId;

    switch (msg.type) {
      case "set_players":
        s.playerNames = msg.names;
        break;
      case "claim_admin":
        s.adminId = s.adminId === connId ? null : connId;
        break;
      case "start_night":
        if (s.phase === "setup" && isAdmin) s.phase = "night_start";
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
      case "select_police":
        if (s.phase === "police_selection") {
          s.policeTarget = msg.name;
          s.phase = "police_pending";
        }
        break;
      case "cancel":
        if (s.phase === "pending") {
          s.selectedVictim = null;
          s.phase = "selection";
        } else if (s.phase === "police_pending") {
          s.policeTarget = null;
          s.phase = "police_selection";
        }
        break;
      case "confirm":
        if (s.phase === "pending") s.phase = "police_selection";
        else if (s.phase === "police_pending") s.phase = "holding";
        break;
      case "reveal":
        if (s.phase === "holding" && isAdmin) s.phase = "saved";
        break;
      case "show_victim":
        if (s.phase === "saved" && isAdmin) s.phase = "revealed";
        break;
      case "next_night":
        if (s.phase === "revealed") {
          s.selectedVictim = null;
          s.policeTarget = null;
          s.phase = "night_start";
        }
        break;
      case "reset":
        if (!isAdmin) break;
        s.playerNames = [];
        s.selectedVictim = null;
        s.policeTarget = null;
        s.adminId = null;
        s.phase = "setup";
        break;
    }

    broadcastState(room);
  });

  ws.on("close", () => {
    room.connections.delete(connId);
    if (room.state.adminId === connId) room.state.adminId = null;
    broadcastState(room);
    if (room.connections.size === 0) rooms.delete(roomId);
  });
});

server.listen(PORT, () => {
  console.log(`🕯️  Salem dev server running on ws://localhost:${PORT}`);
  console.log(`   Open: http://localhost:5173?room=mesa1`);
});
