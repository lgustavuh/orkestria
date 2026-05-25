/**
 * Format a date string for display, handling UTC dates correctly.
 * Dates stored as midnight UTC would show the previous day in UTC-3.
 * This function uses UTC components for date-only display.
 */
export function formatDateBR(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  
  // Use UTC to avoid timezone shift for date-only fields
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTimeBR(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

/**
 * Convert a date input value (YYYY-MM-DD) to ISO string at noon UTC
 * to prevent timezone day-shift issues.
 */
export function dateInputToISO(value: string): string {
  if (!value) return '';
  return `${value}T12:00:00.000Z`;
}

/**
 * Convert an ISO date to input value (YYYY-MM-DD) using UTC
 */
export function dateToInput(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
