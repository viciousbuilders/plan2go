/**
 * What saving dates that come to fewer days takes with it, said before it is
 * saved. Days are kept by their place in the trip rather than by their date,
 * so moving either end keeps what is planned on the first day, the second and
 * so on, and a shorter trip loses its last days, with whatever is planned on
 * them. Null when nothing goes, or while the dates drawn are not a trip yet.
 */
export function daysLost(stopsByDay: readonly number[], dayCount: number | null): string | null {
  if (dayCount === null || dayCount < 1 || dayCount >= stopsByDay.length) {
    return null;
  }
  const gone = stopsByDay.length - dayCount;
  const first = String(dayCount + 1);
  const last = String(stopsByDay.length);
  const which =
    gone === 1 ? `Day ${last}` : gone === 2 ? `Days ${first} and ${last}` : `Days ${first} to ${last}`;
  const stops = stopsByDay.slice(dayCount).reduce((sum, count) => sum + count, 0);
  if (stops === 0) {
    return `Saving takes ${which} off the trip.`;
  }
  const what = stops === 1 ? "the stop" : `the ${String(stops)} stops`;
  return `Saving takes ${which} off the trip, and ${what} on ${gone === 1 ? "it" : "them"}.`;
}
