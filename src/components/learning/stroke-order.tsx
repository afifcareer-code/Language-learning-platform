"use client";

import { useEffect, useState } from "react";

/** How many strokes are drawn so far; restarts when `run` changes. */
function useStrokeAnimation(total: number, animate: boolean, run: number): number {
  const [state, setState] = useState({ run, shown: animate ? 0 : total });
  const reduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!animate || reduce) return;
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setState({ run, shown: n });
      if (n >= total) clearInterval(timer);
    }, 550);
    return () => clearInterval(timer);
  }, [total, animate, run, reduce]);
  if (!animate || reduce) return total;
  return state.run === run ? state.shown : 0;
}

/**
 * Shows how a character is written: its strokes drawn one after another, in order, each
 * numbered where it starts. Generic: it only needs stroke paths in writing order.
 */
export function StrokeOrder({
  strokes,
  viewBox,
  label,
  replayLabel,
  size = 160,
  animate = true,
}: {
  strokes: string[];
  viewBox: number;
  label: string;
  replayLabel: string;
  size?: number;
  animate?: boolean;
}) {
  const [run, setRun] = useState(0);
  const shown = useStrokeAnimation(strokes.length, animate, run);

  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        role="img"
        aria-label={label}
        width={size}
        height={size}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        className="rounded-xl border border-line bg-paper"
        data-testid="stroke-order"
      >
        <line
          x1={viewBox / 2}
          y1={0}
          x2={viewBox / 2}
          y2={viewBox}
          className="stroke-line"
          strokeDasharray="2 3"
        />
        <line
          x1={0}
          y1={viewBox / 2}
          x2={viewBox}
          y2={viewBox / 2}
          className="stroke-line"
          strokeDasharray="2 3"
        />
        {strokes.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={i < shown ? (i === shown - 1 ? "stroke-accent" : "stroke-ink") : "stroke-line"}
            data-stroke={i + 1}
          />
        ))}
        {strokes.slice(0, shown).map((d, i) => {
          const start = /M\s*([\d.]+)[ ,]([\d.-]+)/.exec(d);
          if (!start) return null;
          return (
            <text
              key={`n${i}`}
              x={Number(start[1]) - 4}
              y={Number(start[2]) - 2}
              fontSize={8}
              className="fill-accent"
            >
              {i + 1}
            </text>
          );
        })}
      </svg>
      {animate && (
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="min-h-11 text-sm font-medium text-accent"
        >
          {replayLabel}
        </button>
      )}
    </figure>
  );
}
