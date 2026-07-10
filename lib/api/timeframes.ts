export const CHANGE_TIMEFRAMES = [
  { key: "1h", label: "1h" },
  { key: "5h", label: "5h" },
  { key: "1d", label: "1d" },
  { key: "7d", label: "7d" },
  { key: "28d", label: "28d" },
  { key: "1y", label: "1y" },
  { key: "5y", label: "5y" },
] as const;

export type ChangeTimeframe = (typeof CHANGE_TIMEFRAMES)[number]["key"];

export type ChangeMap = Partial<Record<ChangeTimeframe, number>>;

export function fmtChange(pct: number | null | undefined) {
  if (pct == null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}
