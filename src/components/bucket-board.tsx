"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { BucketRow } from "@/components/bucket-row";
import { saveBucketLayout } from "@/app/plan/actions";

export type BucketBoardItem = {
  bucketId: string;
  name: string;
  fundKind: "necessary" | "unnecessary";
  assignedCents: number;
  spentCents: number;
  remainingCents: number;
  thisMonthAssignedCents: number;
  suggestedCents: number | null;
};

type FundKind = "necessary" | "unnecessary";

/** A bucket→bucket move the server hasn't confirmed yet. */
type PendingMove = { fromId: string; toId: string; cents: number };

/**
 * Mirrors what plan/actions.ts transferBucketToBucket writes: a -cents
 * assignment on the source and +cents on the target, both in this month.
 * AUDIT: if that action ever changes which totals a transfer touches, change
 * this too, or the instant numbers will briefly disagree with the real ones.
 */
function applyMoves(list: BucketBoardItem[], moves: PendingMove[]): BucketBoardItem[] {
  if (moves.length === 0) return list;
  return list.map((b) => {
    let delta = 0;
    for (const m of moves) {
      if (m.fromId === b.bucketId) delta -= m.cents;
      if (m.toId === b.bucketId) delta += m.cents;
    }
    return delta === 0
      ? b
      : {
          ...b,
          assignedCents: b.assignedCents + delta,
          remainingCents: b.remainingCents + delta,
          thisMonthAssignedCents: b.thisMonthAssignedCents + delta,
        };
  });
}

