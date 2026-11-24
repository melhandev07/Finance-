import type { DB } from './types';

export function uid() { return crypto.randomUUID(); }
export function nowISO() { return new Date().toISOString(); }
export function todayISO() { return new Date().toISOString().slice(0, 10); }

export function emptyDB(): DB {
  return {
    profiles: [], workspaces: [], workspace_members: [], financial_accounts: [],
    categories: [], transactions: [], transfers: [], budgets: [], projects: [],
    clients: [], project_payments: [], audit_logs: [], user_preferences: [],
  };
}

export function accountBalance(db: DB, accountId: string): number {
  const acc = db.financial_accounts.find(a => a.id === accountId);
  if (!acc) return 0;
  let bal = acc.opening_balance;
  for (const t of db.transactions) {
    if (t.account_id !== accountId || t.status !== 'confirmed') continue;
    if (t.transaction_type === 'income') bal += t.amount;
    else if (t.transaction_type === 'expense') bal -= t.amount;
    else if (t.transaction_type === 'adjustment') bal += t.amount;
  }
  for (const tr of db.transfers) {
    if (tr.destination_account_id === accountId) bal += tr.amount;
    if (tr.source_account_id === accountId) bal -= tr.amount;
  }
  return Math.round(bal * 100) / 100;
}

export function workspaceTotals(db: DB, workspaceIds: string[], from?: string, to?: string) {
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const txs = db.transactions.filter(t => workspaceIds.includes(t.workspace_id) && t.status === 'confirmed' && inRange(t.transaction_date));
  const income = txs.filter(t => t.transaction_type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0);
  const accounts = db.financial_accounts.filter(a => workspaceIds.includes(a.workspace_id) && a.is_active);
  const balance = accounts.reduce((s, a) => s + accountBalance(db, a.id), 0);
  return { income, expense, net: income - expense, balance, txs };
}

export function projectFinancials(db: DB, projectId: string) {
  const proj = db.projects.find(p => p.id === projectId);
  if (!proj) return { received: 0, pending: 0, expenses: 0, profit: 0 };
  const payments = db.project_payments.filter(p => p.project_id === projectId && p.payment_status === 'Received');
  const received = payments.reduce((s, p) => s + p.amount, 0);
  const expenses = db.transactions.filter(t => t.project_id === projectId && t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { received, pending: proj.contract_amount - received, expenses, profit: received - expenses };
}

export function audit(db: DB, userId: string, action: string, entity_type: string, entity_id: string, ws?: string, oldV?: any, newV?: any) {
  db.audit_logs.unshift({ id: uid(), workspace_id: ws, user_id: userId, action, entity_type, entity_id, old_values: oldV, new_values: newV, created_at: nowISO() });
}
