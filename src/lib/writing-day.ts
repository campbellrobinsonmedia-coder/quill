import { cookies } from "next/headers";

export const TZ_COOKIE = "tz";

function safeTimeZone(tz: string | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

// "YYYY-MM-DD" for the current moment in the writer's own timezone (from the
// tz cookie set client-side), so "today" rolls over at their midnight.
export async function localDateString(date = new Date()): Promise<string> {
  const store = await cookies();
  const tz = safeTimeZone(store.get(TZ_COOKIE)?.value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function previousDay(dateString: string): string {
  const d = new Date(`${dateString}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
