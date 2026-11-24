import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths, subDays } from 'date-fns';

export const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
export const inr2 = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDate = (iso: string) => { try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return iso; } };
export const fmtDateTime = (iso: string) => { try { return format(parseISO(iso), 'dd MMM yyyy, hh:mm a'); } catch { return iso; } };

export type RangeKey = 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'all' | 'custom';
export function rangeFor(key: RangeKey, custom?: { from: string; to: string }): { from?: string; to?: string; label: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (key) {
    case 'today': return { from: iso(now), to: iso(now), label: 'Today' };
    case 'week': return { from: iso(startOfWeek(now)), to: iso(endOfWeek(now)), label: 'This Week' };
    case 'month': return { from: iso(startOfMonth(now)), to: iso(endOfMonth(now)), label: 'This Month' };
    case 'lastMonth': { const s = startOfMonth(subMonths(now, 1)); const e = endOfMonth(subMonths(now, 1)); return { from: iso(s), to: iso(e), label: 'Last Month' }; }
    case 'year': return { from: iso(startOfYear(now)), to: iso(endOfYear(now)), label: 'This Year' };
    case 'custom': return { from: custom?.from, to: custom?.to, label: 'Custom Range' };
    default: return { label: 'All Time' };
  }
}
export function lastNDays(n: number) { const out: { date: string; label: string }[] = []; for (let i = n - 1; i >= 0; i--) { const d = subDays(new Date(), i); out.push({ date: d.toISOString().slice(0, 10), label: format(d, 'dd MMM') }); } return out; }
export function lastNMonths(n: number) { const out: { key: string; label: string }[] = []; for (let i = n - 1; i >= 0; i--) { const d = subMonths(new Date(), i); out.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy') }); } return out; }
export function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];
export const ACCOUNT_TYPES = ['Cash', 'Bank Account', 'Savings Account', 'UPI', 'Other'];
export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled', 'Archived'];
