export function computeStatus(event, now = new Date()) {
  if (event.status === 'cancelled') return 'cancelled';

  // Fallback to what exists
  const startAt = event.start_at || event.event_date || event.date_time;
  const endAt = event.end_at || event.event_date || event.date_time;

  if (!startAt || !endAt) return event.status || event.computed_status; 

  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const current = now.getTime();

  if (current >= end) return 'completed';

  const diffDays = (start - current) / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 7) return 'upcoming';
  return 'scheduled';
}
