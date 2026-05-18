import { useEffect, useRef, useState } from "react";
import { useRoom } from "./useRoom";

export default function App() {
  const { state, send, roomId } = useRoom();

  if (!state) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-stone-500 text-lg">Conectando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {state.phase === "setup" && <SetupScreen names={state.playerNames} roomId={roomId} onSetNames={(names) => send({ type: "set_players", names })} onStart={() => send({ type: "start_night" })} />}
      {state.phase === "night_start" && <NightStartScreen onTouch={() => send({ type: "begin_selection" })} />}
      {state.phase === "selection" && <SelectionScreen names={state.playerNames} onSelect={(name) => send({ type: "select_victim", name })} />}
      {state.phase === "pending" && <PendingScreen victim={state.selectedVictim!} onCancel={() => send({ type: "cancel" })} onConfirm={() => send({ type: "confirm" })} />}
      {state.phase === "holding" && <HoldingScreen holdingCount={state.holdingCount} total={state.totalConnected} onHoldStart={() => send({ type: "hold_start" })} onHoldEnd={() => send({ type: "hold_end" })} />}
      {state.phase === "revealed" && <RevealedScreen victim={state.selectedVictim!} onNext={() => send({ type: "next_night" })} />}
    </div>
  );
}

function SetupScreen({ names, roomId, onSetNames, onStart }: {
  names: string[];
  roomId: string;
  onSetNames: (names: string[]) => void;
  onStart: () => void;
}) {
  const [input, setInput] = useState("");

  function addName() {
    const trimmed = input.trim();
    if (!trimmed || names.includes(trimmed)) return;
    onSetNames([...names, trimmed]);
    setInput("");
  }

  function removeName(name: string) {
    onSetNames(names.filter((n) => n !== name));
  }

  return (
    <div className="flex flex-col min-h-screen p-6 gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-amber-200">Salem 1692</h1>
        <span className="text-xs text-stone-500">sala: {roomId}</span>
      </div>

      <p className="text-stone-400 text-sm">Adicione os nomes dos jogadores que podem ser escolhidos durante a noite.</p>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-amber-700"
          placeholder="Nome do jogador"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addName()}
        />
        <button
          className="bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-300 active:bg-stone-700"
          onClick={addName}
        >
          +
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {names.map((name) => (
          <li key={name} className="flex items-center justify-between bg-stone-900 rounded-lg px-4 py-3">
            <span className="text-white">{name}</span>
            <button className="text-stone-500 active:text-red-400 text-lg" onClick={() => removeName(name)}>✕</button>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      <button
        disabled={names.length < 2}
        className="w-full py-4 rounded-xl text-lg font-semibold bg-amber-900 text-amber-100 disabled:opacity-30 active:bg-amber-800"
        onClick={onStart}
      >
        Começar a noite
      </button>
    </div>
  );
}

function NightStartScreen({ onTouch }: { onTouch: () => void }) {
  return (
    <button
      className="min-h-screen w-full flex flex-col items-center justify-center gap-8 bg-black active:bg-stone-950"
      onClick={onTouch}
    >
      <p className="text-5xl select-none">🌙</p>
      <p className="text-stone-400 text-xl tracking-widest uppercase select-none">A noite chegou</p>
      <p className="text-stone-700 text-sm select-none">toque para continuar</p>
    </button>
  );
}

function SelectionScreen({ names, onSelect }: { names: string[]; onSelect: (name: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col p-6 gap-4">
      <p className="text-stone-600 text-xs text-center uppercase tracking-widest mt-2">Escolha a vítima</p>
      <div className="flex flex-col gap-3 mt-4">
        {names.map((name) => (
          <button
            key={name}
            className="w-full py-5 rounded-xl text-xl font-medium bg-stone-900 text-stone-200 active:bg-stone-800 border border-stone-800"
            onClick={() => onSelect(name)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function PendingScreen({ victim, onCancel, onConfirm }: { victim: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-8">
      <p className="text-stone-500 text-sm uppercase tracking-widest">Vítima escolhida</p>
      <p className="text-4xl font-bold text-amber-200">{victim}</p>
      <div className="flex w-full gap-4 mt-4">
        <button
          className="flex-1 py-5 rounded-xl text-lg font-medium bg-stone-900 text-stone-400 active:bg-stone-800 border border-stone-800"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="flex-1 py-5 rounded-xl text-lg font-semibold bg-red-950 text-red-300 active:bg-red-900 border border-red-900"
          onClick={onConfirm}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

function HoldingScreen({ holdingCount, total, onHoldStart, onHoldEnd }: {
  holdingCount: number;
  total: number;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  const holding = useRef(false);

  function handleStart() {
    if (holding.current) return;
    holding.current = true;
    onHoldStart();
    if (navigator.vibrate) navigator.vibrate(40);
  }

  function handleEnd() {
    if (!holding.current) return;
    holding.current = false;
    onHoldEnd();
  }

  useEffect(() => {
    return () => {
      if (holding.current) {
        holding.current = false;
        onHoldEnd();
      }
    };
  }, []);

  const progress = total > 0 ? holdingCount / total : 0;

  return (
    <button
      className="min-h-screen w-full flex flex-col items-center justify-center gap-8 bg-black select-none"
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    >
      <p className="text-stone-400 text-lg tracking-wide">Toque e segure</p>
      <p className="text-stone-600 text-sm">para revelar a vítima</p>
      <div className="w-32 h-32 rounded-full border-4 border-stone-800 flex items-center justify-center relative">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64" cy="64" r="60"
            fill="none"
            stroke="#7f1d1d"
            strokeWidth="8"
            strokeDasharray={`${progress * 376} 376`}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-stone-300 text-2xl font-bold z-10">{holdingCount}/{total}</span>
      </div>
    </button>
  );
}

function RevealedScreen({ victim, onNext }: { victim: string; onNext: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-8">
      <p className="text-stone-500 text-sm uppercase tracking-widest">Esta noite cai</p>
      <p className="text-5xl font-bold text-red-400">{victim}</p>
      <button
        className="mt-8 w-full py-4 rounded-xl text-base font-medium bg-stone-900 text-stone-500 active:bg-stone-800 border border-stone-800"
        onClick={onNext}
      >
        Próxima noite
      </button>
    </div>
  );
}
