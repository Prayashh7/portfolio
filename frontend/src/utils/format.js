const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/*
  Dates arrive as plain "YYYY-MM-DD" strings — the API keeps them that way on
  purpose. They are read here as text rather than through Date, because parsing
  them would drag a timezone into a value that never had one, and a May start
  date can come back as April on the wrong side of midnight.
*/
export function formatMonthYear(value) {
  if (!value) return null;
  const [year, month] = String(value).split("-");
  const label = MONTHS[Number(month) - 1];
  return label && year ? `${label} ${year}` : String(value);
}

export function formatRange(start, end, isCurrent) {
  const from = formatMonthYear(start);
  const to = isCurrent ? "Present" : formatMonthYear(end);
  if (from && to) return `${from} — ${to}`;
  return from || to || null;
}

/* Timestamps do carry a time, so these go through Date. */
export function formatDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* Share tags need absolute URLs, while the database stores site-relative paths. */
export function absoluteUrl(path, base) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  try {
    return new URL(path, base || window.location.origin).href;
  } catch {
    return path;
  }
}

/* Bio and description fields are stored with blank lines between paragraphs. */
export function toParagraphs(text) {
  if (!text) return [];
  return String(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
