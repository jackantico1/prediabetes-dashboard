"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chart, axisTick } from "@/lib/charts/theme";
import { formatShortDate } from "@/lib/time";

interface Point {
  date: string;
  value: number;
}

interface Props {
  data: Point[];
  target: number;
  height?: number;
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Point }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-slate-500">{formatShortDate(p.date)}</p>
      <p className="font-semibold text-slate-900 text-sm tabular-nums">{p.value} mg/dL</p>
    </div>
  );
}

export function FastingTrendChart({ data, target, height = 240 }: Props) {
  const values = data.map((d) => d.value);
  const max = Math.max(130, ...values) + 8;
  const min = Math.min(80, ...values) - 8;
  const sparse = data.length <= 40;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 64, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: chart.grid }}
          tickFormatter={formatShortDate}
          minTickGap={28}
        />
        <YAxis domain={[min, max]} tick={axisTick} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={TrendTooltip} cursor={{ stroke: chart.axis, strokeWidth: 1 }} />
        <ReferenceLine y={target} stroke={chart.good} strokeWidth={1} label={{ value: `goal <${target}`, position: "right", fontSize: 10, fill: chart.good }} />
        <ReferenceLine y={126} stroke={chart.critical} strokeWidth={1} strokeOpacity={0.6} label={{ value: "126", position: "right", fontSize: 10, fill: chart.critical }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={chart.series1}
          strokeWidth={2}
          dot={sparse ? { r: 4, fill: chart.series1, stroke: chart.surface, strokeWidth: 2 } : false}
          activeDot={{ r: 5, fill: chart.series1, stroke: chart.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
