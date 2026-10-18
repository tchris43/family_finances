import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { passwordResets } from "@/db/schema";
import { hashToken } from "@/lib/tokens";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let valid = false;
  if (token) {
    const [row] = await getDb()
      .select({ id: passwordResets.id })
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, hashToken(token)),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, sql`now()`),
        ),
      )
      .limit(1);
    valid = !!row;
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-[var(--muted)]">
        Family Finance
      </p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight text-[var(--foreground)]">
        Reset your password
      </h1>

      {valid && token ? (
        <>
          <p className="mt-2 text-[var(--muted)]">
            Choose a new password for your household login.
          </p>
          <ResetForm token={token} />
        </>
      ) : (
        <>
          <p className="mt-4 text-[var(--muted)]" role="alert">
            This reset link is invalid, expired, or already used. Ask whoever
            invited you for a new one.
          </p>
          <Link
            href="/login"
            className="mt-6 text-sm text-[var(--accent)] hover:underline"
          >
            Back to sign in
          </Link>
        </>
      )}
    </main>
  );
}
