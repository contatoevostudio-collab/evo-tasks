-- ============================================================
-- EvoTasks — SQL completo para rodar no Supabase SQL Editor
-- Rode tudo de uma vez. Seguro rodar múltiplas vezes (IF NOT EXISTS / IF NOT EXISTS).
-- ============================================================

-- ─── TABELAS EXISTENTES: adicionar colunas que faltavam ──────────────────────

-- companies: contrato, plataformas, quota
ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_quota   numeric;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS use_quota       bool    DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS avulso          bool    DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_value  numeric;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS site_url        text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS platforms       jsonb;

-- sub_clients: contrato, plataformas
ALTER TABLE sub_clients ADD COLUMN IF NOT EXISTS contract_value  numeric;
ALTER TABLE sub_clients ADD COLUMN IF NOT EXISTS site_url        text;
ALTER TABLE sub_clients ADD COLUMN IF NOT EXISTS platforms       jsonb;

-- ─── NOVAS TABELAS ────────────────────────────────────────────────────────────

-- todo_items
CREATE TABLE IF NOT EXISTS todo_items (
  id          text    PRIMARY KEY,
  user_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        text    NOT NULL,
  checked     bool    NOT NULL DEFAULT false,
  status      text    NOT NULL DEFAULT 'todo',
  date        text    NOT NULL,
  created_at  text    NOT NULL,
  archived    bool    NOT NULL DEFAULT false,
  subtasks    jsonb   NOT NULL DEFAULT '[]',
  context     text,
  priority    text
);
ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON todo_items;
CREATE POLICY "user owns rows" ON todo_items FOR ALL USING (auth.uid() = user_id);

-- calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
  id          text  PRIMARY KEY,
  user_id     uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text  NOT NULL,
  date        text  NOT NULL,
  end_date    text,
  time        text,
  category    text  NOT NULL,
  color       text,
  notes       text,
  created_at  text  NOT NULL
);
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON calendar_events;
CREATE POLICY "user owns rows" ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- ideas
CREATE TABLE IF NOT EXISTS ideas (
  id          text  PRIMARY KEY,
  user_id     uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text  NOT NULL,
  description text,
  tag         text  NOT NULL,
  link        text,
  pinned      bool  NOT NULL DEFAULT false,
  created_at  text  NOT NULL
);
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON ideas;
CREATE POLICY "user owns rows" ON ideas FOR ALL USING (auth.uid() = user_id);

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id          text    PRIMARY KEY,
  user_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text    NOT NULL,
  description text    NOT NULL,
  category    text    NOT NULL,
  amount      numeric NOT NULL,
  date        text    NOT NULL,
  status      text    NOT NULL,
  created_at  text    NOT NULL
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON transactions;
CREATE POLICY "user owns rows" ON transactions FOR ALL USING (auth.uid() = user_id);

-- financial_goals
CREATE TABLE IF NOT EXISTS financial_goals (
  id             text    PRIMARY KEY,
  user_id        uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text    NOT NULL,
  icon           text    NOT NULL,
  color          text    NOT NULL,
  target         numeric NOT NULL,
  current_amount numeric NOT NULL DEFAULT 0,
  created_at     text    NOT NULL
);
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON financial_goals;
CREATE POLICY "user owns rows" ON financial_goals FOR ALL USING (auth.uid() = user_id);

-- recurring_bills
CREATE TABLE IF NOT EXISTS recurring_bills (
  id           text    PRIMARY KEY,
  user_id      uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text    NOT NULL,
  icon         text    NOT NULL,
  amount       numeric NOT NULL,
  due_day      int     NOT NULL,
  is_essential bool    NOT NULL DEFAULT false,
  is_recurring bool    NOT NULL DEFAULT true,
  paid_months  jsonb   NOT NULL DEFAULT '[]',
  created_at   text    NOT NULL
);
ALTER TABLE recurring_bills ADD COLUMN IF NOT EXISTS is_recurring bool NOT NULL DEFAULT true;
ALTER TABLE recurring_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON recurring_bills;
CREATE POLICY "user owns rows" ON recurring_bills FOR ALL USING (auth.uid() = user_id);

-- user_pet
CREATE TABLE IF NOT EXISTS user_pet (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  class            text NOT NULL,
  name             text NOT NULL,
  level            int  NOT NULL DEFAULT 1,
  exp              int  NOT NULL DEFAULT 0,
  battles_won      int  NOT NULL DEFAULT 0,
  battles_lost     int  NOT NULL DEFAULT 0,
  tasks_xp_claimed int  NOT NULL DEFAULT 0,
  ideas_xp_claimed int  NOT NULL DEFAULT 0
);
ALTER TABLE user_pet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON user_pet;
CREATE POLICY "user owns rows" ON user_pet FOR ALL USING (auth.uid() = user_id);

-- ─── CRM: leads ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                       text PRIMARY KEY,
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                     text NOT NULL,
  contact                  text,
  phone                    text,
  email                    text,
  instagram                text,
  budget                   text,
  notes                    text,
  stage                    text NOT NULL,
  converted_to_company_id  text,
  created_at               text NOT NULL
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON leads;
CREATE POLICY "user owns rows" ON leads FOR ALL USING (auth.uid() = user_id);

-- ─── quick_notes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quick_notes (
  id          text    PRIMARY KEY,
  user_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        text    NOT NULL,
  checked     bool    NOT NULL DEFAULT false,
  created_at  text    NOT NULL
);
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON quick_notes;
CREATE POLICY "user owns rows" ON quick_notes FOR ALL USING (auth.uid() = user_id);

-- ─── Índices pra performance ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_user          ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date          ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_leads_user          ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage         ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_todo_user           ON todo_items(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date   ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_calendar_user       ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_date       ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_ideas_user          ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user      ON recurring_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_notes_user    ON quick_notes(user_id);

-- ============================================================
-- FIM. Rode tudo de uma vez no SQL Editor. Todas as tabelas têm
-- Row-Level Security ligada e política "user owns rows" aplicada:
-- cada usuário só vê/mexe nos próprios registros.
-- ============================================================
