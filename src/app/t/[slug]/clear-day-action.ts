"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EDIT_KEY_PATTERN, hashEditKey } from "@/server/ownership/edit-key";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { clearDay } from "@/server/trips/clear-day";

export interface ClearDayState {
  readonly error: string | null;
}

const clearSchema = z.object({
  slug: z.string().min(1).max(80),
  editKey: z.string().regex(EDIT_KEY_PATTERN),
  dayId: z.string().min(1).max(40),
});

/**
 * A day started over: its stops and its two ends come off, and it leaves at
 * 09:00 again.
 *
 * The key out of the edit link is hashed here and checked inside the query
 * that finds the day, so nothing changes without one. A day that is not there
 * and a trip that is not yours get the same sentence, because telling them
 * apart turns this into a way to test slugs.
 */
export async function clearDayAction(input: unknown): Promise<ClearDayState> {
  const parsed = clearSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That change could not be read. Try it again." };
  }

  const { editKey, ...rest } = parsed.data;
  const result = await clearDay({ ...rest, editKeyHash: hashEditKey(editKey) }, prismaTripRepository);
  if (result.status === "refused") {
    return {
      error:
        "This trip is not yours to change. Ask whoever sent you the link to change it, or start your own trip.",
    };
  }

  revalidatePath(`/t/${parsed.data.slug}`, "layout");
  return { error: null };
}
