import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

interface HttpExceptionBody {
  message?: string | string[];
}

/**
 * Uniformise toutes les erreurs au format { success: false, data: null, message, errors? }.
 * Journalise aussi chaque exception (Phase 22) — avant cette phase, ce filtre interceptait tout
 * sans jamais rien écrire dans les logs : une erreur 500 ne laissait donc aucune trace côté serveur.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

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

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(message);
    }

    response.status(status).json({
      success: false,
      data: null,
      message,
      errors,
    });
  }
}
