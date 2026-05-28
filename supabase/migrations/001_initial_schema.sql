-- ============================================================
-- 001_initial_schema.sql
-- Full schema for the Jira-alternative ticketing tool
-- Multi-tenant via Row Level Security (RLS)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS
-- Each company / workspace is a tenant
-- ============================================================
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,          -- e.g. "acme-corp"
  logo_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with display info
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  email         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TENANT MEMBERS
-- Links users to tenants with a role
-- ============================================================
CREATE TYPE member_role AS ENUM ('admin', 'member', 'viewer');

CREATE TABLE tenant_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          member_role NOT NULL DEFAULT 'member',
  invited_by    UUID REFERENCES profiles(id),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- ============================================================
-- PROJECTS
-- Each tenant can have multiple projects
-- ============================================================
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  color         TEXT DEFAULT '#6366f1',        -- accent color for the project
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TICKETS
-- Core entity — one row per task/bug/feature/question
-- ============================================================
CREATE TYPE ticket_status   AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_category AS ENUM ('bug', 'task', 'feature', 'question');

CREATE TABLE tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  status        ticket_status   NOT NULL DEFAULT 'todo',
  priority      ticket_priority NOT NULL DEFAULT 'medium',
  category      ticket_category NOT NULL DEFAULT 'task',
  assignee_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES profiles(id),
  due_date      DATE,
  resolved_at   TIMESTAMPTZ,
  position      INTEGER DEFAULT 0,             -- ordering within kanban column
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast tenant-scoped queries
CREATE INDEX tickets_tenant_project_idx ON tickets(tenant_id, project_id);
CREATE INDEX tickets_assignee_idx ON tickets(assignee_id);
CREATE INDEX tickets_status_idx ON tickets(status);

-- ============================================================
-- COMMENTS
-- Threaded comments on tickets
-- ============================================================
CREATE TABLE comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  is_resolution BOOLEAN DEFAULT FALSE,         -- "mark as resolution" to close loop
  parent_id     UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX comments_ticket_idx ON comments(ticket_id);

-- ============================================================
-- ATTACHMENTS
-- Files / screenshots linked to tickets or comments
-- ============================================================
CREATE TABLE attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id    UUID REFERENCES comments(id) ON DELETE SET NULL,
  uploaded_by   UUID REFERENCES profiles(id),
  file_name     TEXT NOT NULL,
  file_size     BIGINT,
  mime_type     TEXT,
  storage_path  TEXT NOT NULL,                 -- Supabase Storage path
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOG
-- Immutable timeline: every meaningful change recorded
-- ============================================================
CREATE TYPE activity_verb AS ENUM (
  'created', 'status_changed', 'priority_changed',
  'assigned', 'unassigned', 'commented', 'attachment_added',
  'due_date_changed', 'title_changed', 'resolved', 'reopened'
);

CREATE TABLE activity_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verb          activity_verb NOT NULL,
  from_value    TEXT,                          -- e.g. old status
  to_value      TEXT,                          -- e.g. new status
  meta          JSONB,                         -- extra context if needed
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX activity_ticket_idx ON activity_log(ticket_id, created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- Per-user in-app notifications
-- ============================================================
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_id     UUID REFERENCES tickets(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,                 -- 'assigned' | 'comment' | 'due_soon' | 'status_changed'
  title         TEXT NOT NULL,
  body          TEXT,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX notifications_user_unread_idx ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- INVITATIONS
-- Pending email invites to join a tenant workspace
-- ============================================================
CREATE TABLE invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          member_role NOT NULL DEFAULT 'member',
  token         TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by    UUID REFERENCES profiles(id),
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ============================================================
-- UPDATED_AT auto-trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at    BEFORE UPDATE ON tenants    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at   BEFORE UPDATE ON profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at   BEFORE UPDATE ON projects   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tickets_updated_at    BEFORE UPDATE ON tickets    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER comments_updated_at   BEFORE UPDATE ON comments   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE on Supabase Auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Every table is tenant-scoped. Users only see their own data.
-- ============================================================

ALTER TABLE tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations     ENABLE ROW LEVEL SECURITY;

-- Helper: get all tenant IDs the current user belongs to
CREATE OR REPLACE FUNCTION my_tenant_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: role of current user in a tenant
CREATE OR REPLACE FUNCTION my_role_in(p_tenant_id UUID)
RETURNS TEXT AS $$
  SELECT role::TEXT FROM tenant_members
  WHERE user_id = auth.uid() AND tenant_id = p_tenant_id
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- TENANTS: see only tenants you're a member of
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (id = ANY(my_tenant_ids()));

CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (my_role_in(id) = 'admin');

-- PROFILES: see all profiles in your tenants
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM tenant_members
      WHERE tenant_id = ANY(my_tenant_ids())
    )
  );

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid());

