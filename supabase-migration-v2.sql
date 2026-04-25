-- ============================================================
-- EvoTasks — Migration v2
-- Onda 4 (workspaces) + Onda 5 (agência) + extra_data
-- Seguro rodar múltiplas vezes (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ─── extra_data para campos extras não mapeados em colunas explícitas ────────
ALTER TABLE companies       ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE tasks           ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE leads           ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE sub_clients     ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE ideas           ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE todo_items      ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;

-- ─── Onda 5: tabelas de agência ───────────────────────────────────────────────

-- content_approvals
CREATE TABLE IF NOT EXISTS content_approvals (
  id           text    PRIMARY KEY,
  user_id      uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text,
  task_id      text,
  client_id    text    NOT NULL,
  title        text    NOT NULL,
  type         text    NOT NULL,
  assets       jsonb   NOT NULL DEFAULT '[]',
  status       text    NOT NULL DEFAULT 'rascunho',
  share_token  text    NOT NULL,
  post_date    text,
  feedback     text,
  sent_at      text,
  viewed_at    text,
  decided_at   text,
  deleted_at   text,
  created_at   text    NOT NULL
);
ALTER TABLE content_approvals ADD COLUMN IF NOT EXISTS post_date text;
ALTER TABLE content_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON content_approvals;
CREATE POLICY "user owns rows" ON content_approvals FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_content_approvals_user ON content_approvals(user_id);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id           text    PRIMARY KEY,
  user_id      uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text,
  client_id    text    NOT NULL,
  number       int     NOT NULL,
  date         text    NOT NULL,
  due_date     text,
  items        jsonb   NOT NULL DEFAULT '[]',
  subtotal     numeric NOT NULL DEFAULT 0,
  taxes        numeric NOT NULL DEFAULT 0,
  total        numeric NOT NULL DEFAULT 0,
  notes        text,
  status       text    NOT NULL DEFAULT 'rascunho',
  paid_at      text,
  share_token  text,
  pix_key      text,
  pix_name     text,
  deleted_at   text,
  created_at   text    NOT NULL
);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS share_token text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pix_key     text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pix_name    text;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON invoices;
CREATE POLICY "user owns rows" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);

-- briefings
CREATE TABLE IF NOT EXISTS briefings (
  id            text    PRIMARY KEY,
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id  text,
  client_id     text    NOT NULL,
  title         text    NOT NULL,
  share_token   text    NOT NULL,
  status        text    NOT NULL DEFAULT 'rascunho',
  questions     jsonb   NOT NULL DEFAULT '[]',
  responded_at  text,
  deleted_at    text,
  created_at    text    NOT NULL
);
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON briefings;
CREATE POLICY "user owns rows" ON briefings FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_briefings_user ON briefings(user_id);

-- onboarding_templates
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id           text    PRIMARY KEY,
  user_id      uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text,
  name         text    NOT NULL,
  steps        jsonb   NOT NULL DEFAULT '[]',
  created_at   text    NOT NULL
);
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON onboarding_templates;
CREATE POLICY "user owns rows" ON onboarding_templates FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_templates(user_id);

-- snippets
CREATE TABLE IF NOT EXISTS snippets (
  id           text    PRIMARY KEY,
  user_id      uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text,
  title        text    NOT NULL,
  text         text    NOT NULL,
  category     text,
  use_count    int     NOT NULL DEFAULT 0,
  created_at   text    NOT NULL
);
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON snippets;
CREATE POLICY "user owns rows" ON snippets FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_snippets_user ON snippets(user_id);

-- habits
CREATE TABLE IF NOT EXISTS habits (
  id           text    PRIMARY KEY,
  user_id      uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text,
  title        text    NOT NULL,
  frequency    text    NOT NULL,
  weekdays     jsonb,
  monthly_day  int,
  completions  jsonb   NOT NULL DEFAULT '[]',
  archived     bool    NOT NULL DEFAULT false,
  created_at   text    NOT NULL
);
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON habits;
CREATE POLICY "user owns rows" ON habits FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);

-- ─── Onda 4: workspaces ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id         text    PRIMARY KEY,
  user_id    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb   NOT NULL DEFAULT '{}',
  created_at text    NOT NULL
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON workspaces;
CREATE POLICY "user owns rows" ON workspaces FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);

-- ─── Propostas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id         text    PRIMARY KEY,
  user_id    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb   NOT NULL DEFAULT '{}',
  created_at text    NOT NULL
);
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON proposals;
CREATE POLICY "user owns rows" ON proposals FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);

-- ─── Time tracking (Onda 6) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id         text    PRIMARY KEY,
  user_id    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb   NOT NULL DEFAULT '{}',
  created_at text    NOT NULL
);
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON time_entries;
CREATE POLICY "user owns rows" ON time_entries FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);

-- ─── Pastas de aprovação ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_folders (
  id         text    PRIMARY KEY,
  user_id    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb   NOT NULL DEFAULT '{}',
  created_at text    NOT NULL
);
ALTER TABLE approval_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user owns rows" ON approval_folders;
CREATE POLICY "user owns rows" ON approval_folders FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_approval_folders_user ON approval_folders(user_id);

-- ============================================================
-- FIM. Rode tudo de uma vez no SQL Editor do Supabase.
-- ============================================================
