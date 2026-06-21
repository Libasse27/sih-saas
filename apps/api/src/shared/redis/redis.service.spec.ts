import { RedisService } from './redis.service';

const getMock = jest.fn();
const setMock = jest.fn();
const delMock = jest.fn();
const quitMock = jest.fn();

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    get: getMock,
    set: setMock,
    del: delMock,
    quit: quitMock,
  })),
}));

describe('RedisService (Phase 27)', () => {
  let service: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = { get: jest.fn().mockReturnValue(undefined) };
    service = new RedisService(config as any);
  });

  describe('getJSON', () => {
    it('renvoie null si la clé est absente', async () => {
      getMock.mockResolvedValue(null);

      expect(await service.getJSON('cache:x')).toBeNull();
    });

    it('désérialise la valeur JSON stockée', async () => {
      getMock.mockResolvedValue(JSON.stringify({ a: 1 }));

      expect(await service.getJSON('cache:x')).toEqual({ a: 1 });
    });
  });

  describe('setJSON', () => {
    it('sérialise la valeur et applique le TTL en secondes', async () => {
      await service.setJSON('cache:x', { a: 1 }, 60);

      expect(setMock).toHaveBeenCalledWith('cache:x', JSON.stringify({ a: 1 }), 'EX', 60);
    });
  });

  describe('del', () => {
    it('supprime la clé', async () => {
      await service.del('cache:x');

      expect(delMock).toHaveBeenCalledWith('cache:x');
    });
  });

  describe('onModuleDestroy', () => {
    it('ferme la connexion proprement', async () => {
      await service.onModuleDestroy();

      expect(quitMock).toHaveBeenCalled();
    });
  });
});
