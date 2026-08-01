/**
 * computeStatus.js — On-demand computed status utility for Events & Exams.
 *
 * Status values:
 * - 'cancelled' : Preserved if explicitly set in stored status column or status name
 * - 'completed' : Current time is at or after event/exam end timestamp
 * - 'ongoing'   : Current time is between start and end timestamp
 * - 'upcoming'  : Event/exam start timestamp is within the next 7 days
 * - 'scheduled' : Event/exam start timestamp is more than 7 days in the future
 */
export function computeStatus(item, now = new Date()) {
  if (!item) return 'scheduled';

  // Preserve explicit 'cancelled' status set by user action
  const storedStatus = String(
    item.status || item.computed_status || item.event_status_name || item.exam_status_name || ''
  ).toLowerCase();

  if (storedStatus === 'cancelled' || item.event_status_id === 4 || item.exam_status_id === 4) {
    return 'cancelled';
  }

  // Determine start & end timestamps
  const startAt = item.event_start_date || item.start_at || item.event_date || item.date_time;
  const endAt = item.event_end_date || item.end_at || item.event_date || item.date_time;

  if (!startAt) {
    return item.status || item.computed_status || 'scheduled';
  }

  const start = new Date(startAt).getTime();
  let end = endAt ? new Date(endAt).getTime() : start;

  // Add exam duration_mins if applicable
  if (item.duration_mins && end === start) {
    end = start + item.duration_mins * 60 * 1000;
  }

  const current = now.getTime();

  // Completed if current time is past the end timestamp
  if (current >= end) return 'completed';

  // Ongoing if current time is between start and end timestamp
  if (current >= start && current < end) return 'ongoing';

  // Upcoming if start date is within 7 days
  const diffDays = (start - current) / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return 'upcoming';

  return 'scheduled';
}
