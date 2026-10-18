"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/onboarding-actions";

/**
 * First-login guided tour.
 *
 * Design: the tour never dims or covers the page. A docked card sits at the
 * bottom (collapsible to a slim bar), the page gets bottom padding so nothing
 * is hidden behind it, and the thing being explained is outlined in place.
 *
 * State lives in localStorage so the tour survives route changes and reloads;
 * the database flag (households.onboarded_at) is the long-term source of truth.
 * AUDIT: <TourSync> (rendered on Home) seeds and clears the localStorage key.
 * If the key is missing on a not-yet-onboarded household, the tour never starts.
 */

const STORAGE_KEY = "ff-tour";
const EVENT = "ff-tour-change";

type TourState = { step: number; name: string };

type Step = {
  id: string;
  path: string;
  /** Matches a `data-tour` attribute on the page. Omit for a card-only step. */
  target?: string;
  title: string;
  body: string;
  tip?: string;
  cta?: string;
};

function steps(name: string): Step[] {
  return [
    {
      id: "welcome",
      path: "/",
      title: `Welcome, ${name}`,
      body: "Family Finance gives every dollar a job. This tour takes about two minutes. The page stays fully visible, so look around as we go.",
      tip: "Use Back and Next, or Skip any time.",
    },
    {
      id: "available",
      path: "/",
      target: "available",
      title: "Start here: Available to Assign",
      body: "This is money in your accounts that has no job yet. It also shows in the top bar on every page.",
      tip: "No paycheck needed first. The cash you have today counts.",
    },
    {
      id: "accounts",
      path: "/accounts",
      target: "accounts",
      title: "Add accounts with real balances",
      body: "Enter what each account holds right now. Mark one as Main and new transactions default to it.",
      tip: "When the bank statement disagrees, use Set balance.",
    },
    {
      id: "plan",
      path: "/plan",
      target: "buckets",
      title: "Buckets give money a job",
      body: "Groceries, Housing and a few others are already set up. Assign dollars from Available into each one, or move money between buckets.",
      tip: "Overspent? That is fine. A bucket can go negative and you cover it later.",
    },
    {
      id: "transaction",
      path: "/",
      target: "add-transaction",
      title: "Log money as it happens",
      body: "Use + Transaction for spends and paychecks. Balances, buckets and Available update together.",
      tip: "Entering things the same day keeps the numbers honest.",
    },
    {
      id: "goals",
      path: "/goals",
      target: "goals",
      title: "Goals are for longer-term targets",
      body: "House, car, emergency fund. Fund a goal from Available, or transfer from other buckets and goals.",
      tip: "Everyday spending never touches a goal.",
    },
    {
      id: "cashflow",
      path: "/cashflow",
      target: "cashflow",
      title: "See the month at a glance",
      body: "Income, goal contributions and planned expenses combine into one leftover number. It tells you if you need more income to stay on track.",
    },
    {
      id: "decide",
      path: "/decisions",
      target: "decide",
      title: "Can we afford it?",
      body: "Type a purchase amount. You get two answers: does it fit in cash, and how does it affect your goals.",
      tip: "Nothing here is saved. It is a safe place to think.",
    },
    {
      id: "trends",
      path: "/trends",
      target: "trends",
      title: "See where it went",
      body: "Spending by bucket and by month, so you can spot what is growing.",
    },
    {
      id: "shopping",
      path: "/shopping",
      target: "shopping",
      title: "A shared list for both of you",
      body: "Check items off while you shop. Notes is a shared scratch pad for reminders.",
    },
    {
      id: "install",
      path: "/shopping",
      title: "Put it on your iPhone home screen",
      body: "It then opens full screen like a normal app. Do this in Safari:",
    },
    {
      id: "finish",
      path: "/accounts",
      target: "accounts",
      title: "You're set. Add your first account.",
      body: "That is the one thing to do next. Everything else on Home fills in from there.",
      cta: "Add my first account",
    },
  ];
}

function readState(): TourState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TourState) : null;
  } catch {
    return null;
  }
}

