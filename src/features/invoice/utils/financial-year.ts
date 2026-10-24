/**
 * Indian financial year (1 Apr - 31 Mar) a date falls in, e.g. `2026-27` for
 * any date from 1 Apr 2026 to 31 Mar 2027. Evaluated in IST so an order placed
 * late on 31 Mar does not slip into the next year.
 */
export function financialYearOf(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);

  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}
