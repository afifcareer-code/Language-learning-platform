export function SessionProgress({ index, total, label }: { index: number; total: number; label: string }) {
  return (
    <div className="mb-6 flex items-center gap-3" aria-label={label}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full bg-accent-fill transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>
      <span className="text-sm text-muted tabular-nums">{label}</span>
    </div>
  );
}
