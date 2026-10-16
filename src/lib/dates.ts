// All user-facing dates render in Asia/Kolkata regardless of server or browser timezone.
export const IST = "Asia/Kolkata";

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dateOnly = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeOnly = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const ymd = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type D = Date | string | number;
const d = (v: D) => (v instanceof Date ? v : new Date(v));

export const formatDateTime = (v: D) => dateTime.format(d(v)).replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
export const formatDate = (v: D) => dateOnly.format(d(v));
export const formatTime = (v: D) => timeOnly.format(d(v)).replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
/** YYYY-MM-DD of the instant as seen in IST. */
export const istDayKey = (v: D) => ymd.format(d(v));

/** Start of the IST calendar day containing `v`, as a UTC Date. */
export function startOfIstDay(v: D = new Date()) {
  const key = istDayKey(v);
  return new Date(`${key}T00:00:00+05:30`);
}

export function formatRelative(v: D, now: Date = new Date()) {
  const diff = (now.getTime() - d(v).getTime()) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (istDayKey(v) === istDayKey(now)) return `Today, ${formatTime(v)}`;
  const yesterday = new Date(now.getTime() - 86400_000);
  if (istDayKey(v) === istDayKey(yesterday)) return `Yesterday, ${formatTime(v)}`;
  return formatDateTime(v);
}
