export function SessionProgress({ index, total }: { index: number; total: number }) {
  return (
    <div className="mb-6 flex items-center gap-3" aria-label={`Item ${index + 1} of ${total}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>
      <span className="text-sm text-muted tabular-nums">
        {index + 1} / {total}
      </span>
    </div>
  );
}
