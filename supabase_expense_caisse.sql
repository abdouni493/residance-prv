-- Caisse Dépenses (expenses cash box)
--
-- A cash box dedicated to funding expenses: credited by manual deposits,
-- debited by manual withdrawals. The expenses and maintenances recorded on the
-- Expenses page are subtracted from its balance by the app (they already live
-- in `expenses` / `maintenances` and are NOT duplicated here).
--
-- Run this once in the Supabase SQL editor. The app degrades gracefully until
-- it is applied (the page loads and shows expenses, but deposits/withdrawals
-- fail to save).

CREATE TABLE IF NOT EXISTS public.expense_cash_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type = ANY (ARRAY['deposit'::text, 'withdrawal'::text])),
  amount numeric NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT expense_cash_transactions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS expense_cash_transactions_date_idx
  ON public.expense_cash_transactions (date DESC);

-- Only signed-in users may touch the box. The app additionally hides the whole
-- module from every worker account (admin-only route + sidebar entry).
ALTER TABLE public.expense_cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_cash_transactions_auth_all" ON public.expense_cash_transactions;
CREATE POLICY "expense_cash_transactions_auth_all"
  ON public.expense_cash_transactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
