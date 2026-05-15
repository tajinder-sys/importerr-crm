/** Format SLA remaining seconds for compact UI (cards, lists). */
export function formatSlaRemaining(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '—';
  const neg = totalSeconds < 0;
  const abs = Math.abs(Math.floor(totalSeconds));
  const prefix = neg ? 'Overdue · ' : '';
  if (abs >= 86400) {
    const d = Math.floor(abs / 86400);
    const h = Math.floor((abs % 86400) / 3600);
    return `${prefix}${d}d ${h}h`;
  }
  if (abs >= 3600) {
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    return `${prefix}${h}h ${m}m`;
  }
  const m = Math.floor(abs / 60);
  const sec = abs % 60;
  return `${prefix}${m}m ${String(sec).padStart(2, '0')}s`;
}
