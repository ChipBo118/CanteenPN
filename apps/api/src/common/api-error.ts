import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(statusCode: HttpStatus, code: string, message: string, details?: unknown) {
    super({ statusCode, code, message, ...(details === undefined ? {} : { details }) }, statusCode);
  }
}

