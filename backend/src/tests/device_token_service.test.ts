/**
 * Unit tests for DeviceTokenService (Issue #1701)
 */

import { DeviceTokenService } from '../device_token_service';

describe('DeviceTokenService', () => {
  let mockDb: any;
  let mockLogger: any;
  let service: DeviceTokenService;

  beforeEach(() => {
    mockDb = {
      mobileDeviceToken: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          { token: 'tok_ios_123', platform: 'ios' },
        ]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    service = new DeviceTokenService({ db: mockDb, logger: mockLogger });
  });

  it('registers token with injected db and logger', async () => {
    await service.registerToken('user_1', 'tok_ios_123', 'ios');
    expect(mockDb.mobileDeviceToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'tok_ios_123' },
      })
    );
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('gets tokens for user via injected db', async () => {
    const tokens = await service.getTokensForUser('user_1');
    expect(tokens).toEqual([{ token: 'tok_ios_123', platform: 'ios' }]);
    expect(mockDb.mobileDeviceToken.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_1', isValid: true },
      select: { token: true, platform: true },
    });
  });

  it('marks token invalid', async () => {
    await service.markTokenInvalid('tok_ios_123');
    expect(mockDb.mobileDeviceToken.updateMany).toHaveBeenCalledWith({
      where: { token: 'tok_ios_123' },
      data: { isValid: false },
    });
  });

  it('prunes expired tokens and logs count', async () => {
    await service.pruneExpiredTokens();
    expect(mockDb.mobileDeviceToken.deleteMany).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Pruned expired mobile tokens',
      { count: 2 }
    );
  });
});
