import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">The page you are looking for does not exist.</p>
      <ButtonLink href="/" className="mt-6">
        Back to today
      </ButtonLink>
    </div>
  );
}
