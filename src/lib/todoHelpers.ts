/**
 * Helper functions for computing remindAt dates based on repeat type.
 */

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * Compute remindAt for DAILY repeat type.
 * Takes timeOfDay (HH:MM) and returns next occurrence from now.
 */
export function computeDailyRemindAt(timeOfDay: string): Date {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (today <= now) {
    today.setDate(today.getDate() + 1);
  }

  return today;
}

/**
 * Compute remindAt for WEEKLY repeat type.
 * Takes timeOfDay (HH:MM) and repeatDays (array or comma-separated string).
 * Returns next occurrence matching one of the weekdays.
 */
export function computeWeeklyRemindAt(
  timeOfDay: string,
  repeatDays: string | string[]
): Date {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  const days = Array.isArray(repeatDays)
    ? repeatDays.map((d) => d.trim().toUpperCase())
    : repeatDays.split(",").map((d) => d.trim().toUpperCase());

  const dayMap: { [key: string]: number } = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
  };

  const now = new Date();
  
  // Check next 14 days
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + dayOffset);
    candidate.setHours(hours, minutes, 0, 0);

    const dayName = DAYS[candidate.getDay()];
    
    // If this day matches and time hasn't passed (or it's in the future), use it
    if (days.includes(dayName)) {
      if (dayOffset === 0 && candidate <= now) {
        // Time passed today, continue to next matching day
        continue;
      }
      return candidate;
    }
  }

  // Fallback: next week same day
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 7);
  fallback.setHours(hours, minutes, 0, 0);
  return fallback;
}

