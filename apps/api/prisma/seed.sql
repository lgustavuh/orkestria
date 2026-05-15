-- Orkestria Seed Data

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles
INSERT INTO roles (id, name, description, created_at) VALUES
  ('role-superadmin', 'SUPER_ADMIN', 'Administrador do SaaS', NOW()),
  ('role-admin', 'ADMIN', 'Administrador da agência', NOW()),
  ('role-strategist', 'STRATEGIST', 'Estrategista de marketing', NOW()),
  ('role-copywriter', 'COPYWRITER', 'Redator/Copywriter', NOW()),
  ('role-traffic', 'TRAFFIC_MANAGER', 'Gestor de Tráfego', NOW()),
  ('role-social', 'SOCIAL_MEDIA', 'Social Media', NOW()),
  ('role-designer', 'DESIGNER', 'Designer', NOW()),
  ('role-client', 'CLIENT', 'Cliente externo', NOW())
ON CONFLICT (name) DO NOTHING;

-- Super Admin (owner do SaaS - sem tenant)
INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, created_at, updated_at) VALUES
  ('user-superadmin', 'admin@orkestria.com', crypt('Admin@2025!', gen_salt('bf', 12)), 'Super', 'Admin', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES
  ('ur-sa-1', 'user-superadmin', 'role-superadmin', NOW()),
  ('ur-sa-2', 'user-superadmin', 'role-admin', NOW())
ON CONFLICT DO NOTHING;
