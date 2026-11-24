# MINAH TECH Finance — Personal & Business Expense Tracker

Production-ready financial management app with two isolated workspaces (**Personal Finance** and **MINAH TECH Business**) plus a **Combined Overview**.

## Features
- **Auth**: email/password login, registration, forgot/reset password, persistent sessions, protected routes, profile & password change.
- **Workspaces**: Personal / MINAH TECH / Combined switcher. All data, categories, accounts, budgets and analytics are workspace-scoped.
- **Dashboard**: balance, income, expenses, net cash flow, savings, receivables, client revenue, profit; date filters (Today/Week/Month/Last Month/Year/Custom); income-vs-expense, cash-flow, donut, daily-trend charts; recent transactions, top categories, highest expenses, account balances, budget utilization, project revenue.
- **Income & Expenses**: full CRUD with purpose/description validation, search, category/payment/date filters, sorting, pagination, CSV export, detail view, delete confirmation.
- **Accounts**: multiple accounts (Cash/Bank/UPI…), opening balance, live balance = Opening + Income − Expenses ± Transfers, archive/restore, transaction history.
- **Transfers**: between accounts in same workspace; never counted as income/expense.
- **Business**: projects (contract vs received vs pending vs profit), clients, client payments (partial/multiple payments per project, overpayment guard), business analytics & P&L.
- **Budgets**: weekly/monthly/custom, category-wise, utilization %, remaining, 75/90/100% alerts.
- **Reports**: 12 report types with workspace/date/category/account/project filters; summary (opening/income/expenses/net/closing); PDF, Excel, CSV export + print.
- **Transactions**: unified history with type indicators, search, filters, sorting, pagination.
- **Settings**: profile, theme, categories (archive-if-used), data export, security status, audit log.
- **Security**: RLS on every table (owner/admin/editor/viewer roles), audit logging, no secrets in frontend.

## Tech Stack
React + Vite + TypeScript + Tailwind CSS, Recharts, date-fns, jsPDF, SheetJS (xlsx), Lucide icons. Backend: Supabase PostgreSQL + Auth + RLS (see `supabase/migrations/001_init.sql`).

## Quick Start
```bash
npm install
npm run dev
```

## Supabase Setup
1. Create a Supabase project.
2. On a new project, run `supabase/migrations/001_init.sql` and `supabase/migrations/002_workspace_member_setup.sql` in the SQL Editor, in order. If the schema is already installed, run only `002_workspace_member_setup.sql`.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `.env.local` is ignored by Git.
4. Enable email/password authentication in Supabase Auth. Account registration creates personal and business workspaces for the new user; if email confirmation is enabled, confirm the email before signing in.
5. Create a **private** storage bucket `receipts` and add storage policies restricting access to workspace members.
6. Deploy (Vercel/Netlify) with the two `VITE_` variables configured: `npm run build`.

## Financial Rules (enforced)
- Income ↑ account, Expense ↓ account, Transfer moves between accounts (never income/expense).
- Data is stored in Supabase PostgreSQL; workspace access is restricted by row-level security.
- Edit/delete recalculates balances from the single source of truth (`account_balance()` in SQL / `accountBalance()` in app).
- Amounts validated > 0, decimal-safe (NUMERIC), duplicate submissions prevented.
- Contract value ≠ received cash ≠ recognized revenue; receivables tracked separately from cash.

## Testing Checklist
Login/logout, session persistence, workspace switching, income/expense CRUD, balance updates, transfers, budgets, project payments, reports + PDF/Excel/CSV, search/filter, RLS (viewer cannot write), mobile responsiveness. All covered in the app UI with loading, error, success, empty and confirmation states.
