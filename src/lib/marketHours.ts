import type { Market } from "@/types";

export interface FetchWindow {
  /** Local-time hour (0-23). */
  hour: number;
  /** Local-time minute (0-59). */
  minute: number;
  /** Tolerance in minutes on either side of (hour:minute). */
  toleranceMin: number;
  label: string;
}

/**
 * Fetch windows per market — only times the screener is allowed to hit
 * upstream data providers. Everything else falls back to cached values.
 *
 *  IN (NSE) trades 09:15–15:30 IST, Mon–Fri.
 *  US (NYSE/Nasdaq) trades 09:30–16:00 ET, Mon–Fri.
 *
 * Each window is `± toleranceMin` around the stated hh:mm so that
 * scheduled hits or manual refreshes within a few minutes still go live.
 */
export const FETCH_WINDOWS: Record<string, FetchWindow[]> = {
  IN: [
    { hour: 9, minute: 20, toleranceMin: 5, label: "post-open" },
    { hour: 15, minute: 25, toleranceMin: 5, label: "pre-close" },
  ],
  US: [
    { hour: 9, minute: 35, toleranceMin: 5, label: "post-open" },
    { hour: 15, minute: 55, toleranceMin: 5, label: "pre-close" },
  ],
};

interface LocalTimeParts {
  hour: number;
  minute: number;
  weekday: number; // 1 = Mon … 7 = Sun
}

function localParts(date: Date, timezone: string): LocalTimeParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const weekday =
    ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<
      string,
      number
    >)[wd] ?? 1;
  return { hour, minute, weekday };
}

export interface WindowState {
  inWindow: boolean;
  reason: string;
  marketLocalTime: string;
  matchedWindow?: FetchWindow;
}

export function checkFetchWindow(
  market: Market,
  now: Date = new Date(),
): WindowState {
  const { hour, minute, weekday } = localParts(now, market.timezone);
  const marketLocalTime = `${String(hour).padStart(2, "0")}:${String(
    minute,
  ).padStart(2, "0")} (${market.timezone})`;

  if (market.id === "INTL") {
    return {
      inWindow: true,
      reason: "INTL is always live (multi-timezone)",
      marketLocalTime,
    };
  }

  if (weekday === 6 || weekday === 7) {
    return {
      inWindow: false,
      reason: "weekend",
      marketLocalTime,
    };
  }

  const windows = FETCH_WINDOWS[market.id] ?? [];
  const nowMins = hour * 60 + minute;
  for (const w of windows) {
    const target = w.hour * 60 + w.minute;
    if (Math.abs(nowMins - target) <= w.toleranceMin) {
      return {
        inWindow: true,
        reason: `${w.label} window`,
        marketLocalTime,
        matchedWindow: w,
      };
    }
  }

  return { inWindow: false, reason: "outside fetch window", marketLocalTime };
}

/** Force-fetch override — env var or manual flag bypasses window check. */
export function isForceLive(): boolean {
  return process.env.SCREENER_FORCE_LIVE === "1";
}
