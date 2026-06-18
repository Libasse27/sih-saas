import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

interface HttpExceptionBody {
  message?: string | string[];
}

/** Uniformise toutes les erreurs au format { success: false, data: null, message, errors? }. */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;

    const rawMessage =
      typeof body === 'string'
        ? body
        : (body as HttpExceptionBody)?.message ?? "Une erreur inattendue s'est produite.";

    const errors = Array.isArray(rawMessage) ? rawMessage : undefined;
    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

    response.status(status).json({
      success: false,
      data: null,
      message,
      errors,
    });
  }
}
