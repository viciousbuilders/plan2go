"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { PlusIcon, TrashIcon } from "@/ui/icons";
import { MENU_ITEM, MENU_RULE } from "@/ui/menu";
import { Notice } from "@/ui/notice";
import { SheetRow } from "./sheet-row";

/** Deleting this trip either happened or it did not. */
interface DeleteTripOutcome {
  readonly error: string | null;
}

interface TripActionsProps {
  readonly slug: string;
  /** Deleting is a change like any other, so it travels with the key too. */
  readonly editKey: string;
  /**
   * Passed in rather than imported, because a feature may not reach into the
   * route that owns the mutation. It answers with what went wrong, or with
   * nothing at all when it navigated away instead of answering.
   */
  readonly onDelete: (input: {
    slug: string;
    editKey: string;
  }) => Promise<DeleteTripOutcome | undefined>;
  /**
   * Where starting another trip goes. A path rather than an import, for the
   * same reason: a feature does not know the app's routes.
   */
  readonly startAnotherPath: string;
}

/**
 * The two ways to leave this trip, on its name row at the top of the panel.
 * They are not the same thing and are named apart, because the difference
 * between them is what happens to the trip you are looking at.
 *
 * Deleting removes this one and hands you back to the front page. Nothing of it
 * survives, the slug included, so a link already handed out stops resolving.
 * Starting another leaves this trip alone and opens the front page in its own
 * tab, so the trip being read is still there behind it. Both are named in a
 * word, so the trip's name beside them keeps the width: what deleting costs is
 * spelled out in the question it asks, which is where it matters.
 *
 * Deleting asks first, in the product's own question over the page. There is
 * nothing to undo it with, which is exactly the kind of button that should not
 * fire on one stray click.
 */
export function TripActions({
  slug,
  editKey,
  onDelete,
  startAnotherPath,
}: TripActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [deleting, startDeleting] = useTransition();
  const trigger = useRef<HTMLButtonElement | null>(null);

  /** Closing hands the focus back to what opened it, wherever it came from. */
  const close = (): void => {
    setAsking(false);
    trigger.current?.focus();
  };

  const remove = (): void => {
    setAsking(false);
    startDeleting(async () => {
      const outcome = await onDelete({ slug, editKey });
      setMessage(outcome?.error ?? null);
    });
  };

  return (
    <div className="relative">
      {/* Eight apart on a phone, as every row of the sheet is. */}
      <div className="max-lg:flex max-lg:flex-col max-lg:gap-2">
        {/* Its own tab, so the trip being read is still there behind it. */}
        <Link href={startAnotherPath} target="_blank" className={MENU_ITEM}>
          <PlusIcon size={15} strokeWidth={2.75} className="shrink-0 max-lg:hidden" />
          <span className="max-lg:hidden">New trip</span>
          <SheetRow icon={PlusIcon} title="New trip" detail="Start planning another trip" />
        </Link>

        {/* What ends the trip is kept apart from what the trip does, and wears
            the accent, so it is never the row a hand lands on by accident. */}
        <div className={MENU_RULE} />

        <button
          type="button"
          ref={trigger}
          aria-haspopup="dialog"
          aria-expanded={asking}
          disabled={deleting}
          onClick={() => {
            setAsking(!asking);
          }}
          className={`${MENU_ITEM} text-terracotta-700 disabled:opacity-45`}
        >
          <TrashIcon size={15} strokeWidth={2.75} className="shrink-0 max-lg:hidden" />
          <span className="max-lg:hidden">{deleting ? "Deleting" : "Delete trip"}</span>
          <SheetRow
            icon={TrashIcon}
            title={deleting ? "Deleting" : "Delete trip"}
            detail="Remove this trip and all its days"
            ending
          />
        </button>
      </div>

      {asking ? (
        <ConfirmDialog
          label="Delete this trip"
          question="Delete this trip?"
          detail="This cannot be undone."
          cancel="Cancel"
          confirm="Delete"
          onConfirm={remove}
          onClose={close}
        />
      ) : null}

      {message === null ? null : (
        <Notice role="alert" size="meta" className="mt-2">
            {message}
        </Notice>
      )}
    </div>
  );
}
