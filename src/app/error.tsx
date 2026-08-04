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
        Something broke after sign-in. Often this is a missing env var on Vercel
        (<code className="text-sm">DATABASE_URL</code> /{" "}
        <code className="text-sm">AUTH_SECRET</code> /{" "}
        <code className="text-sm">AUTH_URL</code>) or Vercel Deployment
        Protection blocking the app.
      </p>
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
