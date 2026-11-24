import { useMemo, useState } from 'react';
import { Search, Trash2, Pencil, Eye, Briefcase, Users, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../lib/store';
import { uid, nowISO, projectFinancials } from '../lib/db';
import { inr, fmtDate, PROJECT_STATUSES, PAYMENT_METHODS, downloadCSV } from '../lib/utils';
import { Card, Btn, Input, Select, Label, Modal, Confirm, Empty, Badge, StatCard } from '../components/ui';
import type { WorkspaceType } from '../lib/types';

function useBiz(workspace: WorkspaceType) {
  const { db } = useStore();
  const ws = useMemo(() => workspace === 'combined' ? db.workspaces : db.workspaces.filter(w => w.type === workspace), [db, workspace]);
  return { db, ws, ids: ws.map(w => w.id) };
}

export function ProjectsPage({ workspace }: { workspace: WorkspaceType }) {
  const { db, mutate, setToast } = useStore();
  const { ws, ids } = useBiz(workspace);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any>(null); const [viewing, setViewing] = useState<any>(null); const [del, setDel] = useState<any>(null); const [payOpen, setPayOpen] = useState<any>(null);
  const [f, setF] = useState({ name: '', client_id: '', description: '', contract_amount: '', project_status: 'In Progress', start_date: '', expected_completion_date: '', workspace_id: '' });
  const [pay, setPay] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), account_id: '', payment_method: 'Bank Transfer', reference_number: '' });
  const rows = db.projects.filter(p => ids.includes(p.workspace_id));
  const clients = db.clients.filter(c => ids.includes(c.workspace_id));
  const accounts = db.financial_accounts.filter(a => ids.includes(a.workspace_id) && a.is_active);

  const openForm = (p?: any) => { setEditing(p || null); setF(p ? { name: p.name, client_id: p.client_id || '', description: p.description || '', contract_amount: String(p.contract_amount), project_status: p.project_status, start_date: p.start_date, expected_completion_date: p.expected_completion_date || '', workspace_id: p.workspace_id } : { name: '', client_id: '', description: '', contract_amount: '', project_status: 'In Progress', start_date: new Date().toISOString().slice(0, 10), expected_completion_date: '', workspace_id: ws[0]?.id || '' }); setOpen(true); };
  const save = () => {
    const amt = Number(f.contract_amount);
    if (!f.name.trim() || !amt || amt <= 0 || !f.workspace_id) return setToast('Project name, contract amount and workspace are required.');
    mutate(d => {
      if (editing) { const p = d.projects.find(x => x.id === editing.id); if (p) Object.assign(p, { name: f.name.trim(), client_id: f.client_id || null, description: f.description, contract_amount: amt, project_status: f.project_status, start_date: f.start_date, expected_completion_date: f.expected_completion_date || undefined }); }
      else d.projects.push({ id: uid(), workspace_id: f.workspace_id, client_id: f.client_id || null, name: f.name.trim(), description: f.description, contract_amount: amt, project_status: f.project_status, start_date: f.start_date, expected_completion_date: f.expected_completion_date || undefined, created_at: nowISO() });
    }, editing ? 'update' : 'create', 'project', editing?.id || 'new', f.workspace_id);
    setToast('Project saved.'); setOpen(false);
  };
  const recordPayment = () => {
    const amt = Number(pay.amount);
    if (!payOpen || !amt || amt <= 0 || !pay.account_id) return setToast('Enter amount and select account.');
    const fin = projectFinancials(db, payOpen.id);
    if (amt > fin.pending + 0.001) return setToast(`Payment exceeds pending amount (${inr(fin.pending)}).`);
    mutate(d => {
      const txId = uid();
      d.transactions.unshift({ id: txId, workspace_id: payOpen.workspace_id, account_id: pay.account_id, category_id: d.categories.find(c => c.workspace_id === payOpen.workspace_id && c.type === 'income' && c.name === 'Client Payments')?.id || null, transaction_type: 'income', title: `Client Payment — ${payOpen.name}`, amount: amt, transaction_date: pay.payment_date, description: `Payment received for ${payOpen.name}`, payment_method: pay.payment_method, reference_number: pay.reference_number, project_id: payOpen.id, client_id: payOpen.client_id || null, status: 'confirmed', created_by: d.profiles[0]?.id || '', created_at: nowISO(), updated_at: nowISO() } as any);
      d.project_payments.unshift({ id: uid(), project_id: payOpen.id, transaction_id: txId, amount: amt, payment_date: pay.payment_date, payment_status: 'Received', reference_number: pay.reference_number, created_at: nowISO() });
    }, 'create', 'project_payment', payOpen.id, payOpen.workspace_id);
    setToast('Client payment recorded. Project balances updated.'); setPayOpen(null); setPay({ amount: '', payment_date: new Date().toISOString().slice(0, 10), account_id: '', payment_method: 'Bank Transfer', reference_number: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm text-[#718078]">Contract value ≠ received cash ≠ recognized revenue. Track all three separately.</p><Btn onClick={() => openForm()}><Briefcase size={16} /> New Project</Btn></div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(p => { const fin = projectFinancials(db, p.id); const pct = p.contract_amount ? Math.round(fin.received / p.contract_amount * 100) : 0; return (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">{p.name}</h3><p className="text-xs text-[#718078]">{db.clients.find(c => c.id === p.client_id)?.name || 'No client'} · {p.project_status}</p></div><Badge tone={p.project_status === 'Completed' ? 'green' : p.project_status === 'Archived' ? 'gray' : 'amber'}>{p.project_status}</Badge></div>
            <div className="mt-3 h-2.5 rounded-full bg-[#EEF2EF]"><div className="h-2.5 rounded-full bg-[#245F49]" style={{ width: Math.min(100, pct) + '%' }} /></div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-xl bg-[#F7F9F7] p-2"><div className="text-[#718078]">Contract</div><div className="font-extrabold">{inr(p.contract_amount)}</div></div>
              <div className="rounded-xl bg-[#F7F9F7] p-2"><div className="text-[#718078]">Received</div><div className="font-extrabold text-[#16A36A]">{inr(fin.received)}</div></div>
              <div className="rounded-xl bg-[#F7F9F7] p-2"><div className="text-[#718078]">Pending</div><div className="font-extrabold text-[#B7791F]">{inr(fin.pending)}</div></div>
              <div className="rounded-xl bg-[#F7F9F7] p-2"><div className="text-[#718078]">Profit</div><div className="font-extrabold">{inr(fin.profit)}</div></div>
            </div>
            <p className="mt-2 text-xs text-[#718078]">Expenses {inr(fin.expenses)} · {pct}% collected · Start {fmtDate(p.start_date)}{p.expected_completion_date ? ` · Due ${fmtDate(p.expected_completion_date)}` : ''}</p>
            <div className="mt-4 flex flex-wrap gap-2"><Btn variant="secondary" onClick={() => setViewing(p)}><Eye size={14} /> Details</Btn><Btn variant="secondary" onClick={() => openForm(p)}><Pencil size={14} /> Edit</Btn><Btn onClick={() => { setPayOpen(p); setPay({ amount: '', payment_date: new Date().toISOString().slice(0, 10), account_id: accounts.find(a => a.workspace_id === p.workspace_id)?.id || '', payment_method: 'Bank Transfer', reference_number: '' }); }}><CreditCard size={14} /> Record Payment</Btn><Btn variant="secondary" onClick={() => setDel(p)}><Trash2 size={14} /></Btn></div>
          </Card>); })}
        {rows.length === 0 && <Card className="md:col-span-2"><Empty title="No projects" subtitle="Create your first client project to track revenue and profit." action={<Btn onClick={() => openForm()}>New Project</Btn>} /></Card>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Project' : 'New Project'} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Project Name *</Label><Input value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} placeholder="e.g. Client Website Development" /></div>
          <div><Label>Client</Label><Select value={f.client_id} onChange={(e: any) => setF({ ...f, client_id: e.target.value })}><option value="">No client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company_name || ''}</option>)}</Select></div>
          <div><Label>Workspace *</Label><Select value={f.workspace_id} onChange={(e: any) => setF({ ...f, workspace_id: e.target.value })}><option value="">Select</option>{ws.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>
          <div><Label>Contract Amount (₹) *</Label><Input type="number" value={f.contract_amount} onChange={(e: any) => setF({ ...f, contract_amount: e.target.value })} placeholder="30000" /></div>
          <div><Label>Status</Label><Select value={f.project_status} onChange={(e: any) => setF({ ...f, project_status: e.target.value })}>{PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}</Select></div>
          <div><Label>Start Date</Label><Input type="date" value={f.start_date} onChange={(e: any) => setF({ ...f, start_date: e.target.value })} /></div>
          <div><Label>Expected Completion</Label><Input type="date" value={f.expected_completion_date} onChange={(e: any) => setF({ ...f, expected_completion_date: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Input value={f.description} onChange={(e: any) => setF({ ...f, description: e.target.value })} placeholder="Project scope…" /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn onClick={save}>{editing ? 'Save' : 'Create Project'}</Btn></div>
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Project'}>
        {viewing && (() => { const fin = projectFinancials(db, viewing.id); const txs = db.transactions.filter(t => t.project_id === viewing.id).sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)); return (
          <div><div className="grid grid-cols-4 gap-2 text-center text-xs"><div className="rounded-xl bg-[#F7F9F7] p-3"><div className="text-[#718078]">Contract</div><div className="font-extrabold">{inr(viewing.contract_amount)}</div></div><div className="rounded-xl bg-[#F7F9F7] p-3"><div className="text-[#718078]">Received</div><div className="font-extrabold text-[#16A36A]">{inr(fin.received)}</div></div><div className="rounded-xl bg-[#F7F9F7] p-3"><div className="text-[#718078]">Pending</div><div className="font-extrabold text-[#B7791F]">{inr(fin.pending)}</div></div><div className="rounded-xl bg-[#F7F9F7] p-3"><div className="text-[#718078]">Profit</div><div className="font-extrabold">{inr(fin.profit)}</div></div></div>
            <p className="mt-3 text-sm text-[#5B6B62]">{viewing.description || 'No description.'}</p>
            <h4 className="mt-4 font-bold text-sm">Financial History</h4><div className="mt-2 space-y-2">{txs.map(t => <div key={t.id} className="flex justify-between rounded-xl bg-[#F7F9F7] px-3 py-2 text-sm"><span>{t.title}<span className="block text-xs text-[#718078]">{fmtDate(t.transaction_date)}</span></span><span className={`font-extrabold ${t.transaction_type === 'income' ? 'text-[#16A36A]' : 'text-[#DC4C4C]'}`}>{t.transaction_type === 'income' ? '+' : '−'}{inr(t.amount)}</span></div>)}{txs.length === 0 && <p className="text-sm text-[#718078]">No linked transactions yet.</p>}</div></div>); })()}
      </Modal>
      <Modal open={!!payOpen} onClose={() => setPayOpen(null)} title={`Record Payment — ${payOpen?.name || ''}`}>
        {payOpen && <div className="grid gap-4"><div className="rounded-2xl bg-[#F7F9F7] p-4 text-sm">Pending: <b className="text-[#B7791F]">{inr(projectFinancials(db, payOpen.id).pending)}</b> of {inr(payOpen.contract_amount)} contract. Partial payments are supported — record multiple payments against one project.</div>
          <div><Label>Amount (₹) *</Label><Input type="number" value={pay.amount} onChange={(e: any) => setPay({ ...pay, amount: e.target.value })} placeholder="e.g. 10000" /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Deposit To Account *</Label><Select value={pay.account_id} onChange={(e: any) => setPay({ ...pay, account_id: e.target.value })}><option value="">Select</option>{accounts.filter(a => a.workspace_id === payOpen.workspace_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></div>
            <div><Label>Payment Date</Label><Input type="date" value={pay.payment_date} onChange={(e: any) => setPay({ ...pay, payment_date: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Method</Label><Select value={pay.payment_method} onChange={(e: any) => setPay({ ...pay, payment_method: e.target.value })}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</Select></div>
            <div><Label>Reference</Label><Input value={pay.reference_number} onChange={(e: any) => setPay({ ...pay, reference_number: e.target.value })} placeholder="UTR / invoice no." /></div></div>
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setPayOpen(null)}>Cancel</Btn><Btn onClick={recordPayment}>Record Payment</Btn></div></div>}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Archive Project" message="Archive this project? Linked transactions are kept for history." onConfirm={() => { if (del) { mutate(d => { const p = d.projects.find(x => x.id === del.id); if (p) p.project_status = 'Archived'; }, 'archive', 'project', del.id, del.workspace_id); setToast('Project archived.'); } setDel(null); }} />
    </div>
  );
}

export function ClientsPage({ workspace }: { workspace: WorkspaceType }) {
  const { db, mutate, setToast } = useStore();
  const { ws, ids } = useBiz(workspace);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any>(null); const [del, setDel] = useState<any>(null); const [viewing, setViewing] = useState<any>(null);
  const [f, setF] = useState({ name: '', email: '', phone: '', company_name: '', notes: '', workspace_id: '' });
  const rows = db.clients.filter(c => ids.includes(c.workspace_id));
  const openForm = (c?: any) => { setEditing(c || null); setF(c ? { name: c.name, email: c.email || '', phone: c.phone || '', company_name: c.company_name || '', notes: c.notes || '', workspace_id: c.workspace_id } : { name: '', email: '', phone: '', company_name: '', notes: '', workspace_id: ws[0]?.id || '' }); setOpen(true); };
  const save = () => {
    if (!f.name.trim() || !f.workspace_id) return setToast('Client name and workspace are required.');
    mutate(d => {
      if (editing) { const c = d.clients.find(x => x.id === editing.id); if (c) Object.assign(c, { name: f.name.trim(), email: f.email, phone: f.phone, company_name: f.company_name, notes: f.notes }); }
      else d.clients.push({ id: uid(), workspace_id: f.workspace_id, name: f.name.trim(), email: f.email, phone: f.phone, company_name: f.company_name, notes: f.notes, created_at: nowISO() });
    }, editing ? 'update' : 'create', 'client', editing?.id || 'new', f.workspace_id);
    setToast('Client saved.'); setOpen(false);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm text-[#718078]">Client directory with payment history and outstanding receivables.</p><Btn onClick={() => openForm()}><Users size={16} /> Add Client</Btn></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(c => { const projs = db.projects.filter(p => p.client_id === c.id); const received = projs.reduce((s, p) => s + projectFinancials(db, p.id).received, 0); const pending = projs.reduce((s, p) => s + projectFinancials(db, p.id).pending, 0); return (
          <Card key={c.id} className="p-5">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF3ED] font-extrabold text-[#245F49]">{c.name.slice(0, 1).toUpperCase()}</div><div><h3 className="font-bold">{c.name}</h3><p className="text-xs text-[#718078]">{c.company_name || 'Individual'} · {projs.length} projects</p></div></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs"><div className="rounded-xl bg-[#F7F9F7] p-2.5"><div className="text-[#718078]">Received</div><div className="font-extrabold text-[#16A36A]">{inr(received)}</div></div><div className="rounded-xl bg-[#F7F9F7] p-2.5"><div className="text-[#718078]">Outstanding</div><div className="font-extrabold text-[#B7791F]">{inr(pending)}</div></div></div>
            <p className="mt-2 text-xs text-[#718078]">{c.email || ''} {c.phone ? '· ' + c.phone : ''}</p>
            <div className="mt-3 flex gap-2"><Btn variant="secondary" onClick={() => setViewing(c)}>History</Btn><Btn variant="secondary" onClick={() => openForm(c)}><Pencil size={14} /></Btn><Btn variant="secondary" onClick={() => setDel(c)}><Trash2 size={14} /></Btn></div>
          </Card>); })}
        {rows.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><Empty title="No clients" subtitle="Add your first client." action={<Btn onClick={() => openForm()}>Add Client</Btn>} /></Card>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Client' : 'Add Client'}>
        <div className="grid gap-4"><div><Label>Client Name *</Label><Input value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} placeholder="Full name" /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Company</Label><Input value={f.company_name} onChange={(e: any) => setF({ ...f, company_name: e.target.value })} placeholder="Company name" /></div><div><Label>Workspace *</Label><Select value={f.workspace_id} onChange={(e: any) => setF({ ...f, workspace_id: e.target.value })}><option value="">Select</option>{ws.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Email</Label><Input value={f.email} onChange={(e: any) => setF({ ...f, email: e.target.value })} placeholder="client@email.com" /></div><div><Label>Phone</Label><Input value={f.phone} onChange={(e: any) => setF({ ...f, phone: e.target.value })} placeholder="+91 …" /></div></div>
          <div><Label>Notes</Label><Input value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} placeholder="Optional" /></div>
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn onClick={save}>{editing ? 'Save' : 'Add Client'}</Btn></div></div>
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Payment History — ${viewing.name}` : ''}>
        {viewing && <div className="space-y-2">{db.project_payments.filter(p => db.projects.find(pr => pr.id === p.project_id)?.client_id === viewing.id).map(p => <div key={p.id} className="flex justify-between rounded-xl bg-[#F7F9F7] px-4 py-3 text-sm"><span>{db.projects.find(pr => pr.id === p.project_id)?.name}<span className="block text-xs text-[#718078]">{fmtDate(p.payment_date)} · {p.reference_number || ''}</span></span><span className="font-extrabold text-[#16A36A]">{inr(p.amount)}</span></div>)}{db.project_payments.filter(p => db.projects.find(pr => pr.id === p.project_id)?.client_id === viewing.id).length === 0 && <p className="text-sm text-[#718078]">No payments recorded for this client yet.</p>}</div>}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete Client" message="This client will be removed. Projects linked to them will keep their history." onConfirm={() => { if (del) { mutate(d => { d.clients = d.clients.filter(c => c.id !== del.id); }, 'delete', 'client', del.id, del.workspace_id); setToast('Client deleted.'); } setDel(null); }} />
    </div>
  );
}

export function PaymentsPage({ workspace }: { workspace: WorkspaceType }) {
  const { db } = useStore();
  const { ids } = useBiz(workspace);
  const [q, setQ] = useState('');
  const rows = db.project_payments.filter(p => { const pr = db.projects.find(x => x.id === p.project_id); return pr && ids.includes(pr.workspace_id); }).filter(p => !q || (db.projects.find(x => x.id === p.project_id)?.name || '').toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  const total = rows.reduce((s, p) => s + p.amount, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><div className="relative flex-1 min-w-[200px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" /><Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search by project…" className="pl-9" /></div><Btn variant="secondary" onClick={() => downloadCSV('client-payments.csv', [['Date', 'Project', 'Client', 'Amount', 'Status', 'Reference'], ...rows.map(p => [p.payment_date, db.projects.find(x => x.id === p.project_id)?.name || '', db.clients.find(c => c.id === db.projects.find(x => x.id === p.project_id)?.client_id)?.name || '', String(p.amount), p.payment_status, p.reference_number || ''])] )}>Export CSV</Btn></div>
      <div className="grid grid-cols-3 gap-3"><Card className="p-4 text-center"><div className="text-[11px] font-bold uppercase text-[#718078]">Payments</div><div className="text-xl font-extrabold">{rows.length}</div></Card><Card className="p-4 text-center"><div className="text-[11px] font-bold uppercase text-[#718078]">Total Received</div><div className="text-xl font-extrabold text-[#16A36A]">{inr(total)}</div></Card><Card className="p-4 text-center"><div className="text-[11px] font-bold uppercase text-[#718078]">Outstanding</div><div className="text-xl font-extrabold text-[#B7791F]">{inr(db.projects.filter(p => ids.includes(p.workspace_id)).reduce((s, p) => s + projectFinancials(db, p.id).pending, 0))}</div></Card></div>
      <Card className="overflow-hidden">{rows.length === 0 ? <Empty title="No client payments" subtitle="Record payments from the Projects page." /> :
        <div className="divide-y divide-[#EFF4F0]">{rows.map(p => { const pr = db.projects.find(x => x.id === p.project_id); return <div key={p.id} className="flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E6F4EC] text-[#16A36A]"><CreditCard size={16} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{pr?.name}</div><div className="text-xs text-[#718078]">{fmtDate(p.payment_date)} · {db.clients.find(c => c.id === pr?.client_id)?.name || '—'} · {p.reference_number || ''}</div></div><Badge tone="green">{p.payment_status}</Badge><span className="font-extrabold text-[#16A36A]">{inr(p.amount)}</span></div>; })}</div>}
      </Card>
    </div>
  );
}

export function BusinessAnalytics({ workspace }: { workspace: WorkspaceType }) {
  const { db } = useStore();
  const { ids } = useBiz(workspace);
  const projects = db.projects.filter(p => ids.includes(p.workspace_id));
  const txs = db.transactions.filter(t => ids.includes(t.workspace_id));
  const revenue = txs.filter(t => t.transaction_type === 'income' && t.project_id).reduce((s, t) => s + t.amount, 0);
  const opex = txs.filter(t => t.transaction_type === 'expense' && !t.project_id).reduce((s, t) => s + t.amount, 0);
  const projExp = txs.filter(t => t.transaction_type === 'expense' && t.project_id).reduce((s, t) => s + t.amount, 0);
  const profit = revenue - projExp - opex;
  const byProject = projects.map(p => { const f = projectFinancials(db, p.id); return { name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, Received: f.received, Expenses: f.expenses, Profit: f.profit }; });
  const expCats = useMemo(() => { const m = new Map<string, number>(); txs.filter(t => t.transaction_type === 'expense').forEach(t => { const n = db.categories.find(c => c.id === t.category_id)?.name || 'Other'; m.set(n, (m.get(n) || 0) + t.amount); }); return [...m.entries()].map(([name, value]) => ({ name, value })); }, [db, txs]);
  const empExp = txs.filter(t => t.transaction_type === 'expense' && ['Employee Payments', 'Internship Expenses'].includes(db.categories.find(c => c.id === t.category_id)?.name || '')).reduce((s, t) => s + t.amount, 0);
  const COLORS = ['#245F49', '#2F7657', '#16A36A', '#B7791F', '#DC4C4C', '#2F5AA6'];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Client Revenue" value={inr(revenue)} sub="Project-linked income" icon={TrendingUp} tone="green" />
        <StatCard label="Operating Expenses" value={inr(opex)} sub="Non-project expenses" icon={TrendingDown} tone="red" />
        <StatCard label="Employee / Intern" value={inr(empExp)} sub="People costs" icon={Users} tone="amber" />
        <StatCard label="Business Profit" value={inr(profit)} sub="Revenue − all expenses" icon={Briefcase} tone="blue" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5"><h3 className="font-bold">Project-wise P&L</h3><div className="mt-3 h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={byProject}><CartesianGrid strokeDasharray="3 3" stroke="#E6EDE8" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => '₹' + (v / 1000) + 'k'} /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend /><Bar dataKey="Received" fill="#245F49" radius={[6, 6, 0, 0]} /><Bar dataKey="Expenses" fill="#DC4C4C" radius={[6, 6, 0, 0]} /><Bar dataKey="Profit" fill="#16A36A" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h3 className="font-bold">Business Expense Mix</h3><div className="mt-3 h-[280px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expCats} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>{expCats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: any) => inr(Number(v))} /></PieChart></ResponsiveContainer></div></Card>
      </div>
      <Card className="overflow-hidden"><div className="px-5 py-4 font-bold">Project Profit & Loss Table</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="bg-[#F7F9F7] text-left text-xs uppercase text-[#718078]"><th className="px-5 py-3">Project</th><th className="px-5 py-3">Contract</th><th className="px-5 py-3">Received</th><th className="px-5 py-3">Pending</th><th className="px-5 py-3">Expenses</th><th className="px-5 py-3">Profit</th><th className="px-5 py-3">Margin</th></tr></thead>
          <tbody className="divide-y divide-[#EFF4F0]">{projects.map(p => { const f = projectFinancials(db, p.id); const margin = f.received ? Math.round(f.profit / f.received * 100) : 0; return <tr key={p.id}><td className="px-5 py-3 font-semibold">{p.name}</td><td className="px-5 py-3">{inr(p.contract_amount)}</td><td className="px-5 py-3 text-[#16A36A] font-bold">{inr(f.received)}</td><td className="px-5 py-3 text-[#B7791F] font-bold">{inr(f.pending)}</td><td className="px-5 py-3 text-[#DC4C4C]">{inr(f.expenses)}</td><td className="px-5 py-3 font-extrabold">{inr(f.profit)}</td><td className="px-5 py-3"><Badge tone={margin >= 30 ? 'green' : margin >= 0 ? 'amber' : 'red'}>{margin}%</Badge></td></tr>; })}</tbody></table></div>
        {projects.length === 0 && <Empty title="No projects" subtitle="Create projects to see P&L analytics." />}
      </Card>
    </div>
  );
}
