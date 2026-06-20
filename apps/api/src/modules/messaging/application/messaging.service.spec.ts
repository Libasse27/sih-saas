import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Scope } from '@sih-saas/shared';
import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  let conversationsRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock; update: jest.Mock };
  let messagesRepository: { create: jest.Mock; save: jest.Mock; findAndCount: jest.Mock; update: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let usersService: { estPraticienValide: jest.Mock; findById: jest.Mock };
  let patientsService: { findById: jest.Mock; findByUserId: jest.Mock };
  let realtimeGateway: { emitToUser: jest.Mock };
  let pushNotificationsService: { envoyerATousLesAppareils: jest.Mock };
  let service: MessagingService;

  beforeEach(() => {
    conversationsRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'conv-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };
    messagesRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'msg-1', createdAt: new Date(), ...entity })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      update: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({
        getRepository: (entity: { name?: string }) =>
          entity?.name === 'MessageEntity' ? messagesRepository : conversationsRepository,
      })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((cb) => cb()),
    };
    usersService = { estPraticienValide: jest.fn(), findById: jest.fn() };
    patientsService = { findById: jest.fn(), findByUserId: jest.fn() };
    realtimeGateway = { emitToUser: jest.fn() };
    pushNotificationsService = { envoyerATousLesAppareils: jest.fn().mockResolvedValue(undefined) };

    service = new MessagingService(
      tenantContext as any,
      usersService as any,
      patientsService as any,
      realtimeGateway as any,
      pushNotificationsService as any,
    );
  });

  describe('demarrerConversation', () => {
    it('rejette si le praticien n’est pas valide dans l’établissement', async () => {
      usersService.estPraticienValide.mockResolvedValue(false);

      await expect(service.demarrerConversation('patient-1', 'praticien-1')).rejects.toThrow();
      expect(conversationsRepository.save).not.toHaveBeenCalled();
    });

    it('réutilise une conversation existante pour la même paire', async () => {
      usersService.estPraticienValide.mockResolvedValue(true);
      conversationsRepository.findOne.mockResolvedValue({ id: 'conv-existante', patientId: 'patient-1', praticienId: 'praticien-1' });

      const conversation = await service.demarrerConversation('patient-1', 'praticien-1');

      expect(conversation.id).toBe('conv-existante');
      expect(conversationsRepository.save).not.toHaveBeenCalled();
    });

    it('crée une nouvelle conversation si aucune n’existe', async () => {
      usersService.estPraticienValide.mockResolvedValue(true);
      conversationsRepository.findOne.mockResolvedValue(null);

      const conversation = await service.demarrerConversation('patient-1', 'praticien-1');

      expect(conversation.patientId).toBe('patient-1');
      expect(conversation.praticienId).toBe('praticien-1');
      expect(conversation.etablissementId).toBe('etab-1');
    });
  });

  describe('assertParticipant', () => {
    const conversation = { id: 'conv-1', patientId: 'patient-1', praticienId: 'praticien-1', etablissementId: 'etab-1' };

    it('autorise le praticien participant (scope ETABLISSEMENT)', async () => {
      conversationsRepository.findOne.mockResolvedValue(conversation);

      await expect(service.assertParticipant('conv-1', 'praticien-1', Scope.ETABLISSEMENT)).resolves.toEqual(conversation);
    });

    it('refuse un membre du personnel qui n’est pas participant', async () => {
      conversationsRepository.findOne.mockResolvedValue(conversation);

      await expect(service.assertParticipant('conv-1', 'autre-praticien', Scope.ETABLISSEMENT)).rejects.toThrow(NotFoundException);
    });

    it('autorise le patient participant (scope PATIENT, résolution via compte utilisateur)', async () => {
      conversationsRepository.findOne.mockResolvedValue(conversation);
      patientsService.findByUserId.mockResolvedValue({ id: 'patient-1' });

      await expect(service.assertParticipant('conv-1', 'user-patient-1', Scope.PATIENT)).resolves.toEqual(conversation);
    });

    it('refuse un patient qui n’est pas participant', async () => {
      conversationsRepository.findOne.mockResolvedValue(conversation);
      patientsService.findByUserId.mockResolvedValue({ id: 'patient-autre' });

      await expect(service.assertParticipant('conv-1', 'user-autre', Scope.PATIENT)).rejects.toThrow(NotFoundException);
    });
  });

  describe('envoyerMessage', () => {
    const conversation = { id: 'conv-1', patientId: 'patient-1', praticienId: 'praticien-1', etablissementId: 'etab-1' };

    it('rejette un scope non autorisé', async () => {
      await expect(
        service.envoyerMessage(conversation as any, 'user-1', 'PLATFORM' as any, 'Bonjour'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('notifie le praticien quand le patient envoie le message', async () => {
      patientsService.findById.mockResolvedValue({ id: 'patient-1', userId: null });

      await service.envoyerMessage(conversation as any, 'user-patient-1', Scope.PATIENT, 'Bonjour docteur');

      expect(realtimeGateway.emitToUser).toHaveBeenCalledWith('praticien-1', 'message:nouveau', expect.objectContaining({ conversationId: 'conv-1' }));
    });

    it('notifie le compte patient (userId) quand le praticien envoie le message', async () => {
      patientsService.findById.mockResolvedValue({ id: 'patient-1', userId: 'user-patient-1' });

      await service.envoyerMessage(conversation as any, 'praticien-1', Scope.ETABLISSEMENT, 'Bonjour, vos résultats sont prêts.');

      expect(realtimeGateway.emitToUser).toHaveBeenCalledWith('user-patient-1', 'message:nouveau', expect.objectContaining({ conversationId: 'conv-1' }));
    });
  });
});
