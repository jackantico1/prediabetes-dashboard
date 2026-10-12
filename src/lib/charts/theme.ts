/**
 * Chart tokens (light theme). Series colors follow the dataviz reference palette;
 * status colors are reserved for target bands and never reused as series.
 */
export const chart = {
  series1: "#2a78d6", // blue: primary measure (glucose, weight)
  series2: "#eb6834", // orange: second entity (e.g. previous period)
  series3: "#1baf7a", // aqua: third entity (sleep)
  series4: "#eda100", // yellow
  good: "#008300",
  goodWash: "rgba(0, 131, 0, 0.08)",
  warning: "#b86e00",
  warningWash: "rgba(237, 161, 0, 0.10)",
  critical: "#c62828",
  grid: "#eef2f6",
  axis: "#94a3b8",
  text: "#0f172a",
  textMuted: "#64748b",
  surface: "#ffffff",
} as const;

export const axisTick = { fontSize: 11, fill: chart.axis } as const;
