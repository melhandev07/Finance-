import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Pencil, ArrowLeftRight, Wallet, PieChart } from 'lucide-react';
import { useStore } from '../lib/store';
import { uid, nowISO, accountBalance } from '../lib/db';
import { inr, fmtDate, fmtDateTime, PAYMENT_METHODS, ACCOUNT_TYPES, downloadCSV } from '../lib/utils';
import { Card, Btn, Input, Select, Label, Modal, Confirm, Empty, Pagination, Badge, TxRow } from '../components/ui';
import type { WorkspaceType, Transaction } from '../lib/types';

function useWs(workspace: WorkspaceType) {
  const { db } = useStore();
  const ws = useMemo(() => {
    if (workspace === 'combined') return db.workspaces;
    return db.workspaces.filter(w => w.type === workspace);
  }, [db, workspace]);
  const ids = ws.map(w => w.id);
  return { db, ws, ids };
}

export function TxForm({ open, onClose, type, workspace, editing, onSaved }: { open: boolean; onClose: () => void; type: 'income' | 'expense'; workspace: WorkspaceType; editing?: Transaction | null; onSaved: () => void }) {
  const { db, user, mutate, setToast } = useStore();
  const { ws } = useWs(workspace);
  const [f, setF] = useState<any>({ title: '', amount: '', workspace_id: '', category_id: '', account_id: '', transaction_date: new Date().toISOString().slice(0, 10), payment_method: 'UPI', description: '', vendor: '', reference_number: '', project_id: '', client_id: '', subcategory: '', notes: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useMemo(() => {
    if (open) {
      if (editing) setF({ title: editing.title, amount: String(editing.amount), workspace_id: editing.workspace_id, category_id: editing.category_id || '', account_id: editing.account_id, transaction_date: editing.transaction_date, payment_method: editing.payment_method, description: editing.description || '', vendor: editing.vendor || '', reference_number: editing.reference_number || '', project_id: editing.project_id || '', client_id: editing.client_id || '', subcategory: editing.subcategory || '', notes: editing.notes || '' });
      else setF({ title: '', amount: '', workspace_id: ws[0]?.id || '', category_id: '', account_id: '', transaction_date: new Date().toISOString().slice(0, 10), payment_method: 'UPI', description: '', vendor: '', reference_number: '', project_id: '', client_id: '', subcategory: '', notes: '' });
    }
  }, [open, editing, ws]);

  const accounts = db.financial_accounts.filter(a => a.workspace_id === f.workspace_id && a.is_active);
  const cats = db.categories.filter(c => c.workspace_id === f.workspace_id && c.type === type && c.is_active);
  const projects = db.projects.filter(p => p.workspace_id === f.workspace_id);
  const clients = db.clients.filter(c => c.workspace_id === f.workspace_id);

  const save = () => {
    setErr('');
    const amount = Number(f.amount);
    if (!f.title.trim()) return setErr('Title is required.');
    if (!amount || amount <= 0) return setErr('Enter a valid amount greater than ₹0.');
    if (!f.workspace_id) return setErr('Select a workspace.');
    if (!f.account_id) return setErr('Select an account.');
    if (!f.category_id) return setErr('Select a category.');
    if (!f.transaction_date) return setErr('Select a date.');
    if (type === 'expense' && !f.description.trim()) return setErr('Purpose / description is required for every expense — explain why the money was spent.');
    setSaving(true);
    const payload = { title: f.title.trim(), amount: Math.round(amount * 100) / 100, workspace_id: f.workspace_id, category_id: f.category_id, account_id: f.account_id, transaction_date: f.transaction_date, payment_method: f.payment_method, description: f.description.trim(), vendor: f.vendor.trim(), reference_number: f.reference_number.trim(), project_id: f.project_id || null, client_id: f.client_id || null, subcategory: f.subcategory.trim(), notes: f.notes.trim() };
    mutate(d => {
      if (editing) {
        const t = d.transactions.find(x => x.id === editing.id);
        if (t) Object.assign(t, payload, { updated_at: nowISO() });
      } else {
        d.transactions.unshift({ id: uid(), transaction_type: type, status: 'confirmed', created_by: user!.id, created_at: nowISO(), updated_at: nowISO(), ...payload } as any);
      }
    }, editing ? 'update' : 'create', type, editing?.id || 'new', f.workspace_id);
    setSaving(false); setToast(editing ? 'Record updated — balances recalculated.' : (type === 'income' ? 'Income recorded.' : 'Expense recorded.')); onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${type}` : `Add ${type}`} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label>Title *</Label><Input value={f.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} placeholder={type === 'income' ? 'e.g. Salary — June' : 'e.g. Groceries — BigBasket'} /></div>
        <div><Label>Amount (₹) *</Label><Input type="number" min="0" step="0.01" value={f.amount} onChange={(e: any) => setF({ ...f, amount: e.target.value })} placeholder="0.00" /></div>
        <div><Label>Date Received / Expense Date *</Label><Input type="date" value={f.transaction_date} onChange={(e: any) => setF({ ...f, transaction_date: e.target.value })} /></div>
        <div><Label>Workspace *</Label><Select value={f.workspace_id} onChange={(e: any) => setF({ ...f, workspace_id: e.target.value, category_id: '', account_id: '' })}><option value="">Select workspace</option>{ws.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>
        <div><Label>Category *</Label><Select value={f.category_id} onChange={(e: any) => setF({ ...f, category_id: e.target.value })}><option value="">Select category</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
        <div><Label>Destination / Paid From Account *</Label><Select value={f.account_id} onChange={(e: any) => setF({ ...f, account_id: e.target.value })}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {inr(accountBalance(db, a.id))}</option>)}</Select></div>
        <div><Label>Payment Method</Label><Select value={f.payment_method} onChange={(e: any) => setF({ ...f, payment_method: e.target.value })}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</Select></div>
        <div><Label>{type === 'income' ? 'Income Source' : 'Vendor / Receiver'}</Label><Input value={f.vendor} onChange={(e: any) => setF({ ...f, vendor: e.target.value })} placeholder={type === 'income' ? 'e.g. Employer / Client' : 'e.g. BigBasket, Hostinger'} /></div>
        <div><Label>Subcategory</Label><Input value={f.subcategory} onChange={(e: any) => setF({ ...f, subcategory: e.target.value })} placeholder="Optional" /></div>
        <div><Label>Reference Number</Label><Input value={f.reference_number} onChange={(e: any) => setF({ ...f, reference_number: e.target.value })} placeholder="Optional" /></div>
        <div><Label>Linked Project (optional)</Label><Select value={f.project_id} onChange={(e: any) => setF({ ...f, project_id: e.target.value })}><option value="">None</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
        <div><Label>Linked Client (optional)</Label><Select value={f.client_id} onChange={(e: any) => setF({ ...f, client_id: e.target.value })}><option value="">None</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
        <div className="sm:col-span-2"><Label>{type === 'expense' ? 'Purpose / Description * — why was this money spent?' : 'Description'}</Label><Input value={f.description} onChange={(e: any) => setF({ ...f, description: e.target.value })} placeholder={type === 'expense' ? 'e.g. Monthly groceries for family' : 'Optional notes'} /></div>
        <div className="sm:col-span-2"><Label>Notes</Label><Input value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} placeholder="Optional" /></div>
      </div>
      {err && <div className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm font-semibold text-[#DC4C4C]">{err}</div>}
      <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}</Btn></div>
    </Modal>
  );
}

export function TxList({ type, workspace }: { type: 'income' | 'expense'; workspace: WorkspaceType }) {
  const { db, mutate, setToast } = useStore();
  const { ids } = useWs(workspace);
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [pm, setPm] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1); const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<Transaction | null>(null); const [viewing, setViewing] = useState<Transaction | null>(null); const [del, setDel] = useState<Transaction | null>(null);
  const perPage = 10;

  const rows = useMemo(() => {
    let r = db.transactions.filter(t => ids.includes(t.workspace_id) && t.transaction_type === type);
    if (q) r = r.filter(t => (t.title + t.description + (t.vendor || '') + (t.reference_number || '')).toLowerCase().includes(q.toLowerCase()));
    if (cat) r = r.filter(t => t.category_id === cat);
    if (pm) r = r.filter(t => t.payment_method === pm);
    if (from) r = r.filter(t => t.transaction_date >= from);
    if (to) r = r.filter(t => t.transaction_date <= to);
    r = [...r].sort((a, b) => sort === 'newest' ? b.transaction_date.localeCompare(a.transaction_date) : sort === 'oldest' ? a.transaction_date.localeCompare(b.transaction_date) : sort === 'high' ? b.amount - a.amount : a.amount - b.amount);
    return r;
  }, [db, ids, type, q, cat, pm, from, to, sort]);
  const cats = db.categories.filter(c => ids.includes(c.workspace_id) && c.type === type);
  const total = rows.reduce((s, t) => s + t.amount, 0);
  const paged = rows.slice((page - 1) * perPage, page * perPage);

  const exportCSV = () => { downloadCSV(`${type}-report.csv`, [['Date', 'Title', 'Category', 'Amount', 'Account', 'Payment Method', 'Description'], ...rows.map(t => [t.transaction_date, t.title, db.categories.find(c => c.id === t.category_id)?.name || '', String(t.amount), db.financial_accounts.find(a => a.id === t.account_id)?.name || '', t.payment_method, t.description || ''])]); setToast('CSV downloaded.'); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" /><Input value={q} onChange={(e: any) => { setQ(e.target.value); setPage(1); }} placeholder={`Search ${type}…`} className="pl-9" /></div>
        <Select value={cat} onChange={(e: any) => setCat(e.target.value)} className="w-auto"><option value="">All Categories</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select value={pm} onChange={(e: any) => setPm(e.target.value)} className="w-auto"><option value="">All Methods</option>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</Select>
        <Input type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} className="w-auto" /><Input type="date" value={to} onChange={(e: any) => setTo(e.target.value)} className="w-auto" />
        <Select value={sort} onChange={(e: any) => setSort(e.target.value)} className="w-auto"><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="high">Highest Amount</option><option value="low">Lowest Amount</option></Select>
        <Btn variant="secondary" onClick={exportCSV}>Export CSV</Btn>
        <Btn onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> Add {type === 'income' ? 'Income' : 'Expense'}</Btn>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center"><div className="text-[11px] font-bold uppercase text-[#718078]">Records</div><div className="text-xl font-extrabold">{rows.length}</div></Card>
        <Card className="p-4 text-center"><div className="text-[11px] font-bold uppercase text-[#718078]">Total {type}</div><div className={`text-xl font-extrabold ${type === 'income' ? 'text-[#16A36A]' : 'text-[#DC4C4C]'}`}>{inr(total)}</div></Card>
        <Card className="p-4 text-center"><div className="text-[11px] font-bold uppercase text-[#718078]">Average</div><div className="text-xl font-extrabold">{inr(rows.length ? total / rows.length : 0)}</div></Card>
      </div>
      <Card className="overflow-hidden">
        {paged.length === 0 ? <Empty title={`No ${type} found`} subtitle="Adjust filters or add a new record." action={<Btn onClick={() => setFormOpen(true)}><Plus size={16} /> Add {type}</Btn>} /> :
          <div className="divide-y divide-[#EFF4F0]">{paged.map(t => <TxRow key={t.id} tx={t} catName={db.categories.find(c => c.id === t.category_id)?.name || '—'} accName={db.financial_accounts.find(a => a.id === t.account_id)?.name || '—'} onView={() => setViewing(t)} onEdit={() => { setEditing(t); setFormOpen(true); }} onDelete={() => setDel(t)} />)}</div>}
        <Pagination page={page} total={rows.length} perPage={perPage} onPage={setPage} />
      </Card>
      <TxForm open={formOpen} onClose={() => setFormOpen(false)} type={type} workspace={workspace} editing={editing} onSaved={() => setPage(1)} />
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Record Details">
        {viewing && <div className="space-y-2.5 text-sm">
          {[['Title', viewing.title], ['Amount', inr(viewing.amount)], ['Type', viewing.transaction_type], ['Date', fmtDate(viewing.transaction_date)], ['Category', db.categories.find(c => c.id === viewing.category_id)?.name || '—'], ['Account', db.financial_accounts.find(a => a.id === viewing.account_id)?.name || '—'], ['Workspace', db.workspaces.find(w => w.id === viewing.workspace_id)?.name || '—'], ['Payment Method', viewing.payment_method], ['Vendor / Source', viewing.vendor || '—'], ['Description', viewing.description || '—'], ['Reference', viewing.reference_number || '—'], ['Created', fmtDateTime(viewing.created_at)], ['Transaction ID', viewing.id]].map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-[#EFF4F0] pb-2"><span className="font-semibold text-[#718078]">{k}</span><span className="text-right font-medium break-all">{v}</span></div>)}
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" onClick={() => setViewing(null)}>Close</Btn><Btn onClick={() => { setEditing(viewing); setViewing(null); setFormOpen(true); }}>Edit</Btn></div>
        </div>}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete Record" message={`Delete “${del?.title}” (${del ? inr(del.amount) : ''})? Account balances will be recalculated automatically. This cannot be undone.`} onConfirm={() => { if (del) { mutate(d => { d.transactions = d.transactions.filter(t => t.id !== del.id); d.project_payments = d.project_payments.filter(p => p.transaction_id !== del.id); }, 'delete', type, del.id, del.workspace_id); setToast('Record deleted. Balances updated.'); } setDel(null); }} />
    </div>
  );
}

export function TransactionsPage({ workspace }: { workspace: WorkspaceType }) {
  const { db, mutate, setToast } = useStore();
  const { ids } = useWs(workspace);
  const [q, setQ] = useState(''); const [type, setType] = useState('all'); const [cat, setCat] = useState(''); const [acc, setAcc] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [sort, setSort] = useState('newest'); const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Transaction | null>(null); const [formType, setFormType] = useState<'income' | 'expense'>('expense'); const [formOpen, setFormOpen] = useState(false); const [del, setDel] = useState<Transaction | null>(null);
  const perPage = 12;
  const rows = useMemo(() => {
    let r = db.transactions.filter(t => ids.includes(t.workspace_id));
    if (type !== 'all') r = r.filter(t => t.transaction_type === type);
    if (q) r = r.filter(t => (t.title + t.description + (t.vendor || '')).toLowerCase().includes(q.toLowerCase()));
    if (cat) r = r.filter(t => t.category_id === cat);
    if (acc) r = r.filter(t => t.account_id === acc);
    if (from) r = r.filter(t => t.transaction_date >= from);
    if (to) r = r.filter(t => t.transaction_date <= to);
    return [...r].sort((a, b) => sort === 'newest' ? b.transaction_date.localeCompare(a.transaction_date) : a.transaction_date.localeCompare(b.transaction_date));
  }, [db, ids, type, q, cat, acc, from, to, sort]);
  const paged = rows.slice((page - 1) * perPage, page * perPage);
  const cats = db.categories.filter(c => ids.includes(c.workspace_id));
  const accs = db.financial_accounts.filter(a => ids.includes(a.workspace_id));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" /><Input value={q} onChange={(e: any) => { setQ(e.target.value); setPage(1); }} placeholder="Search by title…" className="pl-9" /></div>
        <Select value={type} onChange={(e: any) => setType(e.target.value)} className="w-auto"><option value="all">All Types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option></Select>
        <Select value={cat} onChange={(e: any) => setCat(e.target.value)} className="w-auto"><option value="">All Categories</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select value={acc} onChange={(e: any) => setAcc(e.target.value)} className="w-auto"><option value="">All Accounts</option>{accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
        <Input type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} className="w-auto" /><Input type="date" value={to} onChange={(e: any) => setTo(e.target.value)} className="w-auto" />
        <Select value={sort} onChange={(e: any) => setSort(e.target.value)} className="w-auto"><option value="newest">Newest → Oldest</option><option value="oldest">Oldest → Newest</option></Select>
        <Btn variant="secondary" onClick={() => downloadCSV('transactions.csv', [['Date', 'Title', 'Type', 'Category', 'Amount', 'Account', 'Workspace'], ...rows.map(t => [t.transaction_date, t.title, t.transaction_type, db.categories.find(c => c.id === t.category_id)?.name || '', String(t.amount), db.financial_accounts.find(a => a.id === t.account_id)?.name || '', db.workspaces.find(w => w.id === t.workspace_id)?.name || ''])] )}>Export CSV</Btn>
      </div>
      <div className="flex gap-2"><Badge tone="green">● Income</Badge><Badge tone="red">● Expense</Badge><Badge tone="blue">● Transfer</Badge><span className="ml-auto text-xs text-[#718078]">{rows.length} transactions</span></div>
      <Card className="overflow-hidden">
        {paged.length === 0 ? <Empty title="No transactions" subtitle="Try adjusting filters." /> : <div className="divide-y divide-[#EFF4F0]">{paged.map(t => <TxRow key={t.id} tx={t} catName={db.categories.find(c => c.id === t.category_id)?.name || '—'} accName={db.financial_accounts.find(a => a.id === t.account_id)?.name || '—'} onEdit={() => { if (t.transaction_type === 'income' || t.transaction_type === 'expense') { setEditing(t); setFormType(t.transaction_type as any); setFormOpen(true); } }} onDelete={() => setDel(t)} />)}</div>}
        <Pagination page={page} total={rows.length} perPage={perPage} onPage={setPage} />
      </Card>
      <TxForm open={formOpen} onClose={() => setFormOpen(false)} type={formType} workspace={workspace} editing={editing} onSaved={() => {}} />
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete Transaction" message="This will reverse its effect on account balances." onConfirm={() => { if (del) { mutate(d => { d.transactions = d.transactions.filter(t => t.id !== del.id); }, 'delete', 'transaction', del.id, del.workspace_id); setToast('Transaction deleted.'); } setDel(null); }} />
    </div>
  );
}

export function AccountsPage({ workspace }: { workspace: WorkspaceType }) {
  const { db, mutate, setToast } = useStore();
  const { ws, ids } = useWs(workspace);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any>(null); const [viewAcc, setViewAcc] = useState<any>(null);
  const [f, setF] = useState({ name: '', account_type: 'Cash', opening_balance: '', workspace_id: '', description: '' });
  const accounts = db.financial_accounts.filter(a => ids.includes(a.workspace_id)).sort((a, b) => Number(b.is_active) - Number(a.is_active));
  const openForm = (acc?: any) => { setEditing(acc || null); setF(acc ? { name: acc.name, account_type: acc.account_type, opening_balance: String(acc.opening_balance), workspace_id: acc.workspace_id, description: acc.description || '' } : { name: '', account_type: 'Cash', opening_balance: '', workspace_id: ws[0]?.id || '', description: '' }); setOpen(true); };
  const save = () => {
    if (!f.name.trim() || !f.workspace_id) return setToast('Account name and workspace are required.');
    const ob = Number(f.opening_balance) || 0;
    mutate(d => {
      if (editing) { const a = d.financial_accounts.find(x => x.id === editing.id); if (a) Object.assign(a, { name: f.name.trim(), account_type: f.account_type, opening_balance: ob, description: f.description, updated_at: nowISO() }); }
      else d.financial_accounts.push({ id: uid(), workspace_id: f.workspace_id, name: f.name.trim(), account_type: f.account_type, opening_balance: ob, is_active: true, description: f.description, created_at: nowISO(), updated_at: nowISO() });
    }, editing ? 'update' : 'create', 'account', editing?.id || 'new', f.workspace_id);
    setToast(editing ? 'Account updated.' : 'Account created.'); setOpen(false);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm text-[#718078]">Balance = Opening + Income − Expenses ± Transfers. Calculated live, never hardcoded.</p><Btn onClick={() => openForm()}><Plus size={16} /> Add Account</Btn></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map(a => { const bal = accountBalance(db, a.id); const txCount = db.transactions.filter(t => t.account_id === a.id).length + db.transfers.filter(t => t.source_account_id === a.id || t.destination_account_id === a.id).length; return (
          <Card key={a.id} className={`p-5 ${!a.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF3ED] text-[#245F49]"><Wallet size={20} /></div>{!a.is_active && <Badge tone="gray">Archived</Badge>}</div>
            <h3 className="mt-3 font-bold">{a.name}</h3><p className="text-xs text-[#718078]">{a.account_type} · {db.workspaces.find(w => w.id === a.workspace_id)?.name}</p>
            <div className="mt-3 text-2xl font-extrabold">{inr(bal)}</div><p className="text-xs text-[#718078]">Opening {inr(a.opening_balance)} · {txCount} transactions</p>
            <div className="mt-4 flex gap-2"><Btn variant="secondary" onClick={() => setViewAcc(a)}>View</Btn><Btn variant="secondary" onClick={() => openForm(a)}><Pencil size={14} /> Edit</Btn>{a.is_active ? <Btn variant="secondary" onClick={() => { mutate(d => { const x = d.financial_accounts.find(y => y.id === a.id); if (x) x.is_active = false; }, 'archive', 'account', a.id, a.workspace_id); setToast('Account archived.'); }}>Archive</Btn> : <Btn variant="secondary" onClick={() => { mutate(d => { const x = d.financial_accounts.find(y => y.id === a.id); if (x) x.is_active = true; }, 'restore', 'account', a.id, a.workspace_id); setToast('Account restored.'); }}>Restore</Btn>}</div>
          </Card>); })}
        {accounts.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><Empty title="No accounts" subtitle="Create your first cash or bank account." action={<Btn onClick={() => openForm()}><Plus size={16} /> Add Account</Btn>} /></Card>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Account' : 'Add Account'}>
        <div className="grid gap-4"><div><Label>Account Name *</Label><Input value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} placeholder="e.g. HDFC Savings" /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Type</Label><Select value={f.account_type} onChange={(e: any) => setF({ ...f, account_type: e.target.value })}>{ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}</Select></div>
            <div><Label>Opening Balance (₹)</Label><Input type="number" value={f.opening_balance} onChange={(e: any) => setF({ ...f, opening_balance: e.target.value })} placeholder="0" /></div></div>
          <div><Label>Workspace *</Label><Select value={f.workspace_id} onChange={(e: any) => setF({ ...f, workspace_id: e.target.value })}><option value="">Select</option>{ws.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>
          <div><Label>Description</Label><Input value={f.description} onChange={(e: any) => setF({ ...f, description: e.target.value })} placeholder="Optional" /></div>
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn onClick={save}>{editing ? 'Save' : 'Create Account'}</Btn></div></div>
      </Modal>
      <Modal open={!!viewAcc} onClose={() => setViewAcc(null)} title={viewAcc?.name || 'Account'}>
        {viewAcc && <div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-[#F7F9F7] p-3"><div className="text-[11px] text-[#718078]">Opening</div><div className="font-extrabold">{inr(viewAcc.opening_balance)}</div></div><div className="rounded-xl bg-[#F7F9F7] p-3"><div className="text-[11px] text-[#718078]">Current</div><div className="font-extrabold">{inr(accountBalance(db, viewAcc.id))}</div></div><div className="rounded-xl bg-[#F7F9F7] p-3"><div className="text-[11px] text-[#718078]">Type</div><div className="font-extrabold">{viewAcc.account_type}</div></div></div>
          <h4 className="mt-4 font-bold text-sm">Account Transactions</h4><div className="mt-2 divide-y divide-[#EFF4F0]">{db.transactions.filter(t => t.account_id === viewAcc.id).sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)).slice(0, 10).map(t => <TxRow key={t.id} tx={t} catName={db.categories.find(c => c.id === t.category_id)?.name || '—'} accName={viewAcc.name} />)}{db.transactions.filter(t => t.account_id === viewAcc.id).length === 0 && <p className="py-4 text-sm text-[#718078]">No transactions on this account yet.</p>}</div></div>}
      </Modal>
    </div>
  );
}

