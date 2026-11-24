import { useMemo, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, Clock, AlertCircle, Briefcase, Users, IndianRupee, CalendarRange } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../lib/store';
import { accountBalance, workspaceTotals, projectFinancials } from '../lib/db';
import { inr, rangeFor, lastNMonths, lastNDays, type RangeKey } from '../lib/utils';
import { Card, StatCard, TxRow, Empty, Btn, Badge } from '../components/ui';
import type { WorkspaceType } from '../lib/types';

const COLORS = ['#245F49', '#2F7657', '#16A36A', '#7FB69E', '#B7791F', '#DC4C4C', '#2F5AA6', '#718078'];

export function Dashboard({ workspace, go }: { workspace: WorkspaceType; go: (p: string) => void }) {
  const { db } = useStore();
  const [range, setRange] = useState<RangeKey>('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const r = rangeFor(range, custom);

  const wsIds = useMemo(() => {
    if (workspace === 'combined') return db.workspaces.map(w => w.id);
    const t = workspace === 'personal' ? 'personal' : 'business';
    return db.workspaces.filter(w => w.type === t).map(w => w.id);
  }, [db, workspace]);

  const totals = useMemo(() => workspaceTotals(db, wsIds, r.from, r.to), [db, wsIds, r.from, r.to]);
  const allTotals = useMemo(() => workspaceTotals(db, wsIds), [db, wsIds]);
  const txs = totals.txs;
  const incomeTxs = txs.filter(t => t.transaction_type === 'income');
  const expenseTxs = txs.filter(t => t.transaction_type === 'expense');

  const receivables = useMemo(() => db.projects.filter(p => wsIds.includes(p.workspace_id)).reduce((s, p) => s + projectFinancials(db, p.id).pending, 0), [db, wsIds]);
  const savings = useMemo(() => db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_type === 'income' && (t.category_id && db.categories.find(c => c.id === t.category_id)?.name === 'Investments')).reduce((s, t) => s + t.amount, 0), [db, wsIds]);

  const monthly = useMemo(() => lastNMonths(6).map(m => {
    const inc = db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_date.startsWith(m.key) && t.transaction_type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_date.startsWith(m.key) && t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { month: m.label, Income: inc, Expenses: exp, Net: inc - exp };
  }), [db, wsIds]);

  const daily = useMemo(() => lastNDays(14).map(d => {
    const exp = db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_date === d.date && t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0);
    const inc = db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_date === d.date && t.transaction_type === 'income').reduce((s, t) => s + t.amount, 0);
    return { day: d.label, Spending: exp, Income: inc };
  }), [db, wsIds]);

  const expenseByCat = useMemo(() => {
    const map = new Map<string, number>();
    expenseTxs.forEach(t => { const n = db.categories.find(c => c.id === t.category_id)?.name || 'Other'; map.set(n, (map.get(n) || 0) + t.amount); });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [db, expenseTxs]);
  const incomeByCat = useMemo(() => {
    const map = new Map<string, number>();
    incomeTxs.forEach(t => { const n = db.categories.find(c => c.id === t.category_id)?.name || 'Other'; map.set(n, (map.get(n) || 0) + t.amount); });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [db, incomeTxs]);

  const recent = [...txs].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at)).slice(0, 8);
  const highest = [...expenseTxs].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const accounts = db.financial_accounts.filter(a => wsIds.includes(a.workspace_id) && a.is_active);
  const projects = db.projects.filter(p => wsIds.includes(p.workspace_id));
  const budgets = db.budgets.filter(b => wsIds.includes(b.workspace_id));
  const budgetRows = budgets.map(b => {
    const spent = db.transactions.filter(t => t.workspace_id === b.workspace_id && t.transaction_type === 'expense' && t.transaction_date >= b.start_date && t.transaction_date <= b.end_date && (!b.category_id || t.category_id === b.category_id)).reduce((s, t) => s + t.amount, 0);
    return { ...b, spent, pct: b.amount ? Math.min(100, Math.round(spent / b.amount * 100)) : 0 };
  });

  const rangeBtns: { k: RangeKey; l: string }[] = [{ k: 'today', l: 'Today' }, { k: 'week', l: 'Week' }, { k: 'month', l: 'Month' }, { k: 'lastMonth', l: 'Last Month' }, { k: 'year', l: 'Year' }, { k: 'all', l: 'All Time' }, { k: 'custom', l: 'Custom' }];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-2xl border border-[#E6EDE8] bg-white p-1">
          {rangeBtns.map(b => <button key={b.k} onClick={() => setRange(b.k)} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${range === b.k ? 'bg-[#245F49] text-white' : 'text-[#5B6B62] hover:bg-[#F1F5F2]'}`}>{b.l}</button>)}
        </div>
        {range === 'custom' && <div className="flex items-center gap-2 rounded-2xl border border-[#E6EDE8] bg-white px-3 py-2"><CalendarRange size={15} className="text-[#718078]" /><input type="date" value={custom.from} onChange={e => setCustom({ ...custom, from: e.target.value })} className="text-sm outline-none" /><span className="text-xs text-[#718078]">to</span><input type="date" value={custom.to} onChange={e => setCustom({ ...custom, to: e.target.value })} className="text-sm outline-none" /></div>}
        <span className="ml-auto text-xs font-semibold text-[#718078]">{r.label}{r.from ? ` · ${r.from} → ${r.to}` : ''}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Available Balance" value={inr(allTotals.balance)} sub={`${accounts.length} active accounts`} icon={Wallet} tone="green" onClick={() => go('accounts')} />
        <StatCard label="Total Income" value={inr(totals.income)} sub={`${incomeTxs.length} income records`} icon={TrendingUp} tone="green" onClick={() => go('income')} />
        <StatCard label="Total Expenses" value={inr(totals.expense)} sub={`${expenseTxs.length} expense records`} icon={TrendingDown} tone="red" onClick={() => go('expenses')} />
        <StatCard label="Net Cash Flow" value={inr(totals.net)} sub={totals.net >= 0 ? 'Positive cash flow' : 'Negative cash flow'} icon={ArrowLeftRight} tone={totals.net >= 0 ? 'green' : 'red'} />
        <StatCard label="Total Savings" value={inr(savings)} sub="Investment income" icon={PiggyBank} tone="blue" />
        <StatCard label="Receivables" value={inr(receivables)} sub="Pending client payments" icon={Clock} tone="amber" onClick={() => go('payments')} />
        <StatCard label="Client Revenue" value={inr(db.transactions.filter(t => wsIds.includes(t.workspace_id) && t.transaction_type === 'income' && t.project_id).reduce((s, t) => s + t.amount, 0))} sub={`${projects.length} projects`} icon={Briefcase} tone="green" onClick={() => go('projects')} />
        <StatCard label="Business Profit" value={inr(projects.reduce((s, p) => s + projectFinancials(db, p.id).profit, 0))} sub="Received − project expenses" icon={IndianRupee} tone="blue" onClick={() => go('analytics')} />
      </div>

      {txs.length === 0 && <Card><Empty title="No financial data in this period" subtitle="Try a different date range, or add your first income or expense to see analytics come alive." action={<div className="flex gap-2"><Btn onClick={() => go('income')}>Add Income</Btn><Btn variant="secondary" onClick={() => go('expenses')}>Add Expense</Btn></div>} /></Card>}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between"><div><h3 className="font-bold">Income vs Expense</h3><p className="text-xs text-[#718078]">Last 6 months · {workspace === 'combined' ? 'Combined' : workspace}</p></div><Badge tone="green">Live data</Badge></div>
          <div className="mt-4 h-[260px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16A36A" stopOpacity={0.25} /><stop offset="100%" stopColor="#16A36A" stopOpacity={0} /></linearGradient><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#DC4C4C" stopOpacity={0.22} /><stop offset="100%" stopColor="#DC4C4C" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#E6EDE8" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => '₹' + (v / 1000) + 'k'} /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend /><Area type="monotone" dataKey="Income" stroke="#16A36A" fill="url(#g1)" strokeWidth={2.5} /><Area type="monotone" dataKey="Expenses" stroke="#DC4C4C" fill="url(#g2)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold">Expense Breakdown</h3><p className="text-xs text-[#718078]">By category · {r.label}</p>
          {expenseByCat.length === 0 ? <Empty title="No expenses" subtitle="Expenses will appear here as a donut chart." /> : (
            <><div className="mt-2 h-[210px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseByCat} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>{expenseByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: any) => inr(Number(v))} /></PieChart></ResponsiveContainer></div>
            <div className="space-y-1.5">{expenseByCat.slice(0, 5).map((c, i) => <div key={c.name} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="flex-1 truncate font-medium">{c.name}</span><span className="font-bold">{inr(c.value)}</span></div>)}</div></>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between"><h3 className="font-bold">Monthly Cash Flow</h3><Btn variant="ghost" onClick={() => go('trends')}>View Trends →</Btn></div>
          <div className="mt-3 h-[220px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke="#E6EDE8" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => '₹' + (v / 1000) + 'k'} /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend /><Bar dataKey="Income" fill="#245F49" radius={[6, 6, 0, 0]} /><Bar dataKey="Expenses" fill="#DC4C4C" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold">Daily Spending Trend</h3><p className="text-xs text-[#718078]">Last 14 days</p>
          <div className="mt-3 h-[220px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={daily}><CartesianGrid strokeDasharray="3 3" stroke="#E6EDE8" /><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => '₹' + v} /><Tooltip formatter={(v: any) => inr(Number(v))} /><Bar dataKey="Spending" fill="#B7791F" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4"><h3 className="font-bold">Recent Transactions</h3><Btn variant="ghost" onClick={() => go('transactions')}>View All →</Btn></div>
          <div className="divide-y divide-[#EFF4F0]">{recent.length === 0 ? <Empty title="No transactions" subtitle="Your recent activity will show up here." /> : recent.map(t => <TxRow key={t.id} tx={t} catName={db.categories.find(c => c.id === t.category_id)?.name || '—'} accName={db.financial_accounts.find(a => a.id === t.account_id)?.name || '—'} />)}</div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold">Top Spending Categories</h3>
            <div className="mt-3 space-y-3">{expenseByCat.slice(0, 4).map(c => { const pct = totals.expense ? Math.round(c.value / totals.expense * 100) : 0; return <div key={c.name}><div className="flex justify-between text-xs"><span className="font-semibold">{c.name}</span><span className="font-bold">{inr(c.value)} · {pct}%</span></div><div className="mt-1 h-2 rounded-full bg-[#EEF2EF]"><div className="h-2 rounded-full bg-[#245F49]" style={{ width: pct + '%' }} /></div></div>; })}{expenseByCat.length === 0 && <p className="text-sm text-[#718078]">No spending data.</p>}</div>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold">Highest Expenses</h3>
            <div className="mt-3 space-y-2.5">{highest.map(t => <div key={t.id} className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-semibold">{t.title}</div><div className="text-xs text-[#718078]">{t.transaction_date}</div></div><span className="font-extrabold text-[#DC4C4C]">{inr(t.amount)}</span></div>)}{highest.length === 0 && <p className="text-sm text-[#718078]">No expenses recorded.</p>}</div>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold">Income by Category</h3>
            <div className="mt-3 space-y-2">{incomeByCat.slice(0, 4).map(c => <div key={c.name} className="flex justify-between text-sm"><span className="font-medium">{c.name}</span><span className="font-bold text-[#16A36A]">{inr(c.value)}</span></div>)}{incomeByCat.length === 0 && <p className="text-sm text-[#718078]">No income data.</p>}</div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between"><h3 className="font-bold">Account Balances</h3><Btn variant="ghost" onClick={() => go('accounts')}>Manage →</Btn></div>
          <div className="mt-3 space-y-2.5">{accounts.map(a => <div key={a.id} className="flex items-center justify-between rounded-xl bg-[#F7F9F7] px-4 py-3"><div><div className="text-sm font-bold">{a.name}</div><div className="text-xs text-[#718078]">{a.account_type} · Opening {inr(a.opening_balance)}</div></div><span className={`font-extrabold ${accountBalance(db, a.id) < 0 ? 'text-[#DC4C4C]' : 'text-[#17231D]'}`}>{inr(accountBalance(db, a.id))}</span></div>)}{accounts.length === 0 && <p className="text-sm text-[#718078]">No accounts yet.</p>}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><h3 className="font-bold">Budget Utilization</h3><Btn variant="ghost" onClick={() => go('budgets')}>Budgets →</Btn></div>
          <div className="mt-3 space-y-3">{budgetRows.map(b => <div key={b.id}><div className="flex justify-between text-xs"><span className="font-semibold">{b.name}</span><span className="font-bold">{inr(b.spent)} / {inr(b.amount)} · {b.pct}%</span></div><div className="mt-1 h-2.5 rounded-full bg-[#EEF2EF]"><div className={`h-2.5 rounded-full ${b.pct >= 100 ? 'bg-[#DC4C4C]' : b.pct >= 75 ? 'bg-[#B7791F]' : 'bg-[#245F49]'}`} style={{ width: b.pct + '%' }} /></div>{b.pct >= 75 && <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#B7791F]"><AlertCircle size={12} /> {b.pct >= 100 ? 'Budget exceeded!' : b.pct >= 90 ? '90% consumed — near limit' : '75% consumed — watch spending'}</div>}</div>)}{budgetRows.length === 0 && <p className="text-sm text-[#718078]">No budgets created yet.</p>}</div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between"><h3 className="font-bold">Project-wise Revenue</h3><Btn variant="ghost" onClick={() => go('projects')}>Projects →</Btn></div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{projects.map(p => { const f = projectFinancials(db, p.id); return <div key={p.id} className="rounded-2xl border border-[#E6EDE8] p-4"><div className="flex items-center justify-between"><span className="font-bold">{p.name}</span><Badge tone={f.pending > 0 ? 'amber' : 'green'}>{f.pending > 0 ? inr(f.pending) + ' pending' : 'Fully paid'}</Badge></div><div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-[#F7F9F7] p-2"><div className="text-[#718078]">Contract</div><div className="font-extrabold">{inr(p.contract_amount)}</div></div><div className="rounded-xl bg-[#F7F9F7] p-2"><div className="text-[#718078]">Received</div><div className="font-extrabold text-[#16A36A]">{inr(f.received)}</div></div><div className="rounded-xl bg-[#F7F9F7] p-2"><div className="text-[#718078]">Profit</div><div className="font-extrabold">{inr(f.profit)}</div></div></div></div>; })}{projects.length === 0 && <p className="text-sm text-[#718078]">No projects yet. Create one in Business → Projects.</p>}</div>
      </Card>
      <div className="flex items-center gap-2 text-xs text-[#718078]"><Users size={14} /> Tip: Switch workspaces from the sidebar to see Personal, MINAH TECH, or Combined views. All figures update live from your records.</div>
    </div>
  );
}
