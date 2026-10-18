"use client";

import { useActionState } from "react";
import { resetPassword } from "./actions";

const input =
  "rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--foreground)] outline-none focus:border-[var(--accent)]";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  return (
    <form action={action} className="mt-10 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Confirm new password</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={input}
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
        className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
