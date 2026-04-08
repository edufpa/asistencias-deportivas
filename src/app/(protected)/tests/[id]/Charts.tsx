"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

type TeamChartProps = {
  data: { name: string; value: number }[];
  unit: string;
  formatValue?: (n: number) => string;
};

type IndividualChartProps = {
  data: { date: string; value: number }[];
  unit: string;
  testName: string;
  formatValue?: (n: number) => string;
};

export function TeamBarChart({ data, unit, formatValue }: TeamChartProps) {
  const fmt = formatValue ?? ((n: number) => `${n} ${unit}`);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} width={52} />
        <Tooltip formatter={(v) => [fmt(Number(v)), "Mejor marca"]} />
        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IndividualLineChart({ data, unit, testName, formatValue }: IndividualChartProps) {
  const fmt = formatValue ?? ((n: number) => `${n} ${unit}`);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} width={52} />
        <Tooltip formatter={(v) => [fmt(Number(v)), testName]} />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 5 }}
          activeDot={{ r: 7 }}
          name={`${testName} (${unit})`}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
