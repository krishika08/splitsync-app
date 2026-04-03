-- ============================================================
-- SplitSync: Personal Expenses + Monthly Budgets
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) personal_expenses — individual daily expense tracking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.personal_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  expense_time time DEFAULT CURRENT_TIME,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_interval text CHECK (recurrence_interval IN ('daily', 'weekly', 'monthly')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_expenses_user ON public.personal_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_date ON public.personal_expenses(user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_category ON public.personal_expenses(user_id, category);

ALTER TABLE public.personal_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own personal expenses"
  ON public.personal_expenses FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own personal expenses"
  ON public.personal_expenses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own personal expenses"
  ON public.personal_expenses FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own personal expenses"
  ON public.personal_expenses FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2) monthly_budgets — overall + per-category budget limits
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL, -- format: '2026-04'
  total_limit numeric(12,2) NOT NULL CHECK (total_limit > 0),
  category_limits jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user ON public.monthly_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_month ON public.monthly_budgets(user_id, month_year);

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own budgets"
  ON public.monthly_budgets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own budgets"
  ON public.monthly_budgets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own budgets"
  ON public.monthly_budgets FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own budgets"
  ON public.monthly_budgets FOR DELETE TO authenticated
  USING (user_id = auth.uid());
