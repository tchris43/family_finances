"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/plan", label: "Plan" },
  { href: "/goals", label: "Goals" },
  { href: "/cashflow", label: "Cashflow" },
  { href: "/shopping", label: "Shopping" },
  { href: "/notes", label: "Notes" },
  { href: "/decisions", label: "Decide" },
  { href: "/trends", label: "Trends" },
  { href: "/accounts", label: "Accounts" },
] as const;

export function AppNav({
  availableCents,
}: {
  availableCents?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,white)] backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="font-serif text-lg tracking-tight">
          Family Finance
        </Link>

        <div className="flex items-center gap-3">
          {typeof availableCents === "number" ? (
            <p className="hidden text-sm text-[var(--muted)] sm:block">
              Available{" "}
              <span className="font-medium tabular-nums text-[var(--foreground)]">
                {formatMoney(availableCents)}
              </span>
            </p>
          ) : null}

          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm sm:hidden"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="mx-auto hidden w-full max-w-3xl gap-1 px-6 pb-3 sm:flex">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                active
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile menu */}
      {open ? (
        <nav className="border-t border-[var(--border)] px-4 py-3 sm:hidden">
          {typeof availableCents === "number" ? (
            <p className="mb-3 text-sm text-[var(--muted)]">
              Available{" "}
              <span className="font-medium tabular-nums text-[var(--foreground)]">
                {formatMoney(availableCents)}
              </span>
            </p>
          ) : null}
          <ul className="grid grid-cols-2 gap-2">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-3 py-2.5 text-center text-sm ${
                      active
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border)] text-[var(--foreground)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
