import { LanguageCard } from "@/components/learning/language-card";
import { Button } from "@/components/ui/button";
import { frameworkName, languageName } from "@/localization/labels";
import type { Messages } from "@/localization/messages";
import type { Translator } from "@/localization/translator";
import type { LanguageOption, LearningContext } from "@/server/services/learning-context";
import { continueLanguage } from "./actions";

/**
 * "What do you want to learn?": the platform's front door. Lists the catalog;
 * only available languages can be opened.
 */
export function LanguageSelection({
  t,
  languages,
  started,
  current,
}: {
  t: Translator<Messages>;
  languages: LanguageOption[];
  /** Languages the learner has started, with their current level title. */
  started: Record<string, string>;
  current: LearningContext | null;
}) {
  const returning = Object.keys(started).length > 0;
  const available = languages.filter((l) => l.status === "available");
  const planned = languages.filter((l) => l.status !== "available");

  const card = (l: LanguageOption) => {
    const level = started[l.code];
    return (
      <li key={l.code}>
        <LanguageCard
          code={l.code}
          nativeName={l.nativeName}
          name={languageName(t, l.code)}
          framework={frameworkName(t, l.proficiencyFramework)}
          statusLabel={t.dynamic(["languages", "status", l.status], undefined, l.status)}
          available={l.status === "available"}
          href={l.status === "available" ? `/languages/${l.code}` : undefined}
          detail={level ? t("onboarding.inProgress", { level }) : undefined}
          highlighted={current?.language.code === l.code}
          action={
            level ? (
              <form action={continueLanguage}>
                <input type="hidden" name="language" value={l.code} />
                <Button type="submit" className="w-full">
                  {t("common.actions.continue")}
                </Button>
              </form>
            ) : undefined
          }
        />
      </li>
    );
  };

  return (
    <div className="pt-6 md:pt-12">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {returning ? t("onboarding.switchTitle") : t("onboarding.title")}
      </h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">
        {returning ? t("onboarding.switchSubtitle") : t("onboarding.subtitle")}
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{available.map(card)}</ul>

      {planned.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-medium tracking-wide text-muted uppercase">
            {t("languages.status.coming_soon")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{planned.map(card)}</ul>
        </section>
      )}
    </div>
  );
}
