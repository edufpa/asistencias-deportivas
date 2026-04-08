"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type Props = {
  data: { date: string; value: number }[];
  unit: string;
  testName: string;
  /** Si se pasa, formatea valores en eje Y y tooltip (p. ej. tiempos M:SS.cc) */
  formatValue?: (n: number) => string;
};

export function TestLineChart({ data, unit, testName, formatValue }: Props) {
  const fmt = formatValue ?? ((n: number) => `${n} ${unit}`);
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} width={52} />
        <Tooltip formatter={(v) => [fmt(Number(v)), testName]} />
        <Legend />
        <Line
          type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
          dot={{ r: 5 }} activeDot={{ r: 7 }} name={`${testName} (${unit})`}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
