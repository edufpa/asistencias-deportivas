"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type Props = {
  data: { date: string; value: number }[];
  unit: string;
  testName: string;
};

export function TestLineChart({ data, unit, testName }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${v} ${unit}`, testName]} />
        <Legend />
        <Line
          type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
          dot={{ r: 5 }} activeDot={{ r: 7 }} name={`${testName} (${unit})`}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
