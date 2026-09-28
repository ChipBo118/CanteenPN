import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

type ApiErrorBody = {
  code?: string;
  message?: string | string[];
  details?: unknown;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const source = exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = typeof source === 'object' && source !== null ? source as ApiErrorBody : {};
    const fallback = statusCode === 500 ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại.' : String(source ?? 'Yêu cầu không hợp lệ.');

    response.status(statusCode).json({
      statusCode,
      code: body.code ?? (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED'),
      message: Array.isArray(body.message) ? body.message.join('; ') : body.message ?? fallback,
      ...(body.details === undefined ? {} : { details: body.details }),
      path: request.url,
      requestId: request.header('x-request-id') ?? randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }
}
