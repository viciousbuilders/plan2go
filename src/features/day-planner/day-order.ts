import type { DayId } from "@/core/model/day";
import type { PlannedDay } from "./compute-trip";

/**
 * The days' ids in trip order with two of them changed places: the order a
 * swap asks for, counted from the days as they are shown.
 */
export function swappedOrder(
  days: readonly PlannedDay[],
  from: number,
  to: number,
): readonly DayId[] {
  const order = days.map((day) => day.plan.id);
  const one = order[from];
  const other = order[to];
  if (one === undefined || other === undefined) {
    return order;
  }
  order[from] = other;
  order[to] = one;
  return order;
}

/**
 * The days in the order given, shown while the server writes it, so a swap is
 * seen the moment a day is let go rather than when the page comes back.
 *
 * A date belongs to a place in the trip, not to the day in it, so each day
 * takes the date of the place it lands in, as it will once the trip is read
 * again. Its times are still the ones worked out for its old date until then,
 * and the open day says so while it waits for the new ones.
 *
 * A day already where the order puts it is left as it is, so an order the
 * trip has caught up with changes nothing. An order that is not these days
 * rearranged, because a day was added or taken off meanwhile, is ignored and
 * the days are shown as they are.
 */
export function arrangedDays(
  days: readonly PlannedDay[],
  order: readonly DayId[],
): readonly PlannedDay[] {
  if (order.length !== days.length || new Set(order).size !== order.length) {
    return days;
  }
  const byId = new Map(days.map((day) => [day.plan.id, day]));
  const arranged: PlannedDay[] = [];
  for (const [index, id] of order.entries()) {
    const day = byId.get(id);
    const place = days[index];
    if (day === undefined || place === undefined) {
      return days;
    }
    const date = place.plan.date;
    arranged.push(
      day === place
        ? day
        : { ...day, plan: { ...day.plan, date }, computed: { ...day.computed, date } },
    );
  }
  return arranged;
}
