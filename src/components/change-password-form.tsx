"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/app/accounts/security-actions";

const field =
  "mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-4 grid max-w-sm gap-3">
      <label className="text-sm">
        <span className="text-[var(--muted)]">Current password</span>
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className={field}
        />
      </label>
      <label className="text-sm">
        <span className="text-[var(--muted)]">New password</span>
        <input
          name="next"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={field}
        />
      </label>
      <label className="text-sm">
        <span className="text-[var(--muted)]">Confirm new password</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={field}
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-teal-800">Password updated.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
