"use client";

import { useActionState, useState } from "react";
import { createRecoveryCode } from "@/app/accounts/security-actions";

export function RecoveryCodeCard({ hasCode }: { hasCode: boolean }) {
  const [state, action, pending] = useActionState(createRecoveryCode, undefined);
  const [copied, setCopied] = useState(false);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your recovery code:", code);
    }
  }

  return (
    <div className="mt-4 max-w-sm">
      {state?.code ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-4">
          <p className="text-sm font-medium">Your recovery code</p>
          <p className="mt-2 break-all font-mono text-lg tracking-wide">
            {state.code}
          </p>
          <button
            type="button"
            onClick={() => copy(state.code as string)}
            className="mt-3 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
          >
            {copied ? "Copied" : "Copy code"}
          </button>
          <p className="mt-3 text-sm text-amber-900">
            This is the only time it&rsquo;s shown. Save it in a password
            manager or somewhere safe — it&rsquo;s how you get back in if you
            forget your password.
          </p>
        </div>
      ) : (
        <>
          <p
            className={`text-sm ${hasCode ? "text-teal-800" : "text-amber-900"}`}
          >
            {hasCode
              ? "A recovery code is set."
              : "No recovery code yet — without one, a forgotten password needs someone to send you a reset link."}
          </p>
          <form action={action} className="mt-3 grid gap-3">
            <label className="text-sm">
              <span className="text-[var(--muted)]">
                Current password (to confirm it&rsquo;s you)
              </span>
              <input
                name="current"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </label>
            {state?.error ? (
              <p className="text-sm text-red-700" role="alert">
                {state.error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="w-fit rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending
                ? "Creating…"
                : hasCode
                  ? "Make a new recovery code"
                  : "Make my recovery code"}
            </button>
            {hasCode ? (
              <p className="text-xs text-[var(--muted)]">
                Making a new one stops the old code from working.
              </p>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}
