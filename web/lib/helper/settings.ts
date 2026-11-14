/**
 * Helper operating hours and availability configuration.
 */

export interface HelperSchedule {
  startHourUtc: number; // 0-23
  endHourUtc: number; // 0-23
  operatingDays: number[]; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  timeoutMinutes: number; // Configurable wait before telling the learner
}

// Default operating hours: Monday - Saturday, 06:00 to 19:00 UTC (09:00 to 22:00 East Africa Time)
export const DEFAULT_HELPER_SCHEDULE: HelperSchedule = {
  startHourUtc: 6,
  endHourUtc: 19,
  operatingDays: [1, 2, 3, 4, 5, 6], // Mon - Sat
  timeoutMinutes: 5,
};

/**
 * Checks whether staff helpers are currently on-duty and available.
 */
export function isHelperAvailable(
  now: Date = new Date(),
  schedule: HelperSchedule = DEFAULT_HELPER_SCHEDULE,
): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  if (!schedule.operatingDays.includes(day)) {
    return false;
  }

  return hour >= schedule.startHourUtc && hour < schedule.endHourUtc;
}

/**
 * Returns available callback time slots for learners outside operating hours.
 */
export function getAvailableCallbackSlots(_now: Date = new Date()): string[] {
  return [
    "Today at 2:00 PM",
    "Today at 4:00 PM",
    "Tomorrow at 9:00 AM",
    "Tomorrow at 11:00 AM",
    "Tomorrow at 2:00 PM",
  ];
}
