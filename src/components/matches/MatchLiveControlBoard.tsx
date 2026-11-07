"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FOUL_OUT_THRESHOLD,
  LIVE_EVENT_LABELS,
  LIVE_QUARTERS,
  LIVE_TEAM_LABELS,
  type CapLiveState,
  type LiveEventType,
  type LiveTeam,
  type MatchLiveBoard,
} from "@/lib/matchLiveControl";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type MatchMeta = {
  id: string;
  matchDate: string;
  location: string | null;
  notes: string | null;
};

const ACTION_BUTTONS: {
  type: LiveEventType;
  label: string;
  className: string;
  activeClassName: string;
}[] = [
  {
    type: "GOAL",
    label: "Gol",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    activeClassName: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500",
  },
  {
    type: "EXPULSION",
    label: "Expulsión",
    className: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
    activeClassName: "border-red-600 bg-red-600 text-white hover:bg-red-500",
  },
  {
    type: "PENALTY",
    label: "Penal",
    className: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
    activeClassName: "border-amber-500 bg-amber-500 text-white hover:bg-amber-400",
  },
];

function foulDots(foulCount: number) {
  return Array.from({ length: FOUL_OUT_THRESHOLD }, (_, i) => (
    <span
      key={i}
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        i < foulCount ? "bg-amber-400" : "bg-white/25"
      )}
    />
  ));
}

function CapButton({
  cap,
  team,
  disabled,
  onSelect,
}: {
  cap: CapLiveState;
  team: LiveTeam;
  disabled: boolean;
  onSelect: () => void;
}) {
  const isBlue = team === "BLUE";
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={cap.fouledOut || disabled}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 text-lg font-bold transition active:scale-95",
        cap.fouledOut && "cursor-not-allowed opacity-45 grayscale",
        disabled && !cap.fouledOut && "opacity-70",
        isBlue
          ? "border-blue-300 bg-blue-600 text-white hover:bg-blue-500"
          : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      )}
      title={
        cap.fouledOut
          ? `Gorro ${cap.capNumber} fuera (${cap.foulCount} faltas)`
          : `Gorro ${cap.capNumber}`
      }
    >
      <span className="leading-none">{cap.capNumber}</span>
      <span className="mt-1 flex gap-0.5">{foulDots(cap.foulCount)}</span>
      {cap.goals > 0 && (
        <span
          className={cn(
            "absolute -right-1 -top-1 rounded-full px-1.5 text-[10px] font-bold",
            isBlue ? "bg-yellow-300 text-blue-900" : "bg-blue-600 text-white"
          )}
        >
          {cap.goals}
        </span>
      )}
      {cap.fouledOut && (
        <span className="absolute inset-x-1 bottom-1 rounded bg-red-600/90 px-1 text-[9px] font-semibold uppercase tracking-wide text-white">
          Fuera
        </span>
      )}
    </button>
  );
}

function TeamPanel({
  team,
  caps,
  disabled,
  onSelect,
}: {
  team: LiveTeam;
  caps: CapLiveState[];
  disabled: boolean;
  onSelect: (team: LiveTeam, capNumber: number) => void;
}) {
  const isBlue = team === "BLUE";
  return (
    <section
      className={cn(
        "rounded-2xl border p-3 sm:p-4",
        isBlue ? "border-blue-200 bg-blue-50/80" : "border-slate-200 bg-slate-50"
      )}
    >
      <h2
        className={cn(
          "mb-3 text-center text-sm font-bold uppercase tracking-wider",
          isBlue ? "text-blue-800" : "text-slate-700"
        )}
      >
        Equipo {LIVE_TEAM_LABELS[team]}
      </h2>
      <div className="grid grid-cols-5 gap-2">
        {caps.map((cap) => (
          <CapButton
            key={`${team}-${cap.capNumber}`}
            cap={cap}
            team={team}
            disabled={disabled}
            onSelect={() => onSelect(team, cap.capNumber)}
          />
        ))}
      </div>
    </section>
  );
}

