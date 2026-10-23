import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { LOCALE_NAMES, LOCALES } from "@/localization/config";
import { languageName } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { requireLearningContext } from "@/server/learning-context";
import { saveSettings } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.title") };
}

export default async function SettingsPage() {
  const { learner } = await getContext();
  const { locale, t } = await getI18n();
  const learning = await requireLearningContext();

  return (
    <>
      <PageHeader title={t("settings.title")} />
      <form action={saveSettings} className="grid max-w-2xl gap-4 md:gap-6">
        <Card>
          <fieldset>
            <legend className="text-lg font-semibold">{t("settings.language.title")}</legend>
            <p className="mt-1 text-sm text-muted">{t("settings.language.description")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {LOCALES.map((l) => (
                <label
                  key={l}
                  className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-line px-4 has-checked:border-accent has-checked:bg-accent-soft"
                >
                  <input
                    type="radio"
                    name="uiLocale"
                    value={l}
                    defaultChecked={l === locale}
                    className="size-5 accent-[var(--accent)]"
                  />
                  <span lang={l} className="font-medium">
                    {LOCALE_NAMES[l]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="mt-5 text-sm text-muted">
            {t("settings.learningLanguage")}:{" "}
            <span className="font-medium text-ink">
              {languageName(t, learning.language.code)} · {learning.language.nativeName} ·{" "}
              {learning.level.title}
            </span>{" "}
            <Link href="/languages" className="font-medium text-accent">
              {t("dashboard.change")}
            </Link>
          </p>
        </Card>

        <Card>
          <label htmlFor="displayName" className="text-lg font-semibold">
            {t("settings.name.label")}
          </label>
          <input
            id="displayName"
            name="displayName"
            defaultValue={learner.displayName}
            required
            maxLength={80}
            className="mt-3 min-h-12 w-full rounded-xl border border-line bg-paper px-4 outline-none focus:border-accent"
          />
        </Card>

        <div>
          <Button type="submit">{t("common.actions.save")}</Button>
        </div>
      </form>

      <Card className="mt-6" aria-labelledby="credits-title">
        <h2 id="credits-title" className="text-lg font-semibold">
          {t("settings.credits.title")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("settings.credits.audio")}</p>
        <a
          href="/audio/CREDITS.md"
          className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent"
        >
          {t("settings.credits.details")}
        </a>
      </Card>
    </>
  );
}
