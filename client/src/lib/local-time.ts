export type UserLocalContext = {
  timeZone: string;
  localDateTime: string;
};

export function getUserLocalContext(): UserLocalContext {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDateTime = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date());

  return { timeZone, localDateTime };
}
