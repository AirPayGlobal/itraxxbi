// Timestamps are shown in the business's timezone so server and browser render the same text.
export const APP_TIME_ZONE = "Africa/Windhoek";

const dayFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: APP_TIME_ZONE });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});

/** Formats a date-only YYYY-MM-DD value without shifting it across timezones. */
export function formatDay(day: string): string {
  return day ? dayFmt.format(new Date(`${day}T12:00:00Z`)) : "";
}

export function formatStampDate(iso: string): string {
  return iso ? dateFmt.format(new Date(iso)) : "";
}

export function formatStampDateTime(iso: string): string {
  return iso ? dateTimeFmt.format(new Date(iso)) : "";
}
