const EASTERN_TIME_ZONE = "America/New_York";

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
}

export function toEasternDate(value: string) {
  return parseDateOnly(value) ?? new Date(value);
}

export function formatEasternMonthDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(toEasternDate(value));
}

export function formatEasternLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(toEasternDate(value));
}

export function getEasternGreeting(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: EASTERN_TIME_ZONE,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}
