import { cn } from "@/shared/cn";

/** A circular gauge for a ratio in [0, 1]. The label is the accessible value. */
export function ProgressRing({
  ratio,
  label,
  size = 88,
  tone = "accent",
  className,
}: {
  ratio: number;
  label: string;
  size?: number;
  tone?: "accent" | "success" | "warning";
  className?: string;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, ratio));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-sunken"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={cn(
            "transition-[stroke-dashoffset] duration-500",
            tone === "accent" && "stroke-accent",
            tone === "success" && "stroke-success",
            tone === "warning" && "stroke-warning",
          )}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums"
        aria-hidden="true"
      >
        {label}
      </span>
    </div>
  );
}
