"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chart, axisTick } from "@/lib/charts/theme";
import { formatShortDate } from "@/lib/time";

interface Point {
  date: string;
  value: number;
}

function BarTooltip({ active, payload, unit }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Point }>; unit: string }) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-slate-500">{formatShortDate(p.date)}</p>
      <p className="font-semibold text-slate-900 text-sm tabular-nums">{p.value.toLocaleString()} {unit}</p>
    </div>
  );
}

export function DailyBarChart({ data, unit, target, color = chart.series1, height = 200 }: { data: Point[]; unit: string; target?: number; color?: string; height?: number }) {
  const max = Math.max(target ?? 0, ...data.map((d) => d.value));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: target ? 64 : 12, bottom: 0, left: -8 }} barCategoryGap={2}>
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: chart.grid }} tickFormatter={formatShortDate} minTickGap={28} />
        <YAxis domain={[0, Math.ceil(max * 1.08)]} tick={axisTick} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <Tooltip content={(p) => <BarTooltip {...p} unit={unit} />} cursor={{ fill: chart.grid }} />
        {target !== undefined && <ReferenceLine y={target} stroke={chart.good} strokeWidth={1} label={{ value: `goal ${target.toLocaleString()}`, position: "right", fontSize: 10, fill: chart.good }} />}
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
