import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || uuidv4();

    let statusCode: number;
    let message: string | string[];
    let error: string;
    let errors: unknown[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string | string[]) || exception.message;
        error = (resp['error'] as string) || exception.name;
        if (Array.isArray(resp['errors'])) {
          errors = resp['errors'];
        }
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
    }

    if (statusCode >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: Record<string, unknown> = {
      statusCode,
      error,
      message,
      requestId,
    };
    if (errors) {
      body.errors = errors;
    }
    response.status(statusCode).json(body);
  }
}
