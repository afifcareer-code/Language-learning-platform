import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Items of one skill that are due for review. */
export function ReviewCard({
  title,
  countLabel,
  preview,
  previewLang,
  href,
  startLabel,
}: {
  title: string;
  countLabel: string;
  preview: string[];
  previewLang?: string;
  href?: string;
  startLabel: string;
}) {
  return (
    <Card className="flex flex-col">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-muted">{countLabel}</p>
      <p lang={previewLang} className="mt-4 flex-1 font-jp text-2xl tracking-widest break-all">
        {preview.join(" ")}
      </p>
      {href && (
        <ButtonLink href={href} className="mt-6">
          {startLabel}
        </ButtonLink>
      )}
    </Card>
  );
}
