import { useEffect, useRef, useState } from "react";
import { useRoom } from "./useRoom";

export default function App() {
  const { state, send, roomId, isAdmin } = useRoom();

  if (!state) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-stone-500 text-lg">Conectando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {state.phase === "setup" && <SetupScreen names={state.playerNames} roomId={roomId} isAdmin={isAdmin} hasAdmin={state.adminId !== null} onSetNames={(names) => send({ type: "set_players", names })} onClaimAdmin={() => send({ type: "claim_admin" })} onStart={() => send({ type: "start_night" })} />}
      {state.phase === "night_start" && <NightStartScreen onTouch={() => send({ type: "begin_selection" })} />}
      {state.phase === "selection" && <SelectionScreen title="Escolha a vítima" names={state.playerNames} onSelect={(name) => send({ type: "select_victim", name })} />}
      {state.phase === "pending" && <PendingScreen title="Vítima escolhida" name={state.selectedVictim!} onCancel={() => send({ type: "cancel" })} onConfirm={() => send({ type: "confirm" })} />}
      {state.phase === "police_selection" && <SelectionScreen title="Policial · escolha quem proteger" names={state.playerNames} onSelect={(name) => send({ type: "select_police", name })} />}
      {state.phase === "police_pending" && <PendingScreen title="O policial protege" name={state.policeTarget!} onCancel={() => send({ type: "cancel" })} onConfirm={() => send({ type: "confirm" })} />}
      {state.phase === "holding" && <HoldingScreen canReveal={isAdmin} onReveal={() => send({ type: "reveal" })} />}
      {state.phase === "saved" && <SavedScreen protectedName={state.policeTarget!} isAdmin={isAdmin} onContinue={() => send({ type: "show_victim" })} />}
      {state.phase === "revealed" && <RevealedScreen victim={state.selectedVictim!} survived={state.selectedVictim === state.policeTarget} onNext={() => send({ type: "next_night" })} />}

      {state.phase !== "setup" && isAdmin && <ResetButton onReset={() => send({ type: "reset" })} />}
      {state.phase !== "setup" && state.adminId === null && (
        <button
          className="fixed top-4 right-4 z-50 px-3 py-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-200 text-sm active:bg-amber-900"
          onClick={() => send({ type: "claim_admin" })}
        >
          Sala sem admin · assumir
        </button>
      )}
    </div>
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (!confirming) {
    return (
      <button
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-stone-900/80 border border-stone-800 text-stone-500 text-sm active:bg-stone-800"
        aria-label="Reiniciar"
        onClick={() => setConfirming(true)}
      >
        ⟲
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <button
        className="px-3 py-2 rounded-lg bg-stone-900/90 border border-stone-800 text-stone-400 text-sm active:bg-stone-800"
        onClick={() => setConfirming(false)}
      >
        Cancelar
      </button>
      <button
        className="px-3 py-2 rounded-lg bg-red-950 border border-red-900 text-red-300 text-sm font-medium active:bg-red-900"
        onClick={() => {
          setConfirming(false);
          onReset();
        }}
      >
        Reiniciar tudo
      </button>
    </div>
  );
}

function SetupScreen({ names, roomId, isAdmin, hasAdmin, onSetNames, onClaimAdmin, onStart }: {
  names: string[];
  roomId: string;
  isAdmin: boolean;
  hasAdmin: boolean;
  onSetNames: (names: string[]) => void;
  onClaimAdmin: () => void;
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
        className={
          isAdmin
            ? "w-full py-4 rounded-xl text-base font-medium bg-amber-950 text-amber-200 border border-amber-800 active:bg-amber-900"
            : "w-full py-4 rounded-xl text-base font-medium bg-stone-900 text-stone-400 border border-stone-800 active:bg-stone-800"
        }
        onClick={onClaimAdmin}
      >
        {isAdmin
          ? "Você é o admin · toque para liberar"
          : hasAdmin
            ? "Outro jogador é o admin · toque para assumir"
            : "Sou o admin"}
      </button>
      <p className="text-stone-600 text-xs -mt-3">
        O admin é quem revela a vítima no fim da noite.
      </p>

      {isAdmin ? (
        <button
          disabled={names.length < 2}
          className="w-full py-4 rounded-xl text-lg font-semibold bg-amber-900 text-amber-100 disabled:opacity-30 active:bg-amber-800"
          onClick={onStart}
        >
          Começar a noite
        </button>
      ) : (
        <p className="w-full py-4 text-center text-stone-600 text-sm">
          {hasAdmin ? "Aguardando o admin começar a noite" : "Escolham um admin para começar"}
        </p>
      )}
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

function SelectionScreen({ title, names, onSelect }: { title: string; names: string[]; onSelect: (name: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col p-6 gap-4">
      <p className="text-stone-600 text-xs text-center uppercase tracking-widest mt-2">{title}</p>
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

function PendingScreen({ title, name, onCancel, onConfirm }: { title: string; name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-8">
      <p className="text-stone-500 text-sm uppercase tracking-widest">{title}</p>
      <p className="text-4xl font-bold text-amber-200">{name}</p>
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

const HOLD_MS = 1200;

function HoldingScreen({ canReveal, onReveal }: { canReveal: boolean; onReveal: () => void }) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  function handleStart() {
    if (!canReveal || frameRef.current !== null) return;
    const startedAt = Date.now();

    const tick = () => {
      const value = Math.min((Date.now() - startedAt) / HOLD_MS, 1);
      setProgress(value);
      if (value >= 1) {
        frameRef.current = null;
        if (navigator.vibrate) navigator.vibrate(40);
        onReveal();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }

  function handleEnd() {
    if (frameRef.current === null) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setProgress(0);
  }

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  if (!canReveal) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-black select-none">
        <p className="text-4xl">🕯️</p>
        <p className="text-stone-400 text-lg tracking-wide">Aguardando o admin</p>
        <p className="text-stone-600 text-sm">só o admin revela a vítima</p>
      </div>
    );
  }

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
        <span className="text-stone-500 text-3xl z-10">🌙</span>
      </div>
    </button>
  );
}

function SavedScreen({ protectedName, isAdmin, onContinue }: {
  protectedName: string;
  isAdmin: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-8">
      <p className="text-stone-500 text-sm uppercase tracking-widest">O policial protegeu</p>
      <p className="text-4xl font-bold text-sky-300">{protectedName}</p>
      {isAdmin ? (
        <button
          className="mt-8 w-full py-4 rounded-xl text-base font-medium bg-stone-900 text-stone-300 active:bg-stone-800 border border-stone-800"
          onClick={onContinue}
        >
          Continuar
        </button>
      ) : (
        <p className="mt-8 text-stone-600 text-sm">aguardando o admin</p>
      )}
    </div>
  );
}

function RevealedScreen({ victim, survived, onNext }: { victim: string; survived: boolean; onNext: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-8">
      <p className="text-stone-500 text-sm uppercase tracking-widest">
        {survived ? "As bruxas tentaram matar" : "Esta noite cai"}
      </p>
      <p className={survived ? "text-5xl font-bold text-sky-300" : "text-5xl font-bold text-red-400"}>{victim}</p>
      {survived && <p className="-mt-6 text-stone-500 text-sm">protegido pelo policial · sobreviveu</p>}
      <button
        className="mt-8 w-full py-4 rounded-xl text-base font-medium bg-stone-900 text-stone-500 active:bg-stone-800 border border-stone-800"
        onClick={onNext}
      >
        Próxima noite
      </button>
    </div>
  );
}
