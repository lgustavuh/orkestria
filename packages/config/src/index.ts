// ── Environment ──
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isStaging = () => process.env.NODE_ENV === 'staging';
export const isDevelopment = () => !isProduction() && !isStaging();

// ── API ──
export const API_VERSION = 'v1';
export const API_PREFIX = 'api';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── Auth ──
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_DAYS = 7;
export const PASSWORD_MIN_LENGTH = 8;
export const BCRYPT_SALT_ROUNDS = 12;
export const MFA_ISSUER = 'Orkestria';

// ── Rate Limits ──
export const RATE_LIMIT = {
  short: { ttl: 1000, limit: 10 },
  medium: { ttl: 60000, limit: 100 },
  long: { ttl: 3600000, limit: 1000 },
} as const;

// ── File Upload ──
export const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/wav',
  'application/zip', 'application/x-rar-compressed',
] as const;

// ── Project Stages (defaults) ──
export const DEFAULT_STAGES = [
  { type: 'BACKLOG', name: 'Backlog', order: 0 },
  { type: 'PLANNING', name: 'Planejamento', order: 1 },
  { type: 'PRODUCTION', name: 'Produção', order: 2 },
  { type: 'REVIEW', name: 'Revisão', order: 3 },
  { type: 'APPROVAL', name: 'Aprovação', order: 4 },
  { type: 'COMPLETED', name: 'Concluído', order: 5 },
] as const;

// ── Notification Types ──
export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_OVERDUE: 'TASK_OVERDUE',
  COMMENT_ADDED: 'COMMENT_ADDED',
  COMMENT_MENTION: 'COMMENT_MENTION',
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  APPROVAL_RESOLVED: 'APPROVAL_RESOLVED',
  FILE_SHARED: 'FILE_SHARED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  STAGE_CHANGED: 'STAGE_CHANGED',
  DEADLINE_APPROACHING: 'DEADLINE_APPROACHING',
  FEEDBACK_RECEIVED: 'FEEDBACK_RECEIVED',
  SYSTEM: 'SYSTEM',
} as const;
