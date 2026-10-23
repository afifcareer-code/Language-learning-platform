import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { getI18n } from "@/localization/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.signup.title") };
}

export default function Page() {
  return <AuthForm mode="signup" />;
}
