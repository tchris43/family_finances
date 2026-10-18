"use client";

import { useActionState, useState } from "react";
import { createInvite, createResetLink } from "./actions";

const btn =
  "rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60";
const ghost =
  "rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent)]";

function LinkBox({ link, message }: { link: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", link);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-[var(--border)] bg-white/70 p-3">
      <p className="break-all font-mono text-xs">{link}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={btn}>
          {copied ? "Copied" : "Copy link"}
        </button>
        {canShare ? (
          <button
            type="button"
            className={ghost}
            onClick={() =>
              navigator.share({ text: message, url: link }).catch(() => {})
            }
          >
            Share…
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function NewInviteForm() {
  const [state, action, pending] = useActionState(createInvite, undefined);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="text-[var(--muted)]">Who is it for? (optional)</span>
          <input
            name="note"
            maxLength={80}
            placeholder="e.g. the Smiths"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Creating…" : "Create invite link"}
        </button>
      </form>
      {state?.code ? (
        <LinkBox
          link={`${origin}/signup?code=${state.code}`}
          message="Join me on our family budget app:"
        />
      ) : null}
    </div>
  );
}

export function ResetLinkButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(createResetLink, undefined);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div>
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <button type="submit" disabled={pending} className={ghost}>
          {pending ? "Creating…" : "Reset password link"}
        </button>
      </form>
      {state?.error ? (
        <p className="mt-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state?.token ? (
        <LinkBox
          link={`${origin}/reset?token=${state.token}`}
          message="Reset your password here (link works once, for 24 hours):"
        />
      ) : null}
    </div>
  );
}
