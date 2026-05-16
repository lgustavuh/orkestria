import { Injectable, Scope } from '@nestjs/common';

/**
 * Request-scoped service that holds the current tenant ID.
 * Set by TenantMiddleware, used by TenantPrismaService.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private _tenantId: string | null = null;

  set tenantId(id: string | null) { this._tenantId = id; }
  get tenantId(): string | null { return this._tenantId; }
}
