import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export default function ForgotPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-[var(--muted)]">
        Family Finance
      </p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight text-[var(--foreground)]">
        Forgot your password?
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Enter your login email and the recovery code you saved, then choose a
        new password.
      </p>

      <ForgotForm />

      <p className="mt-6 text-sm text-[var(--muted)]">
        Don&rsquo;t have a recovery code? Ask whoever invited you for a reset
        link.
      </p>
      <Link
        href="/login"
        className="mt-3 text-sm text-[var(--accent)] hover:underline"
      >
        Back to sign in
      </Link>
    </main>
  );
}
