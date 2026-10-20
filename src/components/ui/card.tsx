import type { ComponentProps } from "react";
import { cn } from "@/shared/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface p-5 md:p-6", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2 className={cn("text-sm font-medium tracking-wide text-muted uppercase", className)} {...props} />
  );
}
