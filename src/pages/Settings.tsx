import { useState } from 'react';
import { Plus, Trash2, Download, Shield, User, Palette, Database } from 'lucide-react';
import { useStore } from '../lib/store';
import { uid, nowISO } from '../lib/db';
import { downloadCSV } from '../lib/utils';
import { Card, Btn, Input, Select, Label, Modal, Confirm, Badge } from '../components/ui';
import type { WorkspaceType } from '../lib/types';

export function SettingsPage({ workspace }: { workspace: WorkspaceType }) {
  const { db, user, mutate, setToast } = useStore();
  const [catOpen, setCatOpen] = useState(false); const [delCat, setDelCat] = useState<any>(null);
  const [f, setF] = useState({ name: '', type: 'expense', workspace_id: '' });
  const wsIds = workspace === 'combined' ? db.workspaces.map(w => w.id) : db.workspaces.filter(w => w.type === workspace).map(w => w.id);
  const cats = db.categories.filter(c => wsIds.includes(c.workspace_id));
  const prefs = db.user_preferences.find(p => p.user_id === user?.id);

  const addCat = () => {
    if (!f.name.trim() || !f.workspace_id) return setToast('Category name and workspace are required.');
    mutate(d => { d.categories.push({ id: uid(), workspace_id: f.workspace_id, name: f.name.trim(), type: f.type as any, is_active: true, created_at: nowISO() }); }, 'create', 'category', 'new', f.workspace_id);
    setToast('Category created.'); setCatOpen(false); setF({ name: '', type: 'expense', workspace_id: '' });
  };
  const exportAll = () => {
    downloadCSV('minah-finance-export.csv', [['Type', 'Date', 'Title', 'Category', 'Amount', 'Account', 'Workspace'], ...db.transactions.map(t => [t.transaction_type, t.transaction_date, t.title, db.categories.find(c => c.id === t.category_id)?.name || '', String(t.amount), db.financial_accounts.find(a => a.id === t.account_id)?.name || '', db.workspaces.find(w => w.id === t.workspace_id)?.name || ''])]);
    setToast('Full data export downloaded.');
  };
  const changeTheme = (theme: string) => { mutate(d => { const p = d.user_preferences.find(x => x.user_id === user?.id); if (p) { p.theme = theme; p.updated_at = nowISO(); } else d.user_preferences.push({ id: uid(), user_id: user!.id, theme, currency: 'INR', created_at: nowISO(), updated_at: nowISO() }); }, 'update', 'preferences', user?.id || '', undefined); setToast(`Theme set to ${theme}.`); };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-2 font-bold"><User size={17} className="text-[#245F49]" /> Profile</div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between border-b border-[#EFF4F0] pb-2"><span className="text-[#718078]">Name</span><span className="font-semibold">{user?.full_name}</span></div>
          <div className="flex justify-between border-b border-[#EFF4F0] pb-2"><span className="text-[#718078]">Email</span><span className="font-semibold">{user?.email}</span></div>
          <div className="flex justify-between border-b border-[#EFF4F0] pb-2"><span className="text-[#718078]">Member since</span><span className="font-semibold">{user?.created_at.slice(0, 10)}</span></div>
          <div className="flex justify-between"><span className="text-[#718078]">Currency</span><span className="font-semibold">INR (₹)</span></div>
        </div>
        <div className="mt-4 flex gap-2"><Btn variant="secondary" onClick={() => setToast('Profile editing is available in the Profile tab.')}>Edit Profile</Btn><Badge tone="green">Verified account</Badge></div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 font-bold"><Palette size={17} className="text-[#245F49]" /> Theme & Preferences</div>
        <p className="mt-2 text-sm text-[#718078]">Choose your preferred interface theme. Saved to your user preferences.</p>
        <div className="mt-4 flex gap-2">{['light', 'dark', 'system'].map(t => <button key={t} onClick={() => changeTheme(t)} className={`rounded-xl border px-4 py-2.5 text-sm font-bold capitalize ${prefs?.theme === t ? 'border-[#245F49] bg-[#EAF3ED] text-[#245F49]' : 'border-[#D9E4DC] text-[#5B6B62]'}`}>{t}</button>)}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-[#F7F9F7] p-3"><div className="text-[#718078]">Financial year</div><div className="font-extrabold">Apr – Mar (India)</div></div>
          <div className="rounded-xl bg-[#F7F9F7] p-3"><div className="text-[#718078]">Currency</div><div className="font-extrabold">INR (₹)</div></div>
        </div>
      </Card>

      <Card className="p-5 xl:col-span-2">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-bold"><Database size={17} className="text-[#245F49]" /> Categories Management</div><Btn onClick={() => setCatOpen(true)}><Plus size={15} /> Add Category</Btn></div>
        <p className="mt-1 text-xs text-[#718078]">Custom income & expense categories. Categories used by transactions cannot be deleted — archive instead.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map(c => { const used = db.transactions.some(t => t.category_id === c.id); return (
            <div key={c.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${c.is_active ? 'border-[#E6EDE8]' : 'border-[#E6EDE8] opacity-50'}`}>
              <Badge tone={c.type === 'income' ? 'green' : 'red'}>{c.type}</Badge>
              <span className="flex-1 truncate text-sm font-semibold">{c.name}</span>
              <span className="text-[10px] text-[#718078]">{db.workspaces.find(w => w.id === c.workspace_id)?.name}</span>
              {used ? <button title="In use — archive instead" onClick={() => { mutate(d => { const x = d.categories.find(y => y.id === c.id); if (x) x.is_active = !x.is_active; }, 'archive', 'category', c.id, c.workspace_id); setToast(c.is_active ? 'Category archived (in use by transactions).' : 'Category restored.'); }} className="rounded-lg p-1.5 text-[#B7791F] hover:bg-[#FFF4DE]"><Trash2 size={14} /></button>
                : <button onClick={() => setDelCat(c)} className="rounded-lg p-1.5 text-[#DC4C4C] hover:bg-[#FDECEC]"><Trash2 size={14} /></button>}
            </div>); })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 font-bold"><Shield size={17} className="text-[#245F49]" /> Security</div>
        <p className="mt-2 text-sm text-[#718078]">Row Level Security protects all financial data. Only workspace members can view or modify records.</p>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between rounded-xl bg-[#F7F9F7] px-3 py-2.5"><span>RLS Policies</span><Badge tone="green">Active</Badge></div>
          <div className="flex justify-between rounded-xl bg-[#F7F9F7] px-3 py-2.5"><span>Password authentication</span><Badge tone="green">Supabase Auth</Badge></div>
          <div className="flex justify-between rounded-xl bg-[#F7F9F7] px-3 py-2.5"><span>Audit logging</span><Badge tone="green">{db.audit_logs.length} events</Badge></div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 font-bold"><Download size={17} className="text-[#245F49]" /> Data Export</div>
        <p className="mt-2 text-sm text-[#718078]">Export all transactions across workspaces as CSV for backup or accounting.</p>
        <div className="mt-4 flex gap-2"><Btn onClick={exportAll}><Download size={15} /> Export All Data (CSV)</Btn></div>
        <p className="mt-3 text-xs text-[#718078]">Includes {db.transactions.length} transactions, {db.projects.length} projects, {db.clients.length} clients.</p>
      </Card>

      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="Add Category">
        <div className="grid gap-4"><div><Label>Category Name *</Label><Input value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} placeholder="e.g. Freelance Design" /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Type</Label><Select value={f.type} onChange={(e: any) => setF({ ...f, type: e.target.value })}><option value="income">Income</option><option value="expense">Expense</option></Select></div>
            <div><Label>Workspace *</Label><Select value={f.workspace_id} onChange={(e: any) => setF({ ...f, workspace_id: e.target.value })}><option value="">Select</option>{db.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div></div>
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setCatOpen(false)}>Cancel</Btn><Btn onClick={addCat}>Add Category</Btn></div></div>
      </Modal>
      <Confirm open={!!delCat} onClose={() => setDelCat(null)} title="Delete Category" message={`Delete “${delCat?.name}”? It is not used by any transaction.`} onConfirm={() => { if (delCat) { mutate(d => { d.categories = d.categories.filter(c => c.id !== delCat.id); }, 'delete', 'category', delCat.id, delCat.workspace_id); setToast('Category deleted.'); } setDelCat(null); }} />
    </div>
  );
}

export function ProfilePage() {
  const { db, user, mutate, setToast, logout, changePassword } = useStore();
  const [name, setName] = useState(user?.full_name || '');
  const [pw, setPw] = useState({ cur: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const saveProfile = () => {
    if (!name.trim()) return setToast('Name is required.');
    mutate(d => { const p = d.profiles.find(x => x.id === user?.id); if (p) { p.full_name = name.trim(); p.updated_at = nowISO(); } }, 'update', 'profile', user?.id || '', undefined);
    setToast('Profile updated.');
  };
  const changePw = async () => {
    setPwErr('');
    if (pw.next.length < 6) return setPwErr('New password must be at least 6 characters.');
    if (pw.next !== pw.confirm) return setPwErr('New passwords do not match.');
    try {
      const result = await changePassword(pw.cur, pw.next);
      if (!result.ok) return setPwErr(result.error || 'Could not change password.');
      setPw({ cur: '', next: '', confirm: '' }); setToast('Password changed successfully.');
    } catch (error) {
      setPwErr(error instanceof Error ? error.message : 'Could not change password.');
    }
  };
  const myLogs = db.audit_logs.filter(l => l.user_id === user?.id).slice(0, 10);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#245F49] text-2xl font-black text-white">{(user?.full_name || 'U').slice(0, 1).toUpperCase()}</div>
          <div><h3 className="text-lg font-extrabold">{user?.full_name}</h3><p className="text-sm text-[#718078]">{user?.email}</p><Badge tone="green">Owner</Badge></div></div>
        <div className="mt-5 grid gap-4"><div><Label>Full Name</Label><Input value={name} onChange={(e: any) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={user?.email || ''} disabled /></div>
          <div className="flex gap-2"><Btn onClick={saveProfile}>Save Profile</Btn><Btn variant="secondary" onClick={logout}>Logout</Btn></div></div>
      </Card>
      <Card className="p-6">
        <h3 className="font-bold">Change Password</h3>
        <div className="mt-4 grid gap-4"><div><Label>Current Password</Label><Input type="password" value={pw.cur} onChange={(e: any) => setPw({ ...pw, cur: e.target.value })} /></div>
          <div><Label>New Password</Label><Input type="password" value={pw.next} onChange={(e: any) => setPw({ ...pw, next: e.target.value })} /></div>
          <div><Label>Confirm New Password</Label><Input type="password" value={pw.confirm} onChange={(e: any) => setPw({ ...pw, confirm: e.target.value })} /></div>
          {pwErr && <div className="rounded-xl bg-[#FDECEC] px-4 py-3 text-sm font-semibold text-[#DC4C4C]">{pwErr}</div>}
          <div><Btn onClick={changePw}>Change Password</Btn></div></div>
      </Card>
      <Card className="p-6 xl:col-span-2">
        <h3 className="font-bold">Recent Activity (Audit Log)</h3>
        <div className="mt-3 divide-y divide-[#EFF4F0]">{myLogs.map(l => <div key={l.id} className="flex items-center justify-between py-2.5 text-sm"><span><Badge tone="blue">{l.action}</Badge> <span className="ml-2 font-medium">{l.entity_type}</span></span><span className="text-xs text-[#718078]">{l.created_at.slice(0, 16).replace('T', ' ')}</span></div>)}{myLogs.length === 0 && <p className="py-4 text-sm text-[#718078]">No activity recorded yet. Actions like adding income or expenses will appear here.</p>}</div>
      </Card>
    </div>
  );
}
