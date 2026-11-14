"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EDIT_KEY_PATTERN, hashEditKey } from "@/server/ownership/edit-key";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { swapDays } from "@/server/trips/swap-days";

export interface SwapDaysState {
  readonly error: string | null;
}

/** Two different days: a day let go on its own place was never sent. */
const swapSchema = z
  .object({
    slug: z.string().min(1).max(80),
    editKey: z.string().regex(EDIT_KEY_PATTERN),
    dayId: z.string().min(1).max(40),
    withDayId: z.string().min(1).max(40),
  })
  .refine((input) => input.dayId !== input.withDayId);

/**
 * Two days of the trip change places, each with everything on it.
 *
 * The key out of the edit link is hashed here and checked inside the query
 * that finds the days, so nothing moves without one. A day that is not there
 * and a trip that is not yours get the same sentence, because telling them
 * apart turns this into a way to test slugs.
 */
export async function swapDaysAction(input: unknown): Promise<SwapDaysState> {
  const parsed = swapSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That change could not be read. Try it again." };
  }

  const { editKey, ...rest } = parsed.data;
  const result = await swapDays(
    { ...rest, editKeyHash: hashEditKey(editKey) },
    prismaTripRepository,
  );

  if (result.status === "refused") {
    return {
      error:
        "This trip is not yours to change. Ask whoever sent you the link to change it, or start your own trip.",
    };
  }

  revalidatePath(`/t/${parsed.data.slug}`, "layout");
  return { error: null };
}
