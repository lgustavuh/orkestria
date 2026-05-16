import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: any[] | undefined;

    // NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        const obj = res as any;
        message = obj.message || message;
        if (Array.isArray(obj.message)) {
          errors = obj.message;
          message = 'Erro de validação';
        }
      }
    }

    // Prisma known errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const isProduction = process.env.NODE_ENV === 'production';
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = isProduction ? 'Registro duplicado' : `Registro duplicado: ${(exception.meta?.target as string[])?.join(', ') || 'campo'} já existe`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Registro não encontrado';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Referência inválida';
          break;
        default:
          this.logger.error(`Prisma error ${exception.code}:`, exception.message);
          message = 'Erro interno';
      }
    }

    // Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      this.logger.error('Prisma validation error:', exception.message);
      message = 'Dados inválidos';
    }

    // Unknown errors
    else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    // Log 5xx errors
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
