import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-[var(--muted)]">
        Family Finance
      </p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight text-[var(--foreground)]">
        Create your household
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        You need an invite code. Everyone in your household shares one login.
      </p>

      <SignupForm />

      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have a household?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
