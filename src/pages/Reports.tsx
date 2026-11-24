import { useMemo, useState } from 'react';
import { Download, Printer, FileText, TrendingUp, Search } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../lib/store';
import { accountBalance, workspaceTotals, projectFinancials } from '../lib/db';
import { inr, fmtDate, downloadCSV, lastNMonths } from '../lib/utils';
import { Card, Btn, Input, Select, Label, Empty, Badge } from '../components/ui';
import type { WorkspaceType } from '../lib/types';

const REPORT_TYPES = ['Income Report', 'Expense Report', 'Profit and Loss Report', 'Monthly Financial Report', 'Yearly Financial Report', 'Category-wise Expense Report', 'Account-wise Report', 'Cash Flow Report', 'Project-wise Business Report', 'Client Payment Report', 'Pending Payment Report', 'Budget Utilization Report'];
const COLORS = ['#245F49', '#2F7657', '#16A36A', '#B7791F', '#DC4C4C', '#2F5AA6', '#718078'];

export function ReportsPage({ workspace }: { workspace: WorkspaceType }) {
  const { db, setToast } = useStore();
  const [reportType, setReportType] = useState('Monthly Financial Report');
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [cat, setCat] = useState(''); const [acc, setAcc] = useState(''); const [proj, setProj] = useState('');

  const wsIds = useMemo(() => workspace === 'combined' ? db.workspaces.map(w => w.id) : db.workspaces.filter(w => w.type === workspace).map(w => w.id), [db, workspace]);
  const wsName = workspace === 'combined' ? 'Combined Overview' : workspace === 'business' ? 'MINAH TECH' : 'Personal Finance';

  const txs = useMemo(() => {
    let r = db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_date >= from && t.transaction_date <= to);
    if (reportType === 'Income Report') r = r.filter(t => t.transaction_type === 'income');
    if (reportType === 'Expense Report' || reportType === 'Category-wise Expense Report') r = r.filter(t => t.transaction_type === 'expense');
    if (cat) r = r.filter(t => t.category_id === cat);
    if (acc) r = r.filter(t => t.account_id === acc);
    if (proj) r = r.filter(t => t.project_id === proj);
    return [...r].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
  }, [db, wsIds, from, to, reportType, cat, acc, proj]);

  const income = txs.filter(t => t.transaction_type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0);
  const opening = useMemo(() => db.financial_accounts.filter(a => wsIds.includes(a.workspace_id) && a.is_active).reduce((s, a) => s + a.opening_balance, 0), [db, wsIds]);
  const closing = opening + income - expense;
  const cats = db.categories.filter(c => wsIds.includes(c.workspace_id));
  const accs = db.financial_accounts.filter(a => wsIds.includes(a.workspace_id));
  const projs = db.projects.filter(p => wsIds.includes(p.workspace_id));

  const exportCSV = () => { downloadCSV(`${reportType.replace(/\s+/g, '-').toLowerCase()}.csv`, [[`${wsName} — ${reportType}`, `Period: ${from} to ${to}`, `Generated: ${new Date().toLocaleString('en-IN')}`], [], ['Date', 'Title', 'Type', 'Category', 'Amount', 'Account', 'Description'], ...txs.map(t => [t.transaction_date, t.title, t.transaction_type, db.categories.find(c => c.id === t.category_id)?.name || '', String(t.amount), db.financial_accounts.find(a => a.id === t.account_id)?.name || '', t.description || '']), [], ['Summary', '', '', '', '', '', ''], ['Opening Balance', String(opening)], ['Total Income', String(income)], ['Total Expenses', String(expense)], ['Net Cash Flow', String(income - expense)], ['Closing Balance', String(closing)]]); setToast('CSV report downloaded.'); };
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet([[`${wsName} — ${reportType}`], [`Period: ${from} to ${to}`], [`Generated: ${new Date().toLocaleString('en-IN')}`], [], ['Date', 'Title', 'Type', 'Category', 'Amount (₹)', 'Account', 'Description'], ...txs.map(t => [t.transaction_date, t.title, t.transaction_type, db.categories.find(c => c.id === t.category_id)?.name || '', t.amount, db.financial_accounts.find(a => a.id === t.account_id)?.name || '', t.description || '']), [], ['Opening Balance', opening], ['Total Income', income], ['Total Expenses', expense], ['Net Cash Flow', income - expense], ['Closing Balance', closing]]);
      ws1['!cols'] = [{ wch: 14 }, { wch: 34 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Report');
      XLSX.writeFile(wb, `${reportType.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
      setToast('Excel report downloaded.');
    } catch { setToast('Excel export failed. Try CSV instead.'); }
  };
  const exportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text(`${wsName} — ${reportType}`, 14, 16);
      doc.setFontSize(10); doc.text(`Period: ${from} to ${to}   |   Generated: ${new Date().toLocaleString('en-IN')}`, 14, 24);
      doc.setFontSize(11); doc.text(`Opening Balance: Rs. ${opening.toLocaleString('en-IN')}`, 14, 34);
      doc.text(`Total Income: Rs. ${income.toLocaleString('en-IN')}`, 14, 41);
      doc.text(`Total Expenses: Rs. ${expense.toLocaleString('en-IN')}`, 14, 48);
      doc.text(`Net Cash Flow: Rs. ${(income - expense).toLocaleString('en-IN')}`, 14, 55);
      doc.text(`Closing Balance: Rs. ${closing.toLocaleString('en-IN')}`, 14, 62);
      doc.setFontSize(9); let y = 74;
      doc.text('Date        Title                          Type      Amount (Rs.)', 14, y); y += 6;
      txs.slice(0, 40).forEach(t => { if (y > 280) { doc.addPage(); y = 16; } doc.text(`${t.transaction_date}  ${t.title.slice(0, 28).padEnd(30)} ${t.transaction_type.padEnd(9)} ${t.amount.toLocaleString('en-IN')}`, 14, y); y += 6; });
      doc.save(`${reportType.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      setToast('PDF report downloaded.');
    } catch { setToast('PDF export failed. Try CSV instead.'); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-bold">Report Builder</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label>Report Type</Label><Select value={reportType} onChange={(e: any) => setReportType(e.target.value)}>{REPORT_TYPES.map(r => <option key={r}>{r}</option>)}</Select></div>
          <div><Label>Start Date</Label><Input type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} /></div>
          <div><Label>End Date</Label><Input type="date" value={to} onChange={(e: any) => setTo(e.target.value)} /></div>
          <div><Label>Category</Label><Select value={cat} onChange={(e: any) => setCat(e.target.value)}><option value="">All</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          <div><Label>Account</Label><Select value={acc} onChange={(e: any) => setAcc(e.target.value)}><option value="">All</option>{accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></div>
          <div><Label>Project</Label><Select value={proj} onChange={(e: any) => setProj(e.target.value)}><option value="">All</option>{projs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
          <div className="flex items-end gap-2"><Btn onClick={exportPDF}><FileText size={15} /> PDF</Btn><Btn variant="secondary" onClick={exportExcel}><Download size={15} /> Excel</Btn><Btn variant="secondary" onClick={exportCSV}>CSV</Btn><Btn variant="secondary" onClick={() => window.print()}><Printer size={15} /> Print</Btn></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[['Opening Balance', opening], ['Total Income', income], ['Total Expenses', expense], ['Net Cash Flow', income - expense], ['Closing Balance', closing]].map(([l, v]) => (
          <Card key={l as string} className="p-4 text-center"><div className="text-[11px] font-bold uppercase text-[#718078]">{l}</div><div className="mt-1 text-lg font-extrabold">{inr(v as number)}</div></Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"><h3 className="font-bold">{reportType}</h3><span className="text-xs text-[#718078]">{txs.length} records · {fmtDate(from)} → {fmtDate(to)}</span></div>
        {txs.length === 0 ? <Empty title="No records in this report" subtitle="Adjust the date range or filters." /> :
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="bg-[#F7F9F7] text-left text-xs uppercase text-[#718078]"><th className="px-5 py-3">Date</th><th className="px-5 py-3">Title</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Account</th><th className="px-5 py-3 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-[#EFF4F0]">{txs.map(t => <tr key={t.id} className="hover:bg-[#F7F9F7]"><td className="px-5 py-3">{fmtDate(t.transaction_date)}</td><td className="px-5 py-3 font-semibold">{t.title}</td><td className="px-5 py-3"><Badge tone={t.transaction_type === 'income' ? 'green' : 'red'}>{t.transaction_type}</Badge></td><td className="px-5 py-3">{db.categories.find(c => c.id === t.category_id)?.name || '—'}</td><td className="px-5 py-3">{db.financial_accounts.find(a => a.id === t.account_id)?.name || '—'}</td><td className={`px-5 py-3 text-right font-extrabold ${t.transaction_type === 'income' ? 'text-[#16A36A]' : 'text-[#DC4C4C]'}`}>{t.transaction_type === 'income' ? '+' : '−'}{inr(t.amount)}</td></tr>)}</tbody></table></div>}
      </Card>

      {reportType === 'Project-wise Business Report' && <Card className="overflow-hidden"><div className="px-5 py-4 font-bold">Project-wise Summary</div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="bg-[#F7F9F7] text-left text-xs uppercase text-[#718078]"><th className="px-5 py-3">Project</th><th className="px-5 py-3">Contract</th><th className="px-5 py-3">Received</th><th className="px-5 py-3">Pending</th><th className="px-5 py-3">Profit</th></tr></thead><tbody className="divide-y divide-[#EFF4F0]">{projs.map(p => { const f = projectFinancials(db, p.id); return <tr key={p.id}><td className="px-5 py-3 font-semibold">{p.name}</td><td className="px-5 py-3">{inr(p.contract_amount)}</td><td className="px-5 py-3 text-[#16A36A] font-bold">{inr(f.received)}</td><td className="px-5 py-3 text-[#B7791F] font-bold">{inr(f.pending)}</td><td className="px-5 py-3 font-extrabold">{inr(f.profit)}</td></tr>; })}</tbody></table></div></Card>}
      {reportType === 'Budget Utilization Report' && <Card className="p-5"><h3 className="font-bold">Budget Utilization</h3><div className="mt-3 space-y-3">{db.budgets.filter(b => wsIds.includes(b.workspace_id)).map(b => { const spent = db.transactions.filter(t => t.workspace_id === b.workspace_id && t.transaction_type === 'expense' && t.transaction_date >= b.start_date && t.transaction_date <= b.end_date && (!b.category_id || t.category_id === b.category_id)).reduce((s, t) => s + t.amount, 0); const pct = b.amount ? Math.round(spent / b.amount * 100) : 0; return <div key={b.id}><div className="flex justify-between text-xs"><span className="font-semibold">{b.name}</span><span className="font-bold">{inr(spent)} / {inr(b.amount)} · {pct}%</span></div><div className="mt-1 h-2.5 rounded-full bg-[#EEF2EF]"><div className={`h-2.5 rounded-full ${pct >= 100 ? 'bg-[#DC4C4C]' : pct >= 75 ? 'bg-[#B7791F]' : 'bg-[#245F49]'}`} style={{ width: Math.min(100, pct) + '%' }} /></div></div>; })}</div></Card>}
      {reportType === 'Account-wise Report' && <Card className="p-5"><h3 className="font-bold">Account-wise Balances</h3><div className="mt-3 space-y-2">{accs.map(a => <div key={a.id} className="flex justify-between rounded-xl bg-[#F7F9F7] px-4 py-3 text-sm"><span className="font-semibold">{a.name}<span className="block text-xs text-[#718078]">{a.account_type}</span></span><span className="font-extrabold">{inr(accountBalance(db, a.id))}</span></div>)}</div></Card>}
    </div>
  );
}

export function TrendsPage({ workspace }: { workspace: WorkspaceType }) {
  const { db } = useStore();
  const wsIds = useMemo(() => workspace === 'combined' ? db.workspaces.map(w => w.id) : db.workspaces.filter(w => w.type === workspace).map(w => w.id), [db, workspace]);
  const monthly = lastNMonths(12).map(m => {
    const inc = db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_date.startsWith(m.key) && t.transaction_type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_date.startsWith(m.key) && t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { month: m.label, Income: inc, Expenses: exp, Net: inc - exp };
  });
  const totals = workspaceTotals(db, wsIds);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[['Total Income (All Time)', totals.income, 'green'], ['Total Expenses (All Time)', totals.expense, 'red'], ['Net Cash Flow', totals.net, totals.net >= 0 ? 'green' : 'red'], ['Current Balance', totals.balance, 'blue']].map(([l, v, t]) => (
          <Card key={l as string} className="p-4 text-center"><div className="text-[11px] font-bold uppercase text-[#718078]">{l}</div><div className="mt-1 text-lg font-extrabold">{inr(v as number)}</div><Badge tone={t as any}>{t === 'green' ? '▲ Positive' : t === 'red' ? '▼ Negative' : 'Live'}</Badge></Card>
        ))}
      </div>
      <Card className="p-5"><h3 className="font-bold">Income Growth Trend (12 Months)</h3><div className="mt-3 h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke="#E6EDE8" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => '₹' + (v / 1000) + 'k'} /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend /><Area type="monotone" dataKey="Income" stroke="#16A36A" fill="#16A36A" fillOpacity={0.15} strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div></Card>
      <Card className="p-5"><h3 className="font-bold">Expense Growth Trend (12 Months)</h3><div className="mt-3 h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke="#E6EDE8" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => '₹' + (v / 1000) + 'k'} /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend /><Area type="monotone" dataKey="Expenses" stroke="#DC4C4C" fill="#DC4C4C" fillOpacity={0.15} strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div></Card>
      <Card className="p-5"><h3 className="font-bold">Monthly Comparison</h3><div className="mt-3 h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke="#E6EDE8" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => '₹' + (v / 1000) + 'k'} /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend /><Bar dataKey="Income" fill="#245F49" radius={[6, 6, 0, 0]} /><Bar dataKey="Expenses" fill="#DC4C4C" radius={[6, 6, 0, 0]} /><Bar dataKey="Net" fill="#B7791F" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
    </div>
  );
}

export function SpendingPage({ workspace }: { workspace: WorkspaceType }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const wsIds = useMemo(() => workspace === 'combined' ? db.workspaces.map(w => w.id) : db.workspaces.filter(w => w.type === workspace).map(w => w.id), [db, workspace]);
  const exp = db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_type === 'expense');
  const total = exp.reduce((s, t) => s + t.amount, 0);
  const byCat = useMemo(() => { const m = new Map<string, number>(); exp.forEach(t => { const n = db.categories.find(c => c.id === t.category_id)?.name || 'Other'; m.set(n, (m.get(n) || 0) + t.amount); }); return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [db, exp]);
  const byMonth = useMemo(() => lastNMonths(6).map(m => ({ month: m.label, Spending: db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_date.startsWith(m.key) && t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0) })), [db, wsIds]);
  const highest = [...exp].sort((a, b) => b.amount - a.amount).slice(0, 8);
  const filtered = highest.filter(t => !q || t.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[['Total Spending', total], ['Categories', byCat.length], ['Transactions', exp.length], ['Avg. Expense', exp.length ? total / exp.length : 0]].map(([l, v]) => (
          <Card key={l as string} className="p-4 text-center"><div className="text-[11px] font-bold uppercase text-[#718078]">{l}</div><div className="mt-1 text-lg font-extrabold">{typeof v === 'number' && (v as number) > 100 ? inr(v as number) : v}</div></Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5"><h3 className="font-bold">Spending by Category</h3><div className="mt-3 h-[260px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>{byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: any) => inr(Number(v))} /></PieChart></ResponsiveContainer></div>
          <div className="space-y-2">{byCat.slice(0, 6).map(c => { const pct = total ? Math.round(c.value / total * 100) : 0; return <div key={c.name}><div className="flex justify-between text-xs"><span className="font-semibold">{c.name}</span><span className="font-bold">{inr(c.value)} · {pct}%</span></div><div className="mt-1 h-2 rounded-full bg-[#EEF2EF]"><div className="h-2 rounded-full bg-[#245F49]" style={{ width: pct + '%' }} /></div></div>; })}</div></Card>
        <Card className="p-5"><h3 className="font-bold">Monthly Spending Comparison</h3><div className="mt-3 h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={byMonth}><CartesianGrid strokeDasharray="3 3" stroke="#E6EDE8" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => '₹' + (v / 1000) + 'k'} /><Tooltip formatter={(v: any) => inr(Number(v))} /><Bar dataKey="Spending" fill="#245F49" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
          <h3 className="mt-5 font-bold">Highest Expenses</h3><div className="relative mt-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" /><Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search expenses…" className="pl-9" /></div>
          <div className="mt-3 space-y-2">{filtered.map(t => <div key={t.id} className="flex justify-between rounded-xl bg-[#F7F9F7] px-4 py-2.5 text-sm"><span className="font-semibold">{t.title}<span className="block text-xs text-[#718078]">{fmtDate(t.transaction_date)} · {db.categories.find(c => c.id === t.category_id)?.name || ''}</span></span><span className="font-extrabold text-[#DC4C4C]">{inr(t.amount)}</span></div>)}{filtered.length === 0 && <p className="text-sm text-[#718078]">No expenses found.</p>}</div></Card>
      </div>
      <Card className="p-5"><div className="flex items-center gap-2 font-bold"><TrendingUp size={17} className="text-[#245F49]" /> Spending Insights</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-2xl bg-[#F7F9F7] p-4"><div className="text-xs text-[#718078]">Top category</div><div className="font-extrabold">{byCat[0]?.name || '—'} · {byCat[0] ? inr(byCat[0].value) : ''}</div></div>
          <div className="rounded-2xl bg-[#F7F9F7] p-4"><div className="text-xs text-[#718078]">Biggest single expense</div><div className="font-extrabold">{highest[0] ? `${highest[0].title} — ${inr(highest[0].amount)}` : '—'}</div></div>
          <div className="rounded-2xl bg-[#F7F9F7] p-4"><div className="text-xs text-[#718078]">This month vs last month</div><div className="font-extrabold">{byMonth.length > 1 ? (() => { const cur = byMonth[byMonth.length - 1].Spending; const prev = byMonth[byMonth.length - 2].Spending; const d = prev ? Math.round((cur - prev) / prev * 100) : 0; return `${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}%` })() : '—'}</div></div>
        </div></Card>
    </div>
  );
}
