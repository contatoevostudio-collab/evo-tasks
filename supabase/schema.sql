-- Enable RLS
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  status TEXT DEFAULT 'ativo',          -- v1.3.0
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sub_clients (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_id TEXT NOT NULL,
  notes TEXT,
  tips TEXT[] DEFAULT '{}',
  monthly_quota INTEGER,                -- v1.2.0
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  sub_client_id TEXT,
  task_type TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  date TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  all_day BOOLEAN DEFAULT TRUE,
  time TEXT,
  priority TEXT,
  notes TEXT,
  deadline TEXT,
  archived BOOLEAN DEFAULT FALSE,
  inbox BOOLEAN DEFAULT FALSE,
  color_override TEXT,
  subtasks JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quick_notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  budget TEXT,
  notes TEXT,
  stage TEXT NOT NULL DEFAULT 'prospeccao',
  converted_to_company_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "companies_own" ON companies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sub_clients_own" ON sub_clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_own" ON tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leads_own" ON leads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quick_notes_own" ON quick_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_clients_user_id ON sub_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_notes_user_id ON quick_notes(user_id);
