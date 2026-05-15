-- Full-text search indexes for PostgreSQL
-- Run after prisma migrate: psql $DATABASE_URL -f this_file.sql

-- Projects: search by name, description, briefing, objective
CREATE INDEX IF NOT EXISTS idx_projects_fts ON projects
  USING gin(to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(briefing, '') || ' ' || coalesce(objective, '')));

-- Tasks: search by title, description
CREATE INDEX IF NOT EXISTS idx_tasks_fts ON tasks
  USING gin(to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Files: search by original_name, description
CREATE INDEX IF NOT EXISTS idx_files_fts ON files
  USING gin(to_tsvector('simple', coalesce(original_name, '') || ' ' || coalesce(description, '')));

-- Clients: search by name, company_name, email
CREATE INDEX IF NOT EXISTS idx_clients_fts ON clients
  USING gin(to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(company_name, '') || ' ' || coalesce(email, '')));

-- Comments: search by content
CREATE INDEX IF NOT EXISTS idx_comments_fts ON task_comments
  USING gin(to_tsvector('portuguese', coalesce(content, '')));

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks (due_date, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks (assignee_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_approvals_type_status ON approvals (type, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_files_project_visibility ON files (project_id, visibility) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
