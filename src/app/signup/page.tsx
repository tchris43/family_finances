import Link from "next/link";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-[var(--muted)]">
        Family Finance
      </p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight text-[var(--foreground)]">
        Create your household
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Everyone in your household shares one login. Your invite link already
        has your code filled in.
      </p>

      <SignupForm defaultCode={(code ?? "").slice(0, 40)} />

      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have a household?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-xs text-[var(--muted)]">
        By creating a household you agree to how your data is handled —{" "}
        <Link href="/privacy" className="hover:underline">
          read the privacy note
        </Link>
        .
      </p>
    </main>
  );
}