-- TENANT_MEMBERS: see members of your tenants
CREATE POLICY tenant_members_select ON tenant_members FOR SELECT
  USING (tenant_id = ANY(my_tenant_ids()));

CREATE POLICY tenant_members_insert ON tenant_members FOR INSERT
  WITH CHECK (my_role_in(tenant_id) = 'admin');

CREATE POLICY tenant_members_delete ON tenant_members FOR DELETE
  USING (my_role_in(tenant_id) = 'admin' OR user_id = auth.uid());

-- PROJECTS: scoped to tenant membership
CREATE POLICY projects_select ON projects FOR SELECT
  USING (tenant_id = ANY(my_tenant_ids()));

CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK (my_role_in(tenant_id) IN ('admin', 'member'));

CREATE POLICY projects_update ON projects FOR UPDATE
  USING (my_role_in(tenant_id) IN ('admin', 'member'));

CREATE POLICY projects_delete ON projects FOR DELETE
  USING (my_role_in(tenant_id) = 'admin');

-- TICKETS: scoped to tenant membership
CREATE POLICY tickets_select ON tickets FOR SELECT
  USING (tenant_id = ANY(my_tenant_ids()));

CREATE POLICY tickets_insert ON tickets FOR INSERT
  WITH CHECK (my_role_in(tenant_id) IN ('admin', 'member'));

CREATE POLICY tickets_update ON tickets FOR UPDATE
  USING (my_role_in(tenant_id) IN ('admin', 'member'));

CREATE POLICY tickets_delete ON tickets FOR DELETE
  USING (my_role_in(tenant_id) IN ('admin', 'member'));

-- COMMENTS: scoped to tenant; authors can edit their own
CREATE POLICY comments_select ON comments FOR SELECT
  USING (tenant_id = ANY(my_tenant_ids()));

CREATE POLICY comments_insert ON comments FOR INSERT
  WITH CHECK (my_role_in(tenant_id) IN ('admin', 'member'));

CREATE POLICY comments_update ON comments FOR UPDATE
  USING (author_id = auth.uid() OR my_role_in(tenant_id) = 'admin');

CREATE POLICY comments_delete ON comments FOR DELETE
  USING (author_id = auth.uid() OR my_role_in(tenant_id) = 'admin');

-- ATTACHMENTS: scoped to tenant
CREATE POLICY attachments_select ON attachments FOR SELECT
  USING (tenant_id = ANY(my_tenant_ids()));

CREATE POLICY attachments_insert ON attachments FOR INSERT
  WITH CHECK (my_role_in(tenant_id) IN ('admin', 'member'));

CREATE POLICY attachments_delete ON attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR my_role_in(tenant_id) = 'admin');

-- ACTIVITY LOG: read-only for all members
CREATE POLICY activity_select ON activity_log FOR SELECT
  USING (tenant_id = ANY(my_tenant_ids()));

-- NOTIFICATIONS: users see only their own
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- INVITATIONS: admins manage, anyone can read their own invite token
CREATE POLICY invitations_select ON invitations FOR SELECT
  USING (tenant_id = ANY(my_tenant_ids()) OR email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY invitations_insert ON invitations FOR INSERT
  WITH CHECK (my_role_in(tenant_id) = 'admin');

CREATE POLICY invitations_delete ON invitations FOR DELETE
  USING (my_role_in(tenant_id) = 'admin');
