import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy — Family Finance" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-[var(--muted)]">
        Family Finance
      </p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight">
        Privacy, plainly
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        This is a small app run by one person for friends and family — not a
        company. Here is exactly how your data is handled.
      </p>

      <h2 className="mt-8 font-serif text-xl">What is stored</h2>
      <p className="mt-2 text-sm leading-relaxed">
        What you enter: accounts, balances, transactions, buckets, goals, notes,
        and your shopping list, plus your household name and login email.
        Passwords are stored only as a one-way hash — nobody, including the
        person running the app, can read your password.
      </p>

      <h2 className="mt-8 font-serif text-xl">Who can see it</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Other households can&rsquo;t: every record belongs to one household and
        the app only ever shows you your own. The app&rsquo;s admin can send
        invites and password-reset links and sees household names and login
        emails, but the app has no screen that shows anyone&rsquo;s finances.
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        To be upfront: your data is <strong>not end-to-end encrypted</strong>.
        Whoever runs the app&rsquo;s database could technically read it, the
        same as with most hosted apps.
      </p>

      <h2 className="mt-8 font-serif text-xl">Where it lives</h2>
      <p className="mt-2 text-sm leading-relaxed">
        In a hosted Postgres database (Neon), reached over encrypted
        connections, and served by Vercel. No ads, no analytics, no selling or
        sharing of data.
      </p>

      <h2 className="mt-8 font-serif text-xl">Your copy and your exit</h2>
      <p className="mt-2 text-sm leading-relaxed">
        On the Accounts page you can download a full backup of your household at
        any time. If you want your household deleted, ask the admin.
      </p>

      <h2 className="mt-8 font-serif text-xl">Passwords</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Your household shares one login. You can change the password on the
        Accounts page. You can also make a recovery code there (stored only as a
        one-way hash, like your password) that lets you reset a forgotten
        password yourself. If you have neither, ask the admin for a one-time
        reset link.
      </p>

      <Link
        href="/login"
        className="mt-10 inline-block text-sm text-[var(--accent)] hover:underline"
      >
        Back to sign in
      </Link>
    </main>
  );
}
