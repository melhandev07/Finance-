import { X, Trash2, Pencil, Eye, Search, Plus, Download, Printer, AlertTriangle, CheckCircle2, Wallet, TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { inr, fmtDate } from '../lib/utils';
import type { Transaction } from '../lib/types';

export const Card = ({ children, className = '' }: any) => <div className={`bg-white rounded-2xl border border-[#E6EDE8] shadow-[0_1px_3px_rgba(23,35,29,0.06)] ${className}`}>{children}</div>;
export const Btn = ({ children, onClick, variant = 'primary', className = '', disabled }: any) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  const styles: any = {
    primary: 'bg-[#245F49] text-white hover:bg-[#1d4f3c] shadow-sm',
    secondary: 'bg-white border border-[#D9E4DC] text-[#17231D] hover:bg-[#F7F9F7]',
    danger: 'bg-[#DC4C4C] text-white hover:bg-[#c23e3e]',
    ghost: 'text-[#245F49] hover:bg-[#EAF3ED]',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};
export const Input = (props: any) => <input {...props} className={`w-full rounded-xl border border-[#D9E4DC] bg-white px-3.5 py-2.5 text-sm text-[#17231D] placeholder:text-[#9AA8A0] outline-none focus:border-[#245F49] focus:ring-2 focus:ring-[#245F49]/15 ${props.className || ''}`} />;
export const Select = (props: any) => <select {...props} className={`w-full rounded-xl border border-[#D9E4DC] bg-white px-3.5 py-2.5 text-sm text-[#17231D] outline-none focus:border-[#245F49] focus:ring-2 focus:ring-[#245F49]/15 ${props.className || ''}`} />;
export const Label = ({ children }: any) => <label className="block text-xs font-semibold uppercase tracking-wide text-[#718078] mb-1.5">{children}</label>;
export const Badge = ({ children, tone = 'green' }: any) => {
  const tones: any = { green: 'bg-[#E6F4EC] text-[#16A36A]', red: 'bg-[#FDECEC] text-[#DC4C4C]', amber: 'bg-[#FFF4DE] text-[#B7791F]', blue: 'bg-[#E8F0FE] text-[#2F5AA6]', gray: 'bg-[#EEF2EF] text-[#5B6B62]' };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
};
export const Modal = ({ open, onClose, title, children, wide }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-[#17231D]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E6EDE8] bg-white px-5 py-4 rounded-t-3xl">
          <h3 className="text-base font-bold text-[#17231D]">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#F1F5F2]"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
export const Confirm = ({ open, onClose, onConfirm, title, message }: any) => (
  <Modal open={open} onClose={onClose} title={title}>
    <div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FDECEC] text-[#DC4C4C]"><AlertTriangle size={20} /></div>
      <p className="text-sm leading-relaxed text-[#5B6B62]">{message}</p></div>
    <div className="mt-6 flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="danger" onClick={onConfirm}>Delete</Btn></div>
  </Modal>
);
export const Empty = ({ title, subtitle, action }: any) => (
  <div className="flex flex-col items-center justify-center py-14 text-center px-4">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF3ED] text-[#245F49]"><Wallet size={26} /></div>
    <h4 className="mt-4 font-bold text-[#17231D]">{title}</h4><p className="mt-1 max-w-sm text-sm text-[#718078]">{subtitle}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
export const StatCard = ({ label, value, sub, icon: Icon, tone = 'green', onClick }: any) => {
  const tones: any = { green: 'bg-[#EAF3ED] text-[#245F49]', red: 'bg-[#FDECEC] text-[#DC4C4C]', amber: 'bg-[#FFF4DE] text-[#B7791F]', blue: 'bg-[#E8F0FE] text-[#2F5AA6]' };
  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-2xl border border-[#E6EDE8] p-4 sm:p-5 shadow-[0_1px_3px_rgba(23,35,29,0.06)] hover:shadow-md transition">
      <div className="flex items-start justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={17} /></span></div>
      <div className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-[#17231D]">{value}</div>
      {sub && <div className="mt-1 text-xs text-[#718078]">{sub}</div>}
    </button>
  );
};
export const TxIcon = ({ type }: { type: string }) => {
  if (type === 'income') return <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E6F4EC] text-[#16A36A]"><TrendingUp size={16} /></span>;
  if (type === 'expense') return <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDECEC] text-[#DC4C4C]"><TrendingDown size={16} /></span>;
  return <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F0FE] text-[#2F5AA6]"><ArrowLeftRight size={16} /></span>;
};
export const Pagination = ({ page, total, perPage, onPage }: any) => {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="text-[#718078]">{total} records · Page {page} of {pages}</span>
    <div className="flex gap-1"><button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-[#D9E4DC] p-2 disabled:opacity-40"><ChevronLeft size={16} /></button>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border border-[#D9E4DC] p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></div>;
};
export { Search, Plus, Download, Printer, Trash2, Pencil, Eye, CheckCircle2, PiggyBank, Clock };
export function TxRow({ tx, catName, accName, onView, onEdit, onDelete }: { tx: Transaction; catName: string; accName: string; onView?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const isInc = tx.transaction_type === 'income';
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#F7F9F7] transition">
      <TxIcon type={tx.transaction_type} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[#17231D]">{tx.title}</div>
        <div className="truncate text-xs text-[#718078]">{fmtDate(tx.transaction_date)} · {catName} · {accName}</div>
      </div>
      <div className={`text-sm font-extrabold ${isInc ? 'text-[#16A36A]' : tx.transaction_type === 'expense' ? 'text-[#DC4C4C]' : 'text-[#2F5AA6]'}`}>{isInc ? '+' : tx.transaction_type === 'expense' ? '−' : ''}{inr(tx.amount)}</div>
      <div className="hidden sm:flex gap-1">
        {onView && <button onClick={onView} className="rounded-lg p-2 hover:bg-white text-[#718078]"><Eye size={15} /></button>}
        {onEdit && <button onClick={onEdit} className="rounded-lg p-2 hover:bg-white text-[#718078]"><Pencil size={15} /></button>}
        {onDelete && <button onClick={onDelete} className="rounded-lg p-2 hover:bg-white text-[#DC4C4C]"><Trash2 size={15} /></button>}
      </div>
    </div>
  );
}
