"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Props = {
  data: { date: string; attendancePct: number }[];
  categoryAvg?: number | null;
};

export function AttendanceLineChart({ data, categoryAvg }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    dateLabel: format(new Date(`${d.date}T12:00:00`), "d MMM", { locale: es }),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={36} />
        <Tooltip
          formatter={(v) => [`${v}%`, "Asistencia acumulada"]}
          labelFormatter={(_, payload) => {
            const row = payload?.[0]?.payload as { date?: string } | undefined;
            if (!row?.date) return "";
            return format(new Date(`${row.date}T12:00:00`), "d MMM yyyy", { locale: es });
          }}
        />
        <Legend />
        {categoryAvg != null && (
          <ReferenceLine
            y={categoryAvg}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: `Prom. cat. ${categoryAvg}%`, position: "insideTopRight", fontSize: 11 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="attendancePct"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Tu asistencia (%)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