export function BucketBoard({
  initialBuckets,
  monthKey,
}: {
  initialBuckets: BucketBoardItem[];
  monthKey: string;
}) {
  const [necessary, setNecessary] = useState(() =>
    initialBuckets.filter((b) => b.fundKind === "necessary"),
  );
  const [unnecessary, setUnnecessary] = useState(() =>
    initialBuckets.filter((b) => b.fundKind === "unnecessary"),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{
    kind: FundKind;
    index: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Same pattern as the shopping list: the move shows at once, and React drops
  // it when the action ends — by then the server's numbers have replaced it,
  // or (on an error) the old numbers come back.
  const [pendingMoves, addPendingMove] = useOptimistic(
    [] as PendingMove[],
    (moves: PendingMove[], move: PendingMove) => [...moves, move],
  );
  const shownNecessary = applyMoves(necessary, pendingMoves);
  const shownUnnecessary = applyMoves(unnecessary, pendingMoves);

  const byId = useMemo(() => {
    const map = new Map<string, BucketBoardItem>();
    for (const b of [...necessary, ...unnecessary]) map.set(b.bucketId, b);
    return map;
  }, [necessary, unnecessary]);

  const peersFor = (id: string) =>
    [...necessary, ...unnecessary]
      .filter((b) => b.bucketId !== id)
      .map((b) => ({ id: b.bucketId, name: b.name }));

  function persist(nextNecessary: BucketBoardItem[], nextUnnecessary: BucketBoardItem[]) {
    setError(null);
    const formData = new FormData();
    formData.set(
      "necessaryIds",
      nextNecessary.map((b) => b.bucketId).join(","),
    );
    formData.set(
      "unnecessaryIds",
      nextUnnecessary.map((b) => b.bucketId).join(","),
    );
    startTransition(async () => {
      const result = await saveBucketLayout(formData);
      if (result.error) setError(result.error);
    });
  }

  function onDragStart(id: string) {
    setDraggingId(id);
  }

  function onDragEnd() {
    setDraggingId(null);
    setDragOver(null);
  }

  function applyDrop(targetKind: FundKind, targetIndex: number) {
    if (!draggingId) return;
    const item = byId.get(draggingId);
    if (!item) return;

    let nextNecessary = necessary.filter((b) => b.bucketId !== draggingId);
    let nextUnnecessary = unnecessary.filter((b) => b.bucketId !== draggingId);
    const moved = { ...item, fundKind: targetKind };

    if (targetKind === "necessary") {
      const idx = Math.min(Math.max(targetIndex, 0), nextNecessary.length);
      nextNecessary = [
        ...nextNecessary.slice(0, idx),
        moved,
        ...nextNecessary.slice(idx),
      ];
    } else {
      const idx = Math.min(Math.max(targetIndex, 0), nextUnnecessary.length);
      nextUnnecessary = [
        ...nextUnnecessary.slice(0, idx),
        moved,
        ...nextUnnecessary.slice(idx),
      ];
    }

    setNecessary(nextNecessary);
    setUnnecessary(nextUnnecessary);
    setDraggingId(null);
    setDragOver(null);
    persist(nextNecessary, nextUnnecessary);
  }

  function moveToKind(id: string, kind: FundKind) {
    const item = byId.get(id);
    if (!item || item.fundKind === kind) return;
    let nextNecessary = necessary.filter((b) => b.bucketId !== id);
    let nextUnnecessary = unnecessary.filter((b) => b.bucketId !== id);
    const moved = { ...item, fundKind: kind };
    if (kind === "necessary") nextNecessary = [...nextNecessary, moved];
    else nextUnnecessary = [...nextUnnecessary, moved];
    setNecessary(nextNecessary);
    setUnnecessary(nextUnnecessary);
    persist(nextNecessary, nextUnnecessary);
  }

  function removeBucket(id: string) {
    const nextNecessary = necessary.filter((b) => b.bucketId !== id);
    const nextUnnecessary = unnecessary.filter((b) => b.bucketId !== id);
    setNecessary(nextNecessary);
    setUnnecessary(nextUnnecessary);
  }

  function renderList(kind: FundKind, list: BucketBoardItem[]) {
    const title = kind === "necessary" ? "Necessary" : "Unnecessary";
    const hint =
      kind === "necessary"
        ? "Must-cover spending — rent, food, utilities, etc."
        : "Flexible spending — dining out, fun, extras.";

    return (
      <div className="mt-8">
        <h3 className="font-serif text-lg">{title}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>
        <ul
          className={`mt-3 min-h-[3rem] border-t border-[var(--border)] ${
            dragOver?.kind === kind ? "bg-teal-50/40" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!draggingId) return;
            // Drop at end when over empty/padding area
            if (list.length === 0) setDragOver({ kind, index: 0 });
          }}
          onDrop={(e) => {
            e.preventDefault();
            const index = dragOver?.kind === kind ? dragOver.index : list.length;
            applyDrop(kind, index);
          }}
        >
          {list.length === 0 ? (
            <li className="py-4 text-sm text-[var(--muted)]">
              Drag a bucket here, or add one below.
            </li>
          ) : (
            list.map((bucket, index) => (
              <div
                key={bucket.bucketId}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const before = e.clientY < rect.top + rect.height / 2;
                  setDragOver({ kind, index: before ? index : index + 1 });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const before = e.clientY < rect.top + rect.height / 2;
                  applyDrop(kind, before ? index : index + 1);
                }}
              >
                {dragOver?.kind === kind && dragOver.index === index ? (
                  <div className="h-1 rounded-full bg-[var(--accent)]" />
                ) : null}
                <BucketRow
                  bucketId={bucket.bucketId}
                  name={bucket.name}
                  fundKind={bucket.fundKind}
                  assignedCents={bucket.assignedCents}
                  spentCents={bucket.spentCents}
                  remainingCents={bucket.remainingCents}
                  thisMonthAssignedCents={bucket.thisMonthAssignedCents}
                  suggestedCents={bucket.suggestedCents}
                  monthKey={monthKey}
                  otherBuckets={peersFor(bucket.bucketId)}
                  dragging={draggingId === bucket.bucketId}
                  onDragStart={() => onDragStart(bucket.bucketId)}
                  onDragEnd={onDragEnd}
                  onMoveKind={(next) => moveToKind(bucket.bucketId, next)}
                  onDeleted={() => removeBucket(bucket.bucketId)}
                  onOptimisticMove={(fromId, toId, cents) =>
                    addPendingMove({ fromId, toId, cents })
                  }
                />
              </div>
            ))
          )}
          {dragOver?.kind === kind && dragOver.index === list.length && list.length > 0 ? (
            <div className="h-1 rounded-full bg-[var(--accent)]" />
          ) : null}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-[var(--muted)]">
        Drag the handle to reorder, or drop into the other group.
        {pending ? " Saving…" : ""}
      </p>
      {error ? <p className="mt-2 text-sm text-amber-900">{error}</p> : null}
      {renderList("necessary", shownNecessary)}
      {renderList("unnecessary", shownUnnecessary)}
    </div>
  );
}
