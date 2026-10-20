import Link from "next/link";
import type { MasteryDistribution } from "@/core/analytics";
import { Card, CardTitle } from "@/components/ui/card";
import { MasteryDistributionBar } from "@/components/ui/mastery-distribution";

/** Mastery of one skill: how many items are in each state. */
export function MasteryCard({
  title,
  description,
  distribution,
  labels,
  href,
  linkLabel,
}: {
  title: string;
  description?: string;
  distribution: MasteryDistribution;
  labels: Record<keyof MasteryDistribution, string>;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-4">
        <CardTitle>{title}</CardTitle>
        {href && linkLabel && (
          <Link href={href} className="text-sm text-accent">
            {linkLabel}
          </Link>
        )}
      </div>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">
        <MasteryDistributionBar distribution={distribution} labels={labels} />
      </div>
    </Card>
  );
}
