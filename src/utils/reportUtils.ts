export interface DateRange {
  startDate: string;
  endDate: string;
  label?: string;
}

export function isDateInRange(dateString?: string | null, start?: string, end?: string): boolean {
  if (!dateString) return false;
  try {
    const d = dateString.split('T')[0];
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  } catch {
    return false;
  }
}
