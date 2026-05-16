import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor that extracts tenantId from request and makes it available.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    // tenantId is set by TenantMiddleware
    // Controllers can access via req.tenantId
    return next.handle();
  }
}
