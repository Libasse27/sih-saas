import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway', () => {
  let jwtService: { verifyAsync: jest.Mock };
  let config: { get: jest.Mock };
  let gateway: RealtimeGateway;

  function buildClient(overrides: Record<string, unknown> = {}) {
    return {
      id: 'socket-1',
      data: {},
      handshake: { auth: {}, headers: {} },
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    config = { get: jest.fn().mockReturnValue('secret') };
    gateway = new RealtimeGateway(jwtService as any, config as any);
  });

  it('déconnecte le client si aucun token n’est fourni', async () => {
    const client = buildClient();

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('déconnecte le client si le token est invalide', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalide'));
    const client = buildClient({ handshake: { auth: { token: 'mauvais' }, headers: {} } });

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejoint le salon tenant:{etablissementId} pour un client authentifié', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', etablissementId: 'etab-A' });
    const client = buildClient({ handshake: { auth: { token: 'bon-token' }, headers: {} } });

    await gateway.handleConnection(client);

    expect(client.join).toHaveBeenCalledWith('tenant:etab-A');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('accepte le token via le header Authorization à défaut de handshake.auth', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', etablissementId: 'etab-A' });
    const client = buildClient({ handshake: { auth: {}, headers: { authorization: 'Bearer bon-token' } } });

    await gateway.handleConnection(client);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('bon-token', { secret: 'secret' });
    expect(client.join).toHaveBeenCalledWith('tenant:etab-A');
  });

  it('ne rejoint aucun salon pour un compte PLATFORM (etablissementId null)', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'super-admin', etablissementId: null });
    const client = buildClient({ handshake: { auth: { token: 'bon-token' }, headers: {} } });

    await gateway.handleConnection(client);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('emitToEtablissement() diffuse uniquement dans le salon tenant correspondant', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gateway.server = { to } as any;

    gateway.emitToEtablissement('etab-A', 'lits:updated', { litId: 'lit-1' });

    expect(to).toHaveBeenCalledWith('tenant:etab-A');
    expect(emit).toHaveBeenCalledWith('lits:updated', { litId: 'lit-1' });
  });
});
