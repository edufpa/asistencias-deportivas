"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SESSION_LABEL: Record<string, string> = {
  TURNO_MANANA: "Mañana",
  TURNO_TARDE: "Tarde",
  PESAS: "Pesas",
};

const STATUS_CONFIG = {
  ATTENDED: { label: "Asistió", bg: "bg-green-100 text-green-700 border-green-200" },
  ABSENT_JUSTIFIED: { label: "Just.", bg: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  ABSENT_UNJUSTIFIED: { label: "Injust.", bg: "bg-red-100 text-red-700 border-red-200" },
};

const SCORE_COLOR = ["", "text-red-600", "text-yellow-600", "text-blue-600", "text-green-600"];

type DayRecord = {
  date: string;
  sessions: {
    sessionId: string;
    sessionType: string;
    convocatoria: { id: string; name: string };
    status: keyof typeof STATUS_CONFIG;
    performanceScore: number | null;
    absenceReason: string | null;
  }[];
};

type PlayerData = {
  player: { id: string; firstName: string; lastName: string; club: string | null };
  summary: { attended: number; justif: number; unjustif: number; total: number; avgScore: number | null };
  days: DayRecord[];
};

export default function PlayerAsistenciaPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PlayerData | null>(null);
  const [convocatorias, setConvocatorias] = useState<{ id: string; name: string }[]>([]);
  const [selectedConv, setSelectedConv] = useState("");

  const fetchData = useCallback(async () => {
    const params = selectedConv ? `?convocatoriaId=${selectedConv}` : "";
    const res = await fetch(`/api/players/${id}/asistencia${params}`);
    if (res.ok) setData(await res.json());
  }, [id, selectedConv]);

  useEffect(() => {
    fetch("/api/convocatorias")
      .then((r) => r.json())
      .then(setConvocatorias);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!data) return <div className="text-gray-400">Cargando...</div>;

  const { player, summary, days } = data;
  const attendancePct = summary.total > 0 ? Math.round((summary.attended / summary.total) * 100) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/players/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {player.lastName}, {player.firstName}
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asistencia Individual</h1>
          <p className="text-gray-500">{player.lastName}, {player.firstName} {player.club ? `· ${player.club}` : ""}</p>
        </div>
        <select
          value={selectedConv}
          onChange={(e) => setSelectedConv(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las convocatorias</option>
          {convocatorias.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className={`text-2xl font-bold ${attendancePct !== null ? attendancePct >= 80 ? "text-green-600" : attendancePct >= 60 ? "text-yellow-600" : "text-red-600" : "text-gray-400"}`}>
              {attendancePct !== null ? `${attendancePct}%` : "—"}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Asistencia</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.attended}</div>
            <p className="text-xs text-gray-500 mt-0.5">Asistió</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.justif}</div>
            <p className="text-xs text-gray-500 mt-0.5">Just.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary.unjustif}</div>
            <p className="text-xs text-gray-500 mt-0.5">Injust.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className={`text-2xl font-bold ${summary.avgScore ? SCORE_COLOR[Math.round(summary.avgScore)] : "text-gray-400"}`}>
              {summary.avgScore ?? "—"}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Prom. puntaje</p>
          </CardContent>
        </Card>
      </div>

      {/* Day-by-day */}
      {days.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            Sin registros de asistencia
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <Card key={day.date}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 capitalize">
                  {format(new Date(day.date + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="flex flex-wrap gap-3">
                  {day.sessions.map((s) => {
                    const cfg = STATUS_CONFIG[s.status];
                    return (
                      <div key={s.sessionId} className={`rounded-lg border px-3 py-2 min-w-[130px] ${cfg.bg}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide">
                            {SESSION_LABEL[s.sessionType]}
                          </span>
                          <span className="text-xs font-semibold">{cfg.label}</span>
                        </div>
                        {s.status === "ATTENDED" && s.performanceScore && (
                          <p className={`text-xs mt-1 font-bold ${SCORE_COLOR[s.performanceScore]}`}>
                            Puntaje: {s.performanceScore}/4
                          </p>
                        )}
                        {s.status === "ABSENT_JUSTIFIED" && s.absenceReason && (
                          <p className="text-xs mt-1 italic opacity-80">"{s.absenceReason}"</p>
                        )}
                        <p className="text-xs mt-1 opacity-60">{s.convocatoria.name}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
