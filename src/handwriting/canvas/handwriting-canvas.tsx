"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import type { PointerKind, Stroke, StrokePoint } from "../strokes/types";

export interface HandwritingCanvasProps {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  /** Model text rendered behind the canvas. */
  guideText?: string;
  /** 0 hides the guide. */
  guideOpacity?: number;
  disabled?: boolean;
  /** A wide surface (2:1) for words and sentences, without the single-character cross guide. */
  wide?: boolean;
  label: string;
}

const INK_WIDTH = 0.032; // relative to canvas size

function toPointerKind(type: string): PointerKind {
  return type === "pen" || type === "touch" || type === "mouse" ? type : "unknown";
}

/**
 * Square writing surface capturing device-independent stroke data via Pointer
 * Events (mouse, touch and any stylus). Pressure is recorded only for pens.
 */
export function HandwritingCanvas({
  strokes,
  onStrokesChange,
  guideText,
  guideOpacity = 0,
  disabled,
  wide = false,
  label,
}: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  // Point timestamps are relative to the first point of the sample.
  const origin = useRef(0);

  // Redraw committed strokes whenever they change or the canvas resizes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const redraw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const stroke of strokes) drawStroke(ctx, stroke.points, canvas.width);
    };
    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [strokes]);

  function pointFrom(e: PointerEvent<HTMLCanvasElement> | globalThis.PointerEvent): StrokePoint {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      t: Math.max(0, Math.round(e.timeStamp - origin.current)),
      pressure: e.pointerType === "pen" ? clamp01(e.pressure) : null,
    };
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (strokes.length === 0) origin.current = e.timeStamp;
    current.current = {
      index: strokes.length,
      pointerType: toPointerKind(e.pointerType),
      points: [pointFrom(e)],
    };
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    const stroke = current.current;
    const canvas = canvasRef.current;
    if (!stroke || !canvas) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const ctx = canvas.getContext("2d");
    for (const ev of events.length ? events : [e.nativeEvent]) {
      stroke.points.push(pointFrom(ev));
    }
    if (ctx) drawStroke(ctx, stroke.points.slice(-events.length - 1), canvas.width);
  }

  function onPointerUp() {
    const stroke = current.current;
    current.current = null;
    if (stroke) onStrokesChange([...strokes, stroke]);
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-line bg-surface ${wide ? "aspect-[2/1]" : "aspect-square"}`}
      style={{ containerType: "inline-size" }}
    >
      {/* Practice-sheet cross guide */}
      <svg className="pointer-events-none absolute inset-0 size-full text-line" aria-hidden="true">
        {!wide && <line x1="50%" y1="0" x2="50%" y2="100%" stroke="currentColor" strokeDasharray="6 6" />}
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeDasharray="6 6" />
      </svg>
      {guideText && guideOpacity > 0 && (
        <span
          lang="ja"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-jp leading-none select-none"
          style={{ fontSize: "72cqw", opacity: guideOpacity, color: "var(--guide)" }}
        >
          {guideText}
        </span>
      )}
      <canvas
        ref={canvasRef}
        aria-label={label}
        role="img"
        className="absolute inset-0 size-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function drawStroke(ctx: CanvasRenderingContext2D, points: StrokePoint[], size: number) {
  const ink = getComputedStyle(ctx.canvas).getPropertyValue("--ink").trim() || "#1d1c1a";
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const base = INK_WIDTH * size;
  const first = points[0];
  if (!first) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(first.x * size, first.y * size, base / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    ctx.lineWidth = b.pressure === null ? base : base * (0.5 + b.pressure);
    ctx.beginPath();
    ctx.moveTo(a.x * size, a.y * size);
    ctx.lineTo(b.x * size, b.y * size);
    ctx.stroke();
  }
}
