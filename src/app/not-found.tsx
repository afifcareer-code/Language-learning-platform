import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/localization/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-semibold">{t("common.notFound.title")}</h1>
      <p className="mt-2 text-muted">{t("common.notFound.body")}</p>
      <ButtonLink href="/" className="mt-6">
        {t("common.actions.backToDashboard")}
      </ButtonLink>
    </div>
  );
}
