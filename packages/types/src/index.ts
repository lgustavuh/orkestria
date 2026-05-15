// Shared types used by both API and Frontend

export type RoleType = 'ADMIN' | 'STRATEGIST' | 'COPYWRITER' | 'TRAFFIC_MANAGER' | 'SOCIAL_MEDIA' | 'DESIGNER' | 'CLIENT';
export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
export type FileVisibility = 'INTERNAL' | 'CLIENT_SHARED';
export type CommentVisibility = 'INTERNAL' | 'CLIENT_VISIBLE';

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  client?: { id: string; name: string };
}

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: UserSummary;
  dueDate?: string;
}

export const ROLE_LABELS: Record<RoleType, string> = {
  ADMIN: 'Administrador',
  STRATEGIST: 'Estrategista',
  COPYWRITER: 'Copywriter',
  TRAFFIC_MANAGER: 'Gestor de Tráfego',
  SOCIAL_MEDIA: 'Social Media',
  DESIGNER: 'Designer',
  CLIENT: 'Cliente',
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  IN_REVIEW: 'Em revisão',
  BLOCKED: 'Bloqueada',
  DONE: 'Concluída',
  CANCELLED: 'Cancelada',
};
