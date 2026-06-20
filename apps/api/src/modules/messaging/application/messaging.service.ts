import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Scope } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { PatientsService } from '../../patients/application/patients.service';
import { PushNotificationsService } from '../../notifications/application/push-notifications.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { UsersService } from '../../users/application/users.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { ConversationEntity } from '../infrastructure/entities/conversation.entity';
import { MessageEntity } from '../infrastructure/entities/message.entity';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ConversationAvecResume extends ConversationEntity {
  patientNom: string;
  praticienNom: string;
}

/**
 * `clinic.conversations`/`clinic.messages` protégées par RLS — convention tenantContext.getManager().
 * Diffusion temps réel ciblée via `RealtimeGateway.emitToUser` (Phase 14) — jamais `emitToEtablissement`,
 * une conversation ne doit être visible que par ses deux participants, pas tout le tenant.
 */
@Injectable()
export class MessagingService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly usersService: UsersService,
    private readonly patientsService: PatientsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  private get conversationsRepository(): Repository<ConversationEntity> {
    return this.tenantContext.getManager().getRepository(ConversationEntity);
  }

  private get messagesRepository(): Repository<MessageEntity> {
    return this.tenantContext.getManager().getRepository(MessageEntity);
  }

  /** Réutilise la conversation existante pour cette paire (patientId, praticienId) si elle existe déjà. */
  async demarrerConversation(patientId: string, praticienId: string): Promise<ConversationEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;

    const estPraticienValide = await this.usersService.estPraticienValide(praticienId, etablissementId);
    if (!estPraticienValide) {
      throw new BadRequestException('Ce praticien est introuvable dans votre établissement.');
    }

    const existante = await this.conversationsRepository.findOne({ where: { patientId, praticienId } });
    if (existante) {
      return existante;
    }

    return this.conversationsRepository.save(this.conversationsRepository.create({ etablissementId, patientId, praticienId }));
  }

  async findConversationsForPatient(patientId: string): Promise<ConversationAvecResume[]> {
    const conversations = await this.conversationsRepository.find({ where: { patientId }, order: { dernierMessageAt: 'DESC' } });
    return this.enrichirConversations(conversations);
  }

  async findConversationsForPraticien(praticienId: string): Promise<ConversationAvecResume[]> {
    const conversations = await this.conversationsRepository.find({ where: { praticienId }, order: { dernierMessageAt: 'DESC' } });
    return this.enrichirConversations(conversations);
  }

  private async enrichirConversations(conversations: ConversationEntity[]): Promise<ConversationAvecResume[]> {
    return Promise.all(
      conversations.map(async (conversation) => {
        const [patient, praticien] = await Promise.all([
          this.patientsService.findById(conversation.patientId),
          this.usersService.findById(conversation.praticienId),
        ]);
        return {
          ...conversation,
          patientNom: `${patient.prenom} ${patient.nom}`,
          praticienNom: `${praticien.prenom} ${praticien.nom}`,
        };
      }),
    );
  }

  async findById(id: string): Promise<ConversationEntity> {
    const conversation = await this.conversationsRepository.findOne({ where: { id } });
    if (!conversation) {
      throw new NotFoundException('Conversation introuvable.');
    }
    return conversation;
  }

  /** Vérifie que l'appelant est bien l'un des deux participants — sinon NotFoundException (ne révèle pas l'existence). */
  async assertParticipant(conversationId: string, userId: string, scope: Scope): Promise<ConversationEntity> {
    const conversation = await this.findById(conversationId);
    const participantId = scope === Scope.PATIENT ? conversation.patientId : conversation.praticienId;
    const compteAttendu = scope === Scope.PATIENT ? await this.patientsService.findByUserId(userId) : null;

    const estParticipant = scope === Scope.PATIENT ? compteAttendu?.id === participantId : userId === participantId;
    if (!estParticipant) {
      throw new NotFoundException('Conversation introuvable.');
    }
    return conversation;
  }

  async findMessages(
    conversation: ConversationEntity,
    lecteurScope: Scope,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<MessageEntity>> {
    const [items, total] = await this.messagesRepository.findAndCount({
      where: { conversationId: conversation.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    await this.marquerCommeLu(conversation.id, lecteurScope);

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private async marquerCommeLu(conversationId: string, lecteurScope: Scope): Promise<void> {
    const colonne = lecteurScope === Scope.PATIENT ? 'luParPatient' : 'luParPraticien';
    await this.messagesRepository.update({ conversationId, [colonne]: false }, { [colonne]: true });
  }

  async envoyerMessage(
    conversation: ConversationEntity,
    auteurId: string,
    auteurScope: Scope,
    contenu: string,
  ): Promise<MessageEntity> {
    if (auteurScope !== Scope.PATIENT && auteurScope !== Scope.ETABLISSEMENT) {
      throw new ForbiddenException('Scope non autorisé pour la messagerie.');
    }

    const message = await this.messagesRepository.save(
      this.messagesRepository.create({
        etablissementId: conversation.etablissementId,
        conversationId: conversation.id,
        auteurId,
        auteurScope,
        contenu,
        luParPatient: auteurScope === Scope.PATIENT,
        luParPraticien: auteurScope === Scope.ETABLISSEMENT,
      }),
    );

    await this.conversationsRepository.update(conversation.id, { dernierMessageAt: message.createdAt });

    const destinataireUserId = await this.resoudreDestinataireUserId(conversation, auteurScope);
    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToUser(destinataireUserId, 'message:nouveau', {
        conversationId: conversation.id,
        messageId: message.id,
      });
      // Jamais le contenu du message dans la notification push (confidentialité — visible sur un
      // écran de verrouillage) : juste une alerte générique invitant à ouvrir l'application.
      void this.pushNotificationsService.envoyerATousLesAppareils(destinataireUserId, {
        titre: 'Nouveau message sécurisé',
        corps: 'Vous avez reçu un nouveau message — ouvrez l’application pour le consulter.',
        data: { conversationId: conversation.id },
      });
    });

    return message;
  }

  /** Le destinataire est le praticien si l'auteur est le patient, et vice-versa. */
  private async resoudreDestinataireUserId(conversation: ConversationEntity, auteurScope: Scope): Promise<string> {
    if (auteurScope === Scope.ETABLISSEMENT) {
      const patient = await this.patientsService.findById(conversation.patientId);
      if (!patient.userId) {
        return conversation.patientId;
      }
      return patient.userId;
    }
    return conversation.praticienId;
  }
}
