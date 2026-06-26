import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PatientsService } from '../../patients/application/patients.service';
import { MessagingService } from '../application/messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';

/**
 * Messagerie sécurisée (Phase 14, prompt maître §14) — pas de @RequirePlanFeature : ne fait pas
 * partie des 15 modules métiers (§10.4), toujours disponible, comme les modules support. Seul le patient peut
 * démarrer une conversation (POST /conversations) ; le personnel ne peut que répondre à une
 * conversation déjà initiée par un patient — décision volontaire pour rester dans le périmètre
 * "le patient prend contact", pas une messagerie générale bidirectionnelle libre.
 */
@ApiTags('Messagerie')
@ApiBearerAuth()
@Controller()
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly patientsService: PatientsService,
  ) {}

  @Post('conversations')
  @Scopes(Scope.PATIENT)
  @RequirePermissions(Permission.MESSAGE_SEND)
  @ResponseMessage('Conversation démarrée.')
  async demarrerConversation(@Body() dto: CreateConversationDto, @CurrentUser() currentUser: JwtPayload) {
    const patient = await this.patientsService.findByUserId(currentUser.sub);
    if (!patient) {
      throw new NotFoundException('Aucun dossier patient associé à ce compte.');
    }
    return this.messagingService.demarrerConversation(patient.id, dto.praticienId);
  }

  @Get('conversations')
  @Scopes(Scope.PATIENT, Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.MESSAGE_READ)
  @ResponseMessage('Mes conversations.')
  async findConversations(@CurrentUser() currentUser: JwtPayload) {
    if (currentUser.scope === Scope.PATIENT) {
      const patient = await this.patientsService.findByUserId(currentUser.sub);
      if (!patient) {
        throw new NotFoundException('Aucun dossier patient associé à ce compte.');
      }
      return this.messagingService.findConversationsForPatient(patient.id);
    }
    return this.messagingService.findConversationsForPraticien(currentUser.sub);
  }

  @Get('conversations/:id/messages')
  @Scopes(Scope.PATIENT, Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.MESSAGE_READ)
  @ResponseMessage('Messages de la conversation.')
  async findMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const conversation = await this.messagingService.assertParticipant(id, currentUser.sub, currentUser.scope);
    return this.messagingService.findMessages(conversation, currentUser.scope, query.page, query.limit);
  }

  @Post('conversations/:id/messages')
  @Scopes(Scope.PATIENT, Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.MESSAGE_SEND)
  @ResponseMessage('Message envoyé.')
  async envoyerMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const conversation = await this.messagingService.assertParticipant(id, currentUser.sub, currentUser.scope);
    return this.messagingService.envoyerMessage(conversation, currentUser.sub, currentUser.scope, dto.contenu);
  }
}
