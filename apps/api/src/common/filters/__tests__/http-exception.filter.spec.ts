import { GlobalExceptionFilter } from '../http-exception.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({ method: 'POST', url: '/api/v1/test', ip: '127.0.0.1', headers: {} }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle HttpException', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Not Found' }),
    );
  });

  it('should handle validation errors with array messages', () => {
    const exception = new HttpException(
      { message: ['email must be an email', 'password is too short'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Erro de validação',
        errors: ['email must be an email', 'password is too short'],
      }),
    );
  });

  it('should handle Prisma P2002 (unique constraint)', () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['email'] } },
    );
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('duplicado') }),
    );
  });

  it('should handle Prisma P2025 (not found)', () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      { code: 'P2025', clientVersion: '5.0.0' },
    );
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should handle unknown errors as 500', () => {
    filter.catch(new Error('something broke'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  it('should include timestamp and path', () => {
    filter.catch(new HttpException('test', 400), mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
        path: '/api/v1/test',
      }),
    );
  });
});
