"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chart, axisTick } from "@/lib/charts/theme";
import { formatShortDate } from "@/lib/time";

export interface TrendPoint {
  date: string;
  value: number;
}

interface RefLine {
  y: number;
  label: string;
  color?: string;
}

interface Props {
  data: TrendPoint[];
  unit?: string;
  color?: string;
  refLines?: RefLine[];
  height?: number;
  decimals?: number;
  /** Pad the y-domain by this much above and below the data (default 8% of range, min 2 units). */
  yPad?: number;
}

function makeTooltip(unit: string, decimals: number) {
  return function TrendTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: TrendPoint }> }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    if (!p) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-md">
        <p className="text-slate-500">{formatShortDate(p.date)}</p>
        <p className="font-semibold text-slate-900 text-sm tabular-nums">
          {p.value.toFixed(decimals)} {unit}
        </p>
      </div>
    );
  };
}

export function TrendLineChart({ data, unit = "", color = chart.series1, refLines = [], height = 220, decimals = 0, yPad }: Props) {
  const values = [...data.map((d) => d.value), ...refLines.map((r) => r.y)];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = yPad ?? Math.max(2, (hi - lo) * 0.12);
  const Tip = makeTooltip(unit, decimals);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: refLines.length ? 64 : 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: chart.grid }} tickFormatter={formatShortDate} minTickGap={28} />
        <YAxis domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tick={axisTick} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={Tip} cursor={{ stroke: chart.axis, strokeWidth: 1 }} />
        {refLines.map((r) => (
          <ReferenceLine key={r.label} y={r.y} stroke={r.color ?? chart.good} strokeWidth={1} label={{ value: r.label, position: "right", fontSize: 10, fill: r.color ?? chart.good }} />
        ))}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={data.length <= 40 ? { r: 4, fill: color, stroke: chart.surface, strokeWidth: 2 } : false}
          activeDot={{ r: 5, fill: color, stroke: chart.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
