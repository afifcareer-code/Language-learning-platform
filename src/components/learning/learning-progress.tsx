import { Card } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";

export interface ProgressMetric {
  title: string;
  ratio: number;
  value: string;
  detail: string;
  tone?: "accent" | "success" | "warning";
}

/**
 * Course progress, skill mastery and learning readiness side by side: three
 * different questions, deliberately never merged into one number.
 */
export function LearningProgress({ metrics, explainer }: { metrics: ProgressMetric[]; explainer: string }) {
  return (
    <Card>
      <div className="grid gap-6 sm:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.title}
            className="flex items-center gap-4 sm:flex-col sm:items-start lg:flex-row lg:items-center"
          >
            <ProgressRing ratio={m.ratio} label={m.value} tone={m.tone} />
            <div className="min-w-0">
              <p className="font-medium">{m.title}</p>
              <p className="mt-1 text-sm text-muted">{m.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 border-t border-line pt-4 text-sm text-muted">{explainer}</p>
    </Card>
  );
}
