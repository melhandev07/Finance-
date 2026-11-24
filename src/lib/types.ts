export type WorkspaceType = 'personal' | 'business' | 'combined';
export type TxType = 'income' | 'expense' | 'transfer' | 'adjustment';
export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Profile { id: string; full_name: string; email: string; avatar_url?: string; created_at: string; updated_at: string; }
export interface Workspace { id: string; name: string; type: 'personal' | 'business'; owner_id: string; currency: string; created_at: string; }
export interface WorkspaceMember { id: string; workspace_id: string; user_id: string; role: Role; created_at: string; }
export interface FinancialAccount { id: string; workspace_id: string; name: string; account_type: string; opening_balance: number; is_active: boolean; description?: string; created_at: string; updated_at: string; }
export interface Category { id: string; workspace_id: string; name: string; type: 'income' | 'expense'; parent_id?: string | null; is_active: boolean; created_at: string; }
export interface Transaction {
  id: string; workspace_id: string; account_id: string; category_id?: string | null;
  transaction_type: TxType; title: string; amount: number; transaction_date: string;
  description?: string; payment_method: string; reference_number?: string;
  project_id?: string | null; client_id?: string | null; status: string;
  created_by: string; created_at: string; updated_at: string; vendor?: string; subcategory?: string; notes?: string;
}
export interface Transfer { id: string; workspace_id: string; source_account_id: string; destination_account_id: string; amount: number; transfer_date: string; description?: string; created_by: string; created_at: string; }
export interface Budget { id: string; workspace_id: string; category_id?: string | null; name: string; amount: number; period_type: 'weekly' | 'monthly' | 'custom'; start_date: string; end_date: string; created_at: string; }
export interface Client { id: string; workspace_id: string; name: string; email?: string; phone?: string; company_name?: string; notes?: string; created_at: string; }
export interface Project { id: string; workspace_id: string; client_id?: string | null; name: string; description?: string; contract_amount: number; project_status: string; start_date: string; expected_completion_date?: string; created_at: string; }
export interface ProjectPayment { id: string; project_id: string; transaction_id?: string | null; amount: number; payment_date: string; payment_status: string; reference_number?: string; created_at: string; }
export interface AuditLog { id: string; workspace_id?: string; user_id: string; action: string; entity_type: string; entity_id: string; old_values?: any; new_values?: any; created_at: string; }
export interface UserPreferences { id: string; user_id: string; theme: string; default_workspace_id?: string; currency: string; created_at: string; updated_at: string; }

export interface DB {
  profiles: Profile[]; workspaces: Workspace[]; workspace_members: WorkspaceMember[];
  financial_accounts: FinancialAccount[]; categories: Category[]; transactions: Transaction[];
  transfers: Transfer[]; budgets: Budget[]; projects: Project[]; clients: Client[];
  project_payments: ProjectPayment[]; audit_logs: AuditLog[]; user_preferences: UserPreferences[];
}