export function MatchLiveControlBoard({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<MatchMeta | null>(null);
  const [board, setBoard] = useState<MatchLiveBoard | null>(null);
  const [quarter, setQuarter] = useState(1);
  const [action, setAction] = useState<LiveEventType>("GOAL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/control-partido/${matchId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo cargar el control");
      setLoading(false);
      return;
    }
    setMatch(data.match);
    setBoard(data.board);
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function registerEvent(team: LiveTeam, capNumber: number) {
    if (saving) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/control-partido/${matchId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team,
        capNumber,
        eventType: action,
        quarter,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar");
      return;
    }
    setBoard(data.board);
  }

  async function undoEvent(eventId: string) {
    if (saving) return;
    setSaving(true);
    setError("");
    const res = await fetch(
      `/api/control-partido/${matchId}/events/${eventId}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo deshacer");
      return;
    }
    setBoard(data.board);
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Cargando control...
      </div>
    );
  }

  if (!match || !board) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "Partido no encontrado"}</AlertDescription>
      </Alert>
    );
  }

  const activeEvents = board.events.filter((e) => !e.undone);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href="/reportes/partidos"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Partidos
          </Link>
          <h1 className="text-xl font-bold tracking-tight">
            Partido de práctica · Azul vs Blanco
          </h1>
          <p className="text-sm text-muted-foreground">
            {match.matchDate}
            {match.location ? ` · ${match.location}` : ""}
          </p>
        </div>
      </div>

      {/* Marcador */}
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-lg">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-5 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
              Azul
            </p>
            <p className="text-5xl font-black tabular-nums sm:text-6xl">
              {board.blue.score}
            </p>
          </div>
          <div className="text-2xl font-light text-white/40">—</div>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
              Blanco
            </p>
            <p className="text-5xl font-black tabular-nums sm:text-6xl">
              {board.white.score}
            </p>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-2 text-center text-xs text-white/60">
          Expulsión y penal cuentan como falta · a las {FOUL_OUT_THRESHOLD} el
          jugador sale
        </p>
      </div>

      {/* Acciones siempre visibles */}
      <div className="sticky top-14 z-20 space-y-2 rounded-xl border bg-background/95 p-3 shadow-md backdrop-blur">
        <p className="text-center text-xs font-medium text-muted-foreground">
          Acción activa → tocá un número
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ACTION_BUTTONS.map((btn) => (
            <button
              key={btn.type}
              type="button"
              disabled={saving}
              onClick={() => setAction(btn.type)}
              className={cn(
                "h-12 rounded-xl border-2 text-sm font-bold transition active:scale-95 sm:h-14 sm:text-base",
                action === btn.type ? btn.activeClassName : btn.className
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-xs font-medium text-muted-foreground">Cuarto</span>
          {LIVE_QUARTERS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuarter(q)}
              className={cn(
                "h-8 min-w-8 rounded-lg border px-2 text-sm font-semibold",
                quarter === q
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamPanel
          team="BLUE"
          caps={board.blue.caps}
          disabled={saving}
          onSelect={(team, capNumber) => void registerEvent(team, capNumber)}
        />
        <TeamPanel
          team="WHITE"
          caps={board.white.caps}
          disabled={saving}
          onSelect={(team, capNumber) => void registerEvent(team, capNumber)}
        />
      </div>

      {/* Historial */}
      <section className="rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Últimos eventos</h2>
        </div>
        {activeEvents.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Elegí Gol, Expulsión o Penal arriba y tocá un número (1–15).
          </p>
        ) : (
          <ul className="divide-y">
            {activeEvents.slice(0, 30).map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div>
                  <span
                    className={cn(
                      "mr-2 inline-flex rounded px-1.5 py-0.5 text-xs font-bold",
                      event.team === "BLUE"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-800"
                    )}
                  >
                    {LIVE_TEAM_LABELS[event.team]} #{event.capNumber}
                  </span>
                  <span className="font-medium">
                    {LIVE_EVENT_LABELS[event.eventType]}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    C{event.quarter}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => void undoEvent(event.id)}
                >
                  Deshacer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
