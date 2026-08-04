import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-[var(--muted)]">
        Family Finance
      </p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight text-[var(--foreground)]">
        Sign in
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Shared household login — same email and password for both of you.
      </p>

      <LoginForm />

      {params.error === "credentials" ? (
        <p className="mt-6 text-sm text-red-700" role="alert">
          Email or password didn’t match. Try again.
        </p>
      ) : null}
    </main>
  );
}

function LoginForm() {
  async function loginAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/login?error=credentials");
      }
      throw error;
    }
  }

  return (
    <form action={loginAction} className="mt-10 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--muted)]">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <button
        type="submit"
        className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        Sign in
      </button>
    </form>
  );
}
