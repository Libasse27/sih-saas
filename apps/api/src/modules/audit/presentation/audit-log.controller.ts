import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Scope } from '@sih-saas/shared';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { AuditService } from '../application/audit.service';
import { FindAuditLogsQueryDto } from './dto/find-audit-logs-query.dto';

/** `audit_logs` reste append-only — ce contrôleur n'expose que la lecture (console super-admin, Phase 9). */
@ApiTags('Audit (plateforme)')
@ApiBearerAuth()
@Controller('audit-logs')
@Scopes(Scope.PLATFORM)
@RequirePermissions(Permission.AUDIT_READ_GLOBAL)
export class AuditLogController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ResponseMessage('Journal d’audit.')
  findAll(@Query() query: FindAuditLogsQueryDto) {
    return this.auditService.findAll(query.page, query.limit, query.etablissementId);
  }
}
