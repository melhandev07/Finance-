import React, { useState } from 'react';
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Wallet, Repeat, PieChart, Briefcase, Users, CreditCard, BarChart3, FileText, TrendingUp, Search, Settings, User, LogOut, Menu, X, Building2, UserRound, Layers, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import type { WorkspaceType } from '../lib/types';

export const NAV = [
  { group: 'OVERVIEW', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { group: 'FINANCE', items: [
    { id: 'income', label: 'Income', icon: ArrowDownCircle }, { id: 'expenses', label: 'Expenses', icon: ArrowUpCircle },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight }, { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'transfers', label: 'Transfers', icon: Repeat }, { id: 'budgets', label: 'Budgets', icon: PieChart },
  ]},
  { group: 'BUSINESS', items: [
    { id: 'projects', label: 'Projects', icon: Briefcase }, { id: 'clients', label: 'Clients', icon: Users },
    { id: 'payments', label: 'Client Payments', icon: CreditCard }, { id: 'analytics', label: 'Business Analytics', icon: BarChart3 },
  ]},
  { group: 'ANALYTICS', items: [
    { id: 'reports', label: 'Reports', icon: FileText }, { id: 'trends', label: 'Financial Trends', icon: TrendingUp },
    { id: 'spending', label: 'Spending Analysis', icon: Search },
  ]},
  { group: 'SYSTEM', items: [
    { id: 'settings', label: 'Settings', icon: Settings }, { id: 'profile', label: 'Profile', icon: User },
  ]},
];

export function Layout({ page, setPage, workspace, setWorkspace, children }: { page: string; setPage: (p: string) => void; workspace: WorkspaceType; setWorkspace: (w: WorkspaceType) => void; children: React.ReactNode }) {
  const { user, logout, toast } = useStore();
  const [open, setOpen] = useState(false);
  const wsOptions: { id: WorkspaceType; label: string; sub: string; icon: any }[] = [
    { id: 'personal', label: 'Personal Finance', sub: 'Personal workspace', icon: UserRound },
    { id: 'business', label: 'MINAH TECH', sub: 'Business workspace', icon: Building2 },
    { id: 'combined', label: 'Combined Overview', sub: 'Both workspaces', icon: Layers },
  ];
  const active = wsOptions.find(o => o.id === workspace)!;
  const go = (id: string) => { setPage(id); setOpen(false); window.scrollTo({ top: 0 }); };

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#245F49] to-[#2F7657] text-white shadow-lg shadow-[#245F49]/25">
          <span className="text-lg font-black">M</span>
        </div>
        <div><div className="text-[15px] font-extrabold tracking-tight text-white">MINAH TECH</div><div className="text-[11px] font-medium text-white/60">Finance Suite</div></div>
        <button className="ml-auto rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
      </div>
      <div className="px-4">
        <div className="rounded-2xl bg-white/[0.07] border border-white/10 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Active Workspace</div>
          <div className="grid gap-1">
            {wsOptions.map(o => (
              <button key={o.id} onClick={() => setWorkspace(o.id)} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${workspace === o.id ? 'bg-white text-[#245F49] shadow' : 'text-white/80 hover:bg-white/10'}`}>
                <o.icon size={16} /> <span className="flex-1">{o.label}</span>{workspace === o.id && <CheckCircle2 size={15} />}
              </button>
            ))}
          </div>
        </div>
      </div>
      <nav className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
        {NAV.map(g => (
          <div key={g.group} className="mt-4 first:mt-0">
            <div className="px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{g.group}</div>
            <div className="mt-1.5 grid gap-0.5">
              {g.items.map(it => (
                <button key={it.id} onClick={() => go(it.id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${page === it.id ? 'bg-white text-[#245F49] shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
                  <it.icon size={17} /> {it.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white">{(user?.full_name || 'U').slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{user?.full_name}</div><div className="truncate text-[11px] text-white/50">{user?.email}</div></div>
          <button onClick={logout} title="Logout" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"><LogOut size={17} /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F9F7] text-[#17231D]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] bg-[#1B3A2E] lg:block">{SidebarBody}</aside>
      {open && <><div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} /><aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[#1B3A2E] lg:hidden">{SidebarBody}</aside></>}
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-[#E6EDE8] bg-[#F7F9F7]/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 sm:px-6">
            <button className="rounded-xl border border-[#D9E4DC] bg-white p-2.5 lg:hidden" onClick={() => setOpen(true)}><Menu size={18} /></button>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><h1 className="truncate text-base sm:text-lg font-extrabold tracking-tight">{NAV.flatMap(g => g.items).find(i => i.id === page)?.label || 'Dashboard'}</h1><span className="hidden sm:inline-flex rounded-full bg-[#EAF3ED] px-2.5 py-1 text-[11px] font-bold text-[#245F49]">{active.label}</span></div>
              <p className="hidden text-xs text-[#718078] sm:block">{active.sub} · All amounts in INR (₹)</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:flex rounded-xl border border-[#D9E4DC] bg-white p-1">
                {wsOptions.map(o => <button key={o.id} onClick={() => setWorkspace(o.id)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${workspace === o.id ? 'bg-[#245F49] text-white' : 'text-[#5B6B62] hover:bg-[#F1F5F2]'}`}>{o.id === 'business' ? 'MINAH TECH' : o.id === 'personal' ? 'Personal' : 'Combined'}</button>)}
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#245F49] text-sm font-bold text-white">{(user?.full_name || 'U').slice(0, 1).toUpperCase()}</div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
      {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-[#17231D] px-4 py-3 text-sm font-semibold text-white shadow-2xl flex items-center gap-2"><CheckCircle2 size={17} className="text-[#16A36A]" />{toast}</div>}
    </div>
  );
}