export function TransfersPage({ workspace }: { workspace: WorkspaceType }) {
  const { db, mutate, setToast } = useStore();
  const { ws, ids } = useWs(workspace);
  const [open, setOpen] = useState(false); const [del, setDel] = useState<any>(null);
  const [f, setF] = useState({ workspace_id: '', source_account_id: '', destination_account_id: '', amount: '', transfer_date: new Date().toISOString().slice(0, 10), description: '' });
  const rows = db.transfers.filter(t => ids.includes(t.workspace_id)).sort((a, b) => b.transfer_date.localeCompare(a.transfer_date));
  const accs = db.financial_accounts.filter(a => a.workspace_id === f.workspace_id && a.is_active);
  const save = () => {
    const amt = Number(f.amount);
    if (!f.workspace_id || !f.source_account_id || !f.destination_account_id) return setToast('Select workspace and both accounts.');
    if (f.source_account_id === f.destination_account_id) return setToast('Source and destination must be different accounts.');
    if (!amt || amt <= 0) return setToast('Enter a valid amount.');
    mutate(d => { d.transfers.unshift({ id: uid(), workspace_id: f.workspace_id, source_account_id: f.source_account_id, destination_account_id: f.destination_account_id, amount: amt, transfer_date: f.transfer_date, description: f.description, created_by: db.profiles[0]?.id || '', created_at: nowISO() }); }, 'create', 'transfer', 'new', f.workspace_id);
    setToast('Transfer completed. Balances updated (not counted as income/expense).'); setOpen(false); setF({ workspace_id: '', source_account_id: '', destination_account_id: '', amount: '', transfer_date: new Date().toISOString().slice(0, 10), description: '' });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm text-[#718078]">Transfers move money between accounts in the same workspace. They never count as income or expenses.</p><Btn onClick={() => setOpen(true)}><ArrowLeftRight size={16} /> New Transfer</Btn></div>
      <Card className="overflow-hidden">{rows.length === 0 ? <Empty title="No transfers yet" subtitle="Move money between your accounts." action={<Btn onClick={() => setOpen(true)}>New Transfer</Btn>} /> :
        <div className="divide-y divide-[#EFF4F0]">{rows.map(t => <div key={t.id} className="flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F0FE] text-[#2F5AA6]"><ArrowLeftRight size={16} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{db.financial_accounts.find(a => a.id === t.source_account_id)?.name} → {db.financial_accounts.find(a => a.id === t.destination_account_id)?.name}</div><div className="text-xs text-[#718078]">{fmtDate(t.transfer_date)} · {t.description || 'Transfer'}</div></div><span className="font-extrabold text-[#2F5AA6]">{inr(t.amount)}</span><button onClick={() => setDel(t)} className="rounded-lg p-2 text-[#DC4C4C] hover:bg-[#FDECEC]"><Trash2 size={15} /></button></div>)}</div>}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="New Transfer">
        <div className="grid gap-4"><div><Label>Workspace *</Label><Select value={f.workspace_id} onChange={(e: any) => setF({ ...f, workspace_id: e.target.value, source_account_id: '', destination_account_id: '' })}><option value="">Select workspace</option>{ws.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>From Account *</Label><Select value={f.source_account_id} onChange={(e: any) => setF({ ...f, source_account_id: e.target.value })}><option value="">Select</option>{accs.map(a => <option key={a.id} value={a.id}>{a.name} ({inr(accountBalance(db, a.id))})</option>)}</Select></div>
            <div><Label>To Account *</Label><Select value={f.destination_account_id} onChange={(e: any) => setF({ ...f, destination_account_id: e.target.value })}><option value="">Select</option>{accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></div></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Amount (₹) *</Label><Input type="number" value={f.amount} onChange={(e: any) => setF({ ...f, amount: e.target.value })} placeholder="0.00" /></div><div><Label>Date</Label><Input type="date" value={f.transfer_date} onChange={(e: any) => setF({ ...f, transfer_date: e.target.value })} /></div></div>
          <div><Label>Description</Label><Input value={f.description} onChange={(e: any) => setF({ ...f, description: e.target.value })} placeholder="e.g. Cash withdrawal" /></div>
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn onClick={save}>Transfer Money</Btn></div></div>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete Transfer" message="Deleting will reverse the balance effect on both accounts." onConfirm={() => { if (del) { mutate(d => { d.transfers = d.transfers.filter(t => t.id !== del.id); }, 'delete', 'transfer', del.id, del.workspace_id); setToast('Transfer deleted.'); } setDel(null); }} />
    </div>
  );
}

export function BudgetsPage({ workspace }: { workspace: WorkspaceType }) {
  const { db, mutate, setToast } = useStore();
  const { ws, ids } = useWs(workspace);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any>(null); const [del, setDel] = useState<any>(null);
  const [f, setF] = useState({ name: '', amount: '', workspace_id: '', category_id: '', period_type: 'monthly', start_date: '', end_date: '' });
  const rows = db.budgets.filter(b => ids.includes(b.workspace_id));
  const spentFor = (b: any) => db.transactions.filter(t => t.workspace_id === b.workspace_id && t.transaction_type === 'expense' && t.transaction_date >= b.start_date && t.transaction_date <= b.end_date && (!b.category_id || t.category_id === b.category_id)).reduce((s, t) => s + t.amount, 0);
  const openForm = (b?: any) => { setEditing(b || null); setF(b ? { name: b.name, amount: String(b.amount), workspace_id: b.workspace_id, category_id: b.category_id || '', period_type: b.period_type, start_date: b.start_date, end_date: b.end_date } : { name: '', amount: '', workspace_id: ws[0]?.id || '', category_id: '', period_type: 'monthly', start_date: new Date().toISOString().slice(0, 7) + '-01', end_date: new Date().toISOString().slice(0, 7) + '-28' }); setOpen(true); };
  const save = () => {
    const amt = Number(f.amount);
    if (!f.name.trim() || !amt || amt <= 0 || !f.workspace_id) return setToast('Name, valid amount and workspace are required.');
    mutate(d => {
      if (editing) { const b = d.budgets.find(x => x.id === editing.id); if (b) Object.assign(b, { name: f.name.trim(), amount: amt, workspace_id: f.workspace_id, category_id: f.category_id || null, period_type: f.period_type, start_date: f.start_date, end_date: f.end_date }); }
      else d.budgets.push({ id: uid(), workspace_id: f.workspace_id, category_id: f.category_id || null, name: f.name.trim(), amount: amt, period_type: f.period_type as any, start_date: f.start_date, end_date: f.end_date, created_at: nowISO() });
    }, editing ? 'update' : 'create', 'budget', editing?.id || 'new', f.workspace_id);
    setToast('Budget saved.'); setOpen(false);
  };
  const cats = db.categories.filter(c => c.workspace_id === f.workspace_id && c.type === 'expense');
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm text-[#718078]">Alerts at 75%, 90% and 100% utilization. Progress updates live from expenses.</p><Btn onClick={() => openForm()}><PieChart size={16} /> New Budget</Btn></div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(b => { const spent = spentFor(b); const pct = b.amount ? Math.round(spent / b.amount * 100) : 0; const remaining = b.amount - spent; return (
          <Card key={b.id} className="p-5">
            <div className="flex items-start justify-between"><div><h3 className="font-bold">{b.name}</h3><p className="text-xs text-[#718078]">{db.workspaces.find(w => w.id === b.workspace_id)?.name} · {b.period_type} · {fmtDate(b.start_date)} → {fmtDate(b.end_date)}</p></div><Badge tone={pct >= 100 ? 'red' : pct >= 75 ? 'amber' : 'green'}>{pct}% used</Badge></div>
            <div className="mt-3 h-3 rounded-full bg-[#EEF2EF]"><div className={`h-3 rounded-full ${pct >= 100 ? 'bg-[#DC4C4C]' : pct >= 75 ? 'bg-[#B7791F]' : 'bg-[#245F49]'}`} style={{ width: Math.min(100, pct) + '%' }} /></div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-[#F7F9F7] p-2.5"><div className="text-[#718078]">Budget</div><div className="font-extrabold">{inr(b.amount)}</div></div><div className="rounded-xl bg-[#F7F9F7] p-2.5"><div className="text-[#718078]">Spent</div><div className="font-extrabold text-[#DC4C4C]">{inr(spent)}</div></div><div className="rounded-xl bg-[#F7F9F7] p-2.5"><div className="text-[#718078]">Remaining</div><div className={`font-extrabold ${remaining < 0 ? 'text-[#DC4C4C]' : 'text-[#16A36A]'}`}>{inr(remaining)}</div></div></div>
            {pct >= 75 && <p className="mt-2 text-xs font-semibold text-[#B7791F]">{pct >= 100 ? '⚠ Budget exceeded by ' + inr(-remaining) : pct >= 90 ? '⚠ 90% consumed — near limit' : '⚠ 75% consumed — watch spending'}</p>}
            <div className="mt-4 flex gap-2"><Btn variant="secondary" onClick={() => openForm(b)}><Pencil size={14} /> Edit</Btn><Btn variant="secondary" onClick={() => setDel(b)}><Trash2 size={14} /> Delete</Btn></div>
          </Card>); })}
        {rows.length === 0 && <Card className="md:col-span-2"><Empty title="No budgets" subtitle="Create a monthly or category budget to track spending." action={<Btn onClick={() => openForm()}>New Budget</Btn>} /></Card>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Budget' : 'New Budget'}>
        <div className="grid gap-4"><div><Label>Budget Name *</Label><Input value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} placeholder="e.g. Monthly Marketing Budget" /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Workspace *</Label><Select value={f.workspace_id} onChange={(e: any) => setF({ ...f, workspace_id: e.target.value, category_id: '' })}><option value="">Select</option>{ws.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>
            <div><Label>Category (optional)</Label><Select value={f.category_id} onChange={(e: any) => setF({ ...f, category_id: e.target.value })}><option value="">All Expenses</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div></div>
          <div className="grid grid-cols-3 gap-3"><div><Label>Amount (₹) *</Label><Input type="number" value={f.amount} onChange={(e: any) => setF({ ...f, amount: e.target.value })} placeholder="5000" /></div>
            <div><Label>Start Date</Label><Input type="date" value={f.start_date} onChange={(e: any) => setF({ ...f, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={f.end_date} onChange={(e: any) => setF({ ...f, end_date: e.target.value })} /></div></div>
          <div><Label>Period Type</Label><Select value={f.period_type} onChange={(e: any) => setF({ ...f, period_type: e.target.value })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></Select></div>
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn onClick={save}>{editing ? 'Save' : 'Create Budget'}</Btn></div></div>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete Budget" message="This budget will be removed." onConfirm={() => { if (del) { mutate(d => { d.budgets = d.budgets.filter(b => b.id !== del.id); }, 'delete', 'budget', del.id, del.workspace_id); setToast('Budget deleted.'); } setDel(null); }} />
    </div>
  );
}
