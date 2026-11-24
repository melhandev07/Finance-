import { useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { TxList, TransactionsPage, AccountsPage, TransfersPage, BudgetsPage } from './pages/Finance';
import { ProjectsPage, ClientsPage, PaymentsPage, BusinessAnalytics } from './pages/Business';
import { ReportsPage, TrendsPage, SpendingPage } from './pages/Reports';
import { SettingsPage, ProfilePage } from './pages/Settings';
import { Card, Btn, Input, Label } from './components/ui';
import type { WorkspaceType } from './lib/types';
import { Shield, Eye, EyeOff, Lock, Mail, User, ArrowRight, Building2, UserRound, Layers } from 'lucide-react';

function AuthScreen() {
  const { login, register, resetPassword } = useStore();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [show, setShow] = useState(false); const [err, setErr] = useState(''); const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setErr(''); setInfo('');
    if (mode === 'login' || mode === 'register') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Enter a valid email address.');
      if (mode === 'login' && !pw) return setErr('Enter your password.');
    }
    if (mode === 'register') {
      if (!name.trim()) return setErr('Full name is required.');
      if (pw.length < 6) return setErr('Password must be at least 6 characters.');
    }
    if (mode === 'forgot') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Enter a valid email address.');
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const result = await login(email, pw);
        if (!result.ok) setErr(result.error || 'Login failed.');
      } else if (mode === 'register') {
        const result = await register(name, email, pw);
        if (result.ok) { setInfo(result.message || 'Account created.'); setMode('login'); setPw(''); }
        else setErr(result.error || 'Registration failed.');
      } else {
        const result = await resetPassword(email);
        if (result.ok) setInfo('If an account exists for this email, a password reset link has been sent.');
        else setErr(result.error || 'Could not send a password reset email.');
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'The request could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex min-h-screen bg-[#F7F9F7]">
      <div className="relative hidden w-[46%] overflow-hidden bg-[#1B3A2E] lg:flex flex-col justify-between p-12">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#2F7657]/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-[#16A36A]/20 blur-3xl" />
        <div className="relative flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-[#245F49]">M</div><div><div className="text-lg font-extrabold text-white">MINAH TECH</div><div className="text-xs text-white/60">Finance Suite</div></div></div>
        <div className="relative">
          <h1 className="text-4xl font-extrabold leading-tight text-white">Personal & Business<br />Finance, Unified.</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">Track income, expenses, projects, clients and budgets across two secure workspaces — with live balances, analytics and exportable reports in INR.</p>
          <div className="mt-8 grid gap-3">
            {[{ icon: UserRound, t: 'Personal Finance', d: 'Salary, freelancing, cricket income, savings & daily spending' }, { icon: Building2, t: 'MINAH TECH Business', d: 'Client revenue, project P&L, receivables & operating expenses' }, { icon: Layers, t: 'Combined Overview', d: 'The total financial picture across both workspaces' }].map(x => (
              <div key={x.t} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white"><x.icon size={20} /></span><div><div className="font-bold text-white">{x.t}</div><div className="text-xs text-white/60">{x.d}</div></div></div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-white/50"><Shield size={14} /> Secured with Supabase Auth + Row Level Security</div>
      </div>
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md p-6 sm:p-8">
          <div className="lg:hidden mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#245F49] font-black text-white">M</div><div><div className="font-extrabold">MINAH TECH</div><div className="text-xs text-[#718078]">Finance Suite</div></div></div>
          <h2 className="text-xl font-extrabold">{mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}</h2>
          <p className="mt-1 text-sm text-[#718078]">{mode === 'login' ? 'Sign in to your finance workspace.' : mode === 'register' ? 'Create an account with personal and business workspaces.' : 'Enter your email to receive a reset link.'}</p>
          <div className="mt-5 grid gap-4">
            {mode === 'register' && <div><Label>Full Name</Label><div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" /><Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Your name" className="pl-9" /></div></div>}
            <div><Label>Email</Label><div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" /><Input value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="you@email.com" className="pl-9" /></div></div>
            {mode !== 'forgot' && <div><Label>Password</Label><div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" /><Input type={show ? 'text' : 'password'} value={pw} onChange={(e: any) => setPw(e.target.value)} placeholder="••••••••" className="pl-9 pr-10" /><button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718078]">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>}
            {err && <div className="rounded-xl bg-[#FDECEC] px-4 py-3 text-sm font-semibold text-[#DC4C4C]">{err}</div>}
            {info && <div className="rounded-xl bg-[#E6F4EC] px-4 py-3 text-sm font-semibold text-[#16A36A]">{info}</div>}
            <Btn onClick={submit} disabled={submitting} className="w-full py-3">{submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'} <ArrowRight size={16} /></Btn>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            {mode === 'login' ? <><button onClick={() => { setMode('forgot'); setErr(''); }} className="font-semibold text-[#245F49]">Forgot password?</button><button onClick={() => { setMode('register'); setErr(''); }} className="font-semibold text-[#245F49]">Create account</button></> : <button onClick={() => { setMode('login'); setErr(''); setInfo(''); }} className="font-semibold text-[#245F49]">← Back to sign in</button>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Shell() {
  const { user, loading, loadError, refresh, logout } = useStore();
  const [page, setPage] = useState('dashboard');
  const [workspace, setWorkspace] = useState<WorkspaceType>('personal');
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-[#5B6B62]">Connecting to your finance workspace...</div>;
  if (loadError) return <div className="flex min-h-screen items-center justify-center bg-[#F7F9F7] p-4"><Card className="max-w-lg p-6"><h2 className="font-bold">Could not connect to Supabase</h2><p className="mt-2 text-sm text-[#718078]">{loadError}</p><div className="mt-4 flex gap-2"><Btn onClick={() => void refresh()}>Retry</Btn><Btn variant="secondary" onClick={logout}>Sign out</Btn></div></Card></div>;
  if (!user) return <AuthScreen />;
  const render = () => {
    switch (page) {
      case 'dashboard': return <Dashboard workspace={workspace} go={setPage} />;
      case 'income': return <TxList type="income" workspace={workspace} />;
      case 'expenses': return <TxList type="expense" workspace={workspace} />;
      case 'transactions': return <TransactionsPage workspace={workspace} />;
      case 'accounts': return <AccountsPage workspace={workspace} />;
      case 'transfers': return <TransfersPage workspace={workspace} />;
      case 'budgets': return <BudgetsPage workspace={workspace} />;
      case 'projects': return <ProjectsPage workspace={workspace} />;
      case 'clients': return <ClientsPage workspace={workspace} />;
      case 'payments': return <PaymentsPage workspace={workspace} />;
      case 'analytics': return <BusinessAnalytics workspace={workspace} />;
      case 'reports': return <ReportsPage workspace={workspace} />;
      case 'trends': return <TrendsPage workspace={workspace} />;
      case 'spending': return <SpendingPage workspace={workspace} />;
      case 'settings': return <SettingsPage workspace={workspace} />;
      case 'profile': return <ProfilePage />;
      default: return <Dashboard workspace={workspace} go={setPage} />;
    }
  };
  return <Layout page={page} setPage={setPage} workspace={workspace} setWorkspace={setWorkspace}>{render()}</Layout>;
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
