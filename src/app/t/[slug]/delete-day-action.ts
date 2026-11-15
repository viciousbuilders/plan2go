"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EDIT_KEY_PATTERN, hashEditKey } from "@/server/ownership/edit-key";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { deleteDay } from "@/server/trips/delete-day";

export interface DeleteDayState {
  readonly error: string | null;
}

const deleteSchema = z.object({
  slug: z.string().min(1).max(80),
  editKey: z.string().regex(EDIT_KEY_PATTERN),
  dayId: z.string().min(1).max(40),
});

/**
 * A day taken off the trip, with everything on it, and every day after it
 * moved up a place, onto the date before.
 *
 * The key out of the edit link is hashed here and checked inside the query
 * that finds the day, so nothing goes without one. A day that is not there
 * and a trip that is not yours get the same sentence, because telling them
 * apart turns this into a way to test slugs.
 */
export async function deleteDayAction(input: unknown): Promise<DeleteDayState> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That change could not be read. Try it again." };
  }

  const { editKey, ...rest } = parsed.data;
  const result = await deleteDay({ ...rest, editKeyHash: hashEditKey(editKey) }, prismaTripRepository);
  if (result.status === "only-day") {
    return {
      error:
        "This is the trip's only day, and a trip keeps at least one. Reset the day to start it over, or delete the whole trip from the trip's menu.",
    };
  }
  if (result.status === "refused") {
    return {
      error:
        "This trip is not yours to change. Ask whoever sent you the link to change it, or start your own trip.",
    };
  }

  revalidatePath(`/t/${parsed.data.slug}`, "layout");
  return { error: null };
}
