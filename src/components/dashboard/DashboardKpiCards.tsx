import { Activity, CalendarDays, ClipboardList, Users } from "lucide-react";
import { SectionHeading, StatCard, StatGrid } from "@/components/layout";

type KpiData = {
  periodDays: number;
  attendancePct: number | null;
  totalRegistered: number;
  sessionCount: number;
  activePlayers: number;
  playersWithRecords: number;
  testEvaluations: number;
};

export function DashboardKpiCards({ kpis }: { kpis: KpiData }) {
  const attendanceValue =
    kpis.totalRegistered > 0 && kpis.attendancePct !== null
      ? `${kpis.attendancePct}%`
      : "—";

  return (
    <section>
      <SectionHeading title={`Resumen últimos ${kpis.periodDays} días`} />
      <StatGrid>
        <StatCard
          label="Asistencia global"
          value={attendanceValue}
          hint={
            kpis.totalRegistered > 0
              ? `${kpis.totalRegistered} registros en el periodo`
              : "Sin registros en el periodo"
          }
          icon={Activity}
          tone="primary"
        />
        <StatCard
          label="Sesiones"
          value={String(kpis.sessionCount)}
          hint="Entrenamientos registrados"
          icon={CalendarDays}
        />
        <StatCard
          label="Jugadores activos"
          value={String(kpis.activePlayers)}
          hint={
            kpis.playersWithRecords > 0
              ? `${kpis.playersWithRecords} con al menos un registro`
              : "Plantel activo"
          }
          icon={Users}
          tone="success"
        />
        <StatCard
          label="Evaluaciones tests"
          value={String(kpis.testEvaluations)}
          hint="Mediciones registradas"
          icon={ClipboardList}
        />
      </StatGrid>
    </section>
  );
}
