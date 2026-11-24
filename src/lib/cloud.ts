import type { Session, User as AuthUser } from '@supabase/supabase-js';
import type { DB, Profile } from './types';
import { emptyDB, nowISO, uid } from './db';
import { supabase } from './supabase';

type TableName = keyof DB;

const tableNames: TableName[] = [
  'profiles', 'workspaces', 'workspace_members', 'financial_accounts', 'categories',
  'transactions', 'transfers', 'budgets', 'projects', 'clients', 'project_payments',
  'audit_logs', 'user_preferences',
];

const insertOrder: TableName[] = [
  'profiles', 'workspaces', 'workspace_members', 'financial_accounts', 'categories',
  'clients', 'projects', 'transactions', 'transfers', 'budgets', 'project_payments',
  'audit_logs', 'user_preferences',
];

const deleteOrder: TableName[] = [
  'project_payments', 'transactions', 'transfers', 'budgets', 'projects', 'clients',
  'categories', 'financial_accounts', 'workspace_members', 'workspaces', 'profiles',
  'audit_logs', 'user_preferences',
];

const numericColumns: Partial<Record<TableName, string[]>> = {
  financial_accounts: ['opening_balance'],
  transactions: ['amount'],
  transfers: ['amount'],
  budgets: ['amount'],
  projects: ['contract_amount'],
  project_payments: ['amount'],
};

const setupInFlight = new Map<string, Promise<void>>();

async function setupUserData(user: AuthUser): Promise<void> {
  const now = nowISO();
  const profile: Profile = {
    id: user.id,
    full_name: user.user_metadata.full_name || user.email || 'User',
    email: user.email || '',
    created_at: user.created_at || now,
    updated_at: now,
  };
  const { data: existingProfile, error: profileReadError } = await supabase
    .from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (profileReadError) throw profileReadError;
  if (!existingProfile) {
    const { error: profileError } = await supabase.from('profiles').insert(profile);
    if (profileError) throw profileError;
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('workspace_members').select('workspace_id, role').eq('user_id', user.id);
  if (membershipsError) throw membershipsError;

  let ownedWorkspaceIds = memberships.filter(member => member.role === 'owner').map(member => member.workspace_id);
  if (!memberships.length) {
    const personalId = uid();
    const businessId = uid();
    const workspaces = [
      { id: personalId, name: 'Personal Finance', type: 'personal', owner_id: user.id, currency: 'INR' },
      { id: businessId, name: 'MINAH TECH', type: 'business', owner_id: user.id, currency: 'INR' },
    ];
    const { error: workspaceError } = await supabase.from('workspaces').insert(workspaces);
    if (workspaceError) throw workspaceError;

    const { error: memberError } = await supabase.from('workspace_members').insert([
      { id: uid(), workspace_id: personalId, user_id: user.id, role: 'owner' },
      { id: uid(), workspace_id: businessId, user_id: user.id, role: 'owner' },
    ]);
    if (memberError) throw memberError;
    ownedWorkspaceIds = [personalId, businessId];
  }

  if (!ownedWorkspaceIds.length) return;
  const { data: workspaces, error: workspaceReadError } = await supabase
    .from('workspaces').select('id, type').in('id', ownedWorkspaceIds).eq('owner_id', user.id);
  if (workspaceReadError) throw workspaceReadError;

  for (const workspace of workspaces) {
    const { data: accounts, error: accountReadError } = await supabase
      .from('financial_accounts').select('id').eq('workspace_id', workspace.id).limit(1);
    if (accountReadError) throw accountReadError;
    if (!accounts.length) {
      const { error } = await supabase.from('financial_accounts').insert({
        id: uid(),
        workspace_id: workspace.id,
        name: workspace.type === 'personal' ? 'Cash Wallet' : 'MINAH TECH Current',
        account_type: workspace.type === 'personal' ? 'Cash' : 'Bank Account',
        opening_balance: 0,
      });
      if (error) throw error;
    }

    const { data: categoriesExist, error: categoryReadError } = await supabase
      .from('categories').select('id').eq('workspace_id', workspace.id).limit(1);
    if (categoryReadError) throw categoryReadError;
    if (!categoriesExist.length) {
      const income = workspace.type === 'personal'
        ? ['Salary', 'Freelancing', 'Investments', 'Gifts', 'Other Income']
        : ['Website Development', 'Software Development', 'Client Payments', 'Maintenance', 'Other Business Income'];
      const expense = workspace.type === 'personal'
        ? ['Food', 'Transportation', 'Shopping', 'Education', 'Health and Fitness', 'Entertainment', 'Travel', 'Other']
        : ['Domain and Hosting', 'Software Subscriptions', 'Cloud Services', 'Marketing and Advertising', 'Office Expenses', 'Other Business Expenses'];
      const categories = [
        ...income.map(name => ({ id: uid(), workspace_id: workspace.id, name, type: 'income', is_active: true })),
        ...expense.map(name => ({ id: uid(), workspace_id: workspace.id, name, type: 'expense', is_active: true })),
      ];
      const { error } = await supabase.from('categories').insert(categories);
      if (error) throw error;
    }
  }
}

async function ensureUserData(user: AuthUser): Promise<void> {
  const pending = setupInFlight.get(user.id);
  if (pending) return pending;
  const setup = setupUserData(user);
  setupInFlight.set(user.id, setup);
  try {
    await setup;
  } finally {
    setupInFlight.delete(user.id);
  }
}

export async function loadCloudDB(session: Session): Promise<DB> {
  await ensureUserData(session.user);
  const results = await Promise.all(tableNames.map(async table => {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    const rows = (data || []) as Record<string, unknown>[];
    const columns = numericColumns[table] || [];
    return [table, rows.map(row => {
      for (const column of columns) {
        if (row[column] != null) row[column] = Number(row[column]);
      }
      return row;
    })] as const;
  }));
  return Object.assign(emptyDB(), Object.fromEntries(results)) as DB;
}

export async function persistChanges(previous: DB, next: DB): Promise<void> {
  const before = previous as unknown as Record<TableName, Record<string, unknown>[]>;
  const after = next as unknown as Record<TableName, Record<string, unknown>[]>;
  for (const table of insertOrder) {
    const previousRows = new Map(before[table].map(row => [row.id, JSON.stringify(row)]));
    const changed = after[table].filter(row => previousRows.get(row.id) !== JSON.stringify(row));
    if (changed.length) {
      const { error } = await supabase.from(table).upsert(changed as never[]);
      if (error) throw error;
    }
  }
  for (const table of deleteOrder) {
    const remaining = new Set(after[table].map(row => row.id));
    const removed = before[table].map(row => row.id).filter(id => !remaining.has(id));
    if (removed.length) {
      const { error } = await supabase.from(table).delete().in('id', removed);
      if (error) throw error;
    }
  }
}
