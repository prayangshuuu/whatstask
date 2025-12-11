/**
 * Format a date to a human-readable string.
 * Shows date and time in a consistent format.
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a date to a relative time string (e.g., "in 2 hours", "yesterday").
 * Falls back to absolute date if relative is not meaningful.
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 0) {
    // Past
    if (diffDays === -1) return "yesterday";
    if (diffDays > -7) return `${Math.abs(diffDays)} days ago`;
    return formatDateTime(dateObj);
  }

  // Future
  if (diffMins < 60) return `in ${diffMins} minutes`;
  if (diffHours < 24) return `in ${diffHours} hours`;
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) return `in ${diffDays} days`;
  return formatDateTime(dateObj);
}

