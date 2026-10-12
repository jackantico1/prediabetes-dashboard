"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface WeeklyPoint {
  day: string;
  avgGlucose: number;
  sleepHours: number;
  steps: number;
}

interface Props {
  data: WeeklyPoint[];
}

export function WeeklyCorrelation({ data }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">Weekly Correlation</h2>
      <p className="text-xs text-slate-400 mb-4">Sleep & steps vs. daily average glucose</p>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <YAxis yAxisId="glucose" domain={[80, 160]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="mg" />
          <YAxis yAxisId="sleep" orientation="right" domain={[0, 10]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="h" />
          <Tooltip
            formatter={(v, name) => {
              const val = Number(v);
              if (name === "Avg Glucose") return [`${val} mg/dL`, name];
              if (name === "Sleep") return [`${val}h`, name];
              return [val.toLocaleString(), name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="glucose" dataKey="avgGlucose" name="Avg Glucose" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
          <Line yAxisId="sleep" dataKey="sleepHours" name="Sleep" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
