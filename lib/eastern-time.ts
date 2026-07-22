const EASTERN_TIME_ZONE = "America/New_York";

function getEasternParts(
  value: string | Date,
  options: {
    year?: "numeric";
    month?: "short" | "long" | "2-digit";
    day?: "numeric" | "2-digit";
    weekday?: "short";
    hour?: "numeric" | "2-digit";
    minute?: "2-digit";
  },
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    hour12: true,
    ...options,
  }).formatToParts(typeof value === "string" ? new Date(value) : value);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

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
  const parts = getEasternParts(toEasternDate(value), {
    month: "short",
    day: "numeric",
  });

  return `${parts.month} ${parts.day}`;
}

export function formatEasternLongDate(value: string) {
  const parts = getEasternParts(toEasternDate(value), {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `${parts.month} ${parts.day}, ${parts.year}`;
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

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const zonedUtcTime = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return zonedUtcTime - date.getTime();
}

export function easternLocalDateTimeToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return new Date(value).toISOString();
  }

  const [, year, month, day, hour, minute] = match;
  const utcGuess = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0,
    ),
  );

  const firstOffset = getTimeZoneOffsetMilliseconds(utcGuess, EASTERN_TIME_ZONE);
  const resolved = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMilliseconds(resolved, EASTERN_TIME_ZONE);

  if (secondOffset !== firstOffset) {
    return new Date(utcGuess.getTime() - secondOffset).toISOString();
  }

  return resolved.toISOString();
}

export function formatEasternDateTimeLocalValue(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function formatEasternDayNumber(value: string) {
  return getEasternParts(value, { day: "numeric" }).day;
}

export function formatEasternWeekday(value: string) {
  return getEasternParts(value, { weekday: "short" }).weekday;
}

export function formatEasternMonthHeading(value: string) {
  return getEasternParts(value, { month: "long" }).month;
}

export function formatEasternEventDate(value: string) {
  const parts = getEasternParts(value, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}`;
}

export function formatEasternEventTime(value: string) {
  const parts = getEasternParts(value, {
    hour: "numeric",
    minute: "2-digit",
  });
  const minute = parts.minute === "00" ? "" : `:${parts.minute}`;

  return `${parts.hour}${minute}${parts.dayPeriod ?? ""}`;
}

export function formatEasternEventDateTime(value: string) {
  return `${formatEasternEventDate(value)} at ${formatEasternEventTime(value)}`;
}
