"use client";

import { useFormStatus } from "react-dom";

/**
 * Drop-in replacement for <button type="submit">. Disables itself and swaps
 * its label while the enclosing form's action is in flight, so a tap always
 * gets instant visual feedback instead of a dead click during the round trip.
 * Works whether the form's `action` is a server function or a client wrapper
 * around one — useFormStatus tracks either.
 */
export function SubmitButton({
  children,
  pendingLabel = "…",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
