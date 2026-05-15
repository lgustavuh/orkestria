import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface SearchResult {
  type: 'project' | 'task' | 'file' | 'comment' | 'client';
  id: string;
  title: string;
  subtitle?: string;
  projectId?: string;
  projectName?: string;
  rank: number;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async globalSearch(
    query: string,
    userId: string,
    roles: string[],
    options: { limit?: number; types?: string[] } = {},
  ): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const limit = Math.min(options.limit || 20, 50);
    const tsQuery = query.trim().replace(/[^\w\sáàâãéèêíìîóòôõúùûçñ-]/gi, '').split(/\s+/).join(' & ') + ':*';
    const isAdmin = roles.includes('ADMIN') || roles.includes('STRATEGIST');
    const isClient = roles.includes('CLIENT');
    const types = options.types || ['project', 'task', 'file', 'client'];
    const results: SearchResult[] = [];

    if (types.includes('project')) {
      let projectRows: any[];
      if (isAdmin) {
        projectRows = await this.prisma.$queryRawUnsafe<any[]>(`
          SELECT id, name, description, status,
            ts_rank(to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(briefing,'') || ' ' || coalesce(objective,'')),
              to_tsquery('portuguese', $1)) AS rank
          FROM projects WHERE is_deleted = false
            AND to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(briefing,'') || ' ' || coalesce(objective,''))
                @@ to_tsquery('portuguese', $1)
          ORDER BY rank DESC LIMIT $2
        `, tsQuery, Math.ceil(limit / 3));
      } else if (isClient) {
        projectRows = await this.prisma.$queryRawUnsafe<any[]>(`
          SELECT id, name, description, status,
            ts_rank(to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(briefing,'') || ' ' || coalesce(objective,'')),
              to_tsquery('portuguese', $1)) AS rank
          FROM projects WHERE is_deleted = false
            AND client_id IN (SELECT client_id FROM client_users WHERE user_id = $3)
            AND to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(briefing,'') || ' ' || coalesce(objective,''))
                @@ to_tsquery('portuguese', $1)
          ORDER BY rank DESC LIMIT $2
        `, tsQuery, Math.ceil(limit / 3), userId);
      } else {
        projectRows = await this.prisma.$queryRawUnsafe<any[]>(`
          SELECT id, name, description, status,
            ts_rank(to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(briefing,'') || ' ' || coalesce(objective,'')),
              to_tsquery('portuguese', $1)) AS rank
          FROM projects WHERE is_deleted = false
            AND id IN (SELECT project_id FROM project_members WHERE user_id = $3)
            AND to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(briefing,'') || ' ' || coalesce(objective,''))
                @@ to_tsquery('portuguese', $1)
          ORDER BY rank DESC LIMIT $2
        `, tsQuery, Math.ceil(limit / 3), userId);
      }
      results.push(...projectRows.map((p: any) => ({
        type: 'project' as const, id: p.id, title: p.name, subtitle: p.status, rank: Number(p.rank),
      })));
    }

    if (types.includes('task') && !isClient) {
      const taskRows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT t.id, t.title, t.status, t.project_id, p.name AS project_name,
          ts_rank(to_tsvector('portuguese', coalesce(t.title,'') || ' ' || coalesce(t.description,'')),
            to_tsquery('portuguese', $1)) AS rank
        FROM tasks t JOIN projects p ON t.project_id = p.id
        WHERE t.is_deleted = false
          AND to_tsvector('portuguese', coalesce(t.title,'') || ' ' || coalesce(t.description,''))
              @@ to_tsquery('portuguese', $1)
          ${isAdmin ? '' : `AND t.project_id IN (SELECT project_id FROM project_members WHERE user_id = '${userId}')`}
        ORDER BY rank DESC LIMIT $2
      `, tsQuery, Math.ceil(limit / 3));
      results.push(...taskRows.map((t: any) => ({
        type: 'task' as const, id: t.id, title: t.title, subtitle: t.status, projectId: t.project_id, projectName: t.project_name, rank: Number(t.rank),
      })));
    }

    if (types.includes('file')) {
      const fileRows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT f.id, f.original_name, f.project_id, p.name AS project_name,
          ts_rank(to_tsvector('simple', coalesce(f.original_name,'') || ' ' || coalesce(f.description,'')),
            to_tsquery('simple', $1)) AS rank
        FROM files f JOIN projects p ON f.project_id = p.id
        WHERE f.is_deleted = false ${isClient ? "AND f.visibility = 'CLIENT_SHARED'" : ''}
          AND to_tsvector('simple', coalesce(f.original_name,'') || ' ' || coalesce(f.description,''))
              @@ to_tsquery('simple', $1)
        ORDER BY rank DESC LIMIT $2
      `, tsQuery, Math.ceil(limit / 4));
      results.push(...fileRows.map((f: any) => ({
        type: 'file' as const, id: f.id, title: f.original_name, projectId: f.project_id, projectName: f.project_name, rank: Number(f.rank),
      })));
    }

    if (types.includes('client') && isAdmin) {
      const clientRows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT id, name, company_name,
          ts_rank(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(company_name,'') || ' ' || coalesce(email,'')),
            to_tsquery('simple', $1)) AS rank
        FROM clients
        WHERE to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(company_name,'') || ' ' || coalesce(email,''))
              @@ to_tsquery('simple', $1)
        ORDER BY rank DESC LIMIT 5
      `, tsQuery);
      results.push(...clientRows.map((c: any) => ({
        type: 'client' as const, id: c.id, title: c.name, subtitle: c.company_name, rank: Number(c.rank),
      })));
    }

    return results.sort((a, b) => b.rank - a.rank).slice(0, limit);
  }
}
