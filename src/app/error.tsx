"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl tracking-tight">Couldn’t load</h1>
      <p className="mt-3 text-[var(--muted)]">
        Something broke after sign-in. Open{" "}
        <a href="/api/health" className="text-[var(--accent)] underline">
          /api/health
        </a>{" "}
        (while logged in if possible) and check{" "}
        <code className="text-sm">dbOk</code> / env flags.
      </p>
      {error?.message ? (
        <pre className="mt-4 overflow-x-auto rounded-md border border-[var(--border)] bg-white/70 p-3 text-xs text-red-900 whitespace-pre-wrap">
          {error.message}
        </pre>
      ) : null}
      {error?.digest ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
      >
        Try again
      </button>
    </main>
  );
}