function writeState(next: TourState | null) {
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // AUDIT: private mode / blocked storage — the tour just won't resume after a reload.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Rendered on Home. Starts the tour for a new household, clears it for an onboarded one. */
export function TourSync({
  onboarded,
  householdName,
}: {
  onboarded: boolean;
  householdName: string;
}) {
  useEffect(() => {
    const existing = readState();
    if (onboarded) {
      if (existing) writeState(null);
    } else if (!existing) {
      writeState({ step: 0, name: householdName });
    }
  }, [onboarded, householdName]);
  return null;
}

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="inline-block h-4 w-4 align-[-2px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<TourState | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [, startTransition] = useTransition();
  const dockRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => setState(readState());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const tourName = state?.name;
  const list = useMemo(() => (tourName ? steps(tourName) : []), [tourName]);
  const step = state ? list[Math.min(state.step, list.length - 1)] : null;
  const stepId = step?.id;
  const stepTarget = step?.target;
  const onStepPage = step?.path === pathname;

  const goTo = (index: number) => {
    if (!state) return;
    const clamped = Math.max(0, Math.min(index, list.length - 1));
    writeState({ ...state, step: clamped });
    const dest = list[clamped].path;
    if (dest !== pathname) router.push(dest);
  };

  const finish = (destination?: string) => {
    writeState(null);
    startTransition(() => {
      completeOnboarding();
    });
    if (destination) router.push(destination);
  };

  // Keep the outline glued to the target (it can load late after a route change,
  // move on scroll/resize, or resize when the dock expands).
  useEffect(() => {
    if (!stepTarget || !onStepPage) return;
    let frame = 0;
    let last = "";
    const tick = () => {
      const el = document.querySelector(`[data-tour="${stepTarget}"]`);
      const r = el ? el.getBoundingClientRect() : null;
      const key = r ? `${r.top}|${r.left}|${r.width}|${r.height}` : "";
      if (key !== last) {
        last = key;
        setRect(r);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stepTarget, onStepPage]);

  // Bring the target into the clear part of the screen (below the sticky header,
  // above the dock) once per step.
  useEffect(() => {
    if (!rect || !stepId || scrolledFor.current === stepId) return;
    scrolledFor.current = stepId;
    const dockH = dockRef.current?.offsetHeight ?? 0;
    const clearBottom = window.innerHeight - dockH - 16;
    if (rect.top < 120 || rect.bottom > clearBottom) {
      window.scrollBy({ top: rect.top - 130, behavior: "smooth" });
    }
  }, [rect, stepId]);
  useEffect(() => {
    scrolledFor.current = null;
  }, [stepId]);

  // Reserve room under the page for the dock so no content hides behind it.
  useEffect(() => {
    const dock = dockRef.current;
    if (!state || !dock) return;
    const apply = () => {
      document.body.style.paddingBottom = `${dock.offsetHeight + 8}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(dock);
    return () => {
      ro.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [state, collapsed]);

  if (!state || !step) return null;
  const ringRect = stepTarget && onStepPage ? rect : null;

  const index = list.indexOf(step);
  const isLast = index === list.length - 1;

  return (
    <>
      {ringRect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-40 rounded-lg transition-all duration-200"
          style={{
            top: ringRect.top - 6,
            left: ringRect.left - 6,
            width: ringRect.width + 12,
            height: ringRect.height + 12,
            boxShadow:
              "0 0 0 3px var(--accent), 0 0 0 9px color-mix(in srgb, var(--accent) 22%, transparent)",
          }}
        />
      ) : null}

      <div
        ref={dockRef}
        role="region"
        aria-label="Guided tour"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
          {collapsed ? (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <p className="min-w-0 truncate text-sm">
                <span className="text-[var(--muted)]">
                  Tour {index + 1}/{list.length}
                </span>{" "}
                · {step.title}
              </p>
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
              >
                Open
              </button>
            </div>
          ) : (
            <div className="px-4 pb-3 pt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Step {index + 1} of {list.length}
                </p>
                <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="hover:text-[var(--foreground)]"
                  >
                    Minimize
                  </button>
                  {!isLast ? (
                    <button
                      type="button"
                      onClick={() => finish()}
                      className="hover:text-[var(--foreground)]"
                    >
                      Skip tour
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 max-h-[42vh] overflow-y-auto">
                <h2 className="font-serif text-lg leading-snug">
                  {step.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{step.body}</p>

                {step.id === "install" ? (
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                    <li>
                      Tap the Share button <ShareIcon /> at the bottom of Safari
                      (or top right on iPad).
                    </li>
                    <li>
                      Scroll down and tap <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                      Keep the name <strong>Family Finance</strong> and tap{" "}
                      <strong>Add</strong>.
                    </li>
                    <li>Open it from your home screen from now on.</li>
                  </ol>
                ) : null}

                {step.tip ? (
                  <p className="mt-2 border-l-2 border-[var(--accent)] pl-3 text-sm">
                    {step.tip}
                  </p>
                ) : null}
                {step.id === "install" ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    On Android, open the browser menu and tap Install app.
                    Already on your home screen? Skip ahead.
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex gap-1">
                {list.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1 flex-1 rounded-full ${
                      i <= index ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                    }`}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  className={`text-sm text-[var(--muted)] hover:text-[var(--foreground)] ${
                    index === 0 ? "invisible" : ""
                  }`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() =>
                    isLast ? finish("/accounts") : goTo(index + 1)
                  }
                  className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  {step.cta ?? (index === 0 ? "Start the tour" : "Next")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
