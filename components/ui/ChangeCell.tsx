export function ChangeCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="font-mono text-xs text-text-secondary">—</span>;
  const up = value >= 0;
  return (
    <span className={`block text-right font-mono text-xs tabular-nums ${up ? "text-green" : "text-red"}`}>
      {up ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}
