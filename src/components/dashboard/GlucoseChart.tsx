"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";
import type { GlucoseReading } from "@/lib/adapters/types";

interface Props {
  readings: GlucoseReading[];
}

export function GlucoseChart({ readings }: Props) {
  const data = readings.map((r) => ({
    time: r.timestamp.getTime(),
    glucose: r.value,
    label: format(r.timestamp, "h:mm a"),
    tag: r.mealTag,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-2 text-xs shadow">
        <p className="font-semibold">{d.label}</p>
        <p className="text-blue-600">{d.glucose} mg/dL</p>
        {d.tag && <p className="text-slate-400 capitalize">{d.tag}</p>}
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">Glucose — Last 24h</h2>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={["auto", "auto"]}
            tickFormatter={(v) => format(new Date(v), "ha")}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
          />
          <YAxis domain={[60, 200]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit=" mg" />
          <Tooltip content={<CustomTooltip />} />
          {/* Target band: 70–140 */}
          <Area dataKey={() => 140} baseValue={70} fill="#d1fae5" stroke="none" fillOpacity={0.4} legendType="none" />
          <ReferenceLine y={140} stroke="#10b981" strokeDasharray="4 2" label={{ value: "140", position: "right", fontSize: 10, fill: "#10b981" }} />
          <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 2" label={{ value: "70", position: "right", fontSize: 10, fill: "#10b981" }} />
          <Line dataKey="glucose" dot={false} stroke="#3b82f6" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
