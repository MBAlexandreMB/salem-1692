import { useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import type { ClientMessage, GameState } from "./types";

const DEFAULT_ROOM = "sala1";

function getRoomId(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("room") ?? DEFAULT_ROOM;
}

const PARTYKIT_HOST = import.meta.env.DEV
  ? `${window.location.hostname}:1999`
  : import.meta.env.VITE_PARTYKIT_HOST ?? "salem-1692.alexandrembonomi.partykit.dev";

export function useRoom() {
  const [state, setState] = useState<GameState | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: getRoomId(),
    });

    socketRef.current = socket;

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data as string);
      if (msg.type === "state") setState(msg.state as GameState);
    };

    return () => socket.close();
  }, []);

  function send(msg: ClientMessage) {
    socketRef.current?.send(JSON.stringify(msg));
  }

  return { state, send, roomId: getRoomId() };
}
