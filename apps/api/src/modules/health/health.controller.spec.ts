import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

const connectMock = jest.fn();
const pingMock = jest.fn();
const disconnectMock = jest.fn();

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    connect: connectMock,
    ping: pingMock,
    disconnect: disconnectMock,
  })),
}));

describe('HealthController (Phase 22)', () => {
  let dataSource: { isInitialized: boolean };
  let mongoConnection: { readyState: number };
  let config: { get: jest.Mock };
  let controller: HealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    connectMock.mockResolvedValue(undefined);
    pingMock.mockResolvedValue('PONG');
    dataSource = { isInitialized: true };
    mongoConnection = { readyState: 1 };
    config = { get: jest.fn().mockReturnValue(undefined) };
    controller = new HealthController(dataSource as never, mongoConnection as never, config as never);
  });

  it('retourne up pour les trois dépendances quand tout fonctionne', async () => {
    const resultat = await controller.check();
    expect(resultat).toEqual({ postgres: 'up', mongodb: 'up', redis: 'up' });
  });

  it('lance ServiceUnavailableException (503) si Postgres est down', async () => {
    dataSource.isInitialized = false;
    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });

  it('lance ServiceUnavailableException si MongoDB est down', async () => {
    mongoConnection.readyState = 0;
    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });

  it('lance ServiceUnavailableException si le ping Redis échoue', async () => {
    pingMock.mockRejectedValue(new Error('connexion refusée'));
    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });

  it('le message liste précisément les dépendances en panne', async () => {
    dataSource.isInitialized = false;
    pingMock.mockRejectedValue(new Error('connexion refusée'));
    await expect(controller.check()).rejects.toThrow('postgres, redis');
  });
});
