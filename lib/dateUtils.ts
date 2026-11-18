import { CusDecRecord } from './types';

export type DateBasis = 'created' | 'customs';

/**
 * Extracts and standardizes the date when a CusDec was uploaded to this system (YYYY-MM-DD).
 * When basis === 'created' (default), it strictly uses the system upload/ingestion timestamp.
 */
export function parseRecordDate(record: CusDecRecord, basis: DateBasis = 'created'): string | null {
  if (basis === 'created') {
    if (record.createdAt) {
      try {
        const d = new Date(record.createdAt);
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 10);
        }
      } catch {}
    }
    return null;
  }

  // Fallback to customs entry date ONLY if explicitly requested
  const raw = record.customsDate;
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parts = raw.split(/[\/\-\.]/);
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {}

  return null;
}

/**
 * Formats YYYY-MM-DD to "Thu, 12 Nov 2026"
 */
export function formatDateDisplay(isoDateStr: string): string {
  if (!isoDateStr) return '';
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return isoDateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDateStr;
  }
}

/**
 * Formats YYYY-MM-DD to "Thursday, 12 November 2026"
 */
export function formatLongDateDisplay(isoDateStr: string): string {
  if (!isoDateStr) return '';
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return isoDateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDateStr;
  }
}

/**
 * Formats YYYY-MM-DD to "12 Nov"
 */
export function formatShortDateDisplay(isoDateStr: string): string {
  if (!isoDateStr) return '';
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return isoDateStr;
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return isoDateStr.slice(5);
  }
}

/**
 * Offsets a YYYY-MM-DD date by offsetDays (+1 for next day, -1 for prev day)
 */
export function stepDate(isoDateStr: string, offsetDays: number): string {
  if (!isoDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const [y, m, d] = isoDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offsetDays);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayIso(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
