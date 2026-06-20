import { ServiceUnavailableException } from '@nestjs/common';
import { PaymentProviderType } from '@sih-saas/shared';
import { PaymentGatewayRegistry } from './payment-gateway-registry';

describe('PaymentGatewayRegistry', () => {
  it('résout chaque passerelle implémentée par son type', () => {
    const sandbox = { type: PaymentProviderType.SANDBOX } as any;
    const wave = { type: PaymentProviderType.WAVE } as any;
    const orangeMoney = { type: PaymentProviderType.ORANGE_MONEY } as any;
    const registry = new PaymentGatewayRegistry(sandbox, wave, orangeMoney);

    expect(registry.get(PaymentProviderType.SANDBOX)).toBe(sandbox);
    expect(registry.get(PaymentProviderType.WAVE)).toBe(wave);
    expect(registry.get(PaymentProviderType.ORANGE_MONEY)).toBe(orangeMoney);
  });

  it('rejette une passerelle non implémentée (STRIPE/CARTE)', () => {
    const registry = new PaymentGatewayRegistry({} as any, {} as any, {} as any);

    expect(() => registry.get(PaymentProviderType.STRIPE)).toThrow(ServiceUnavailableException);
    expect(() => registry.get(PaymentProviderType.CARTE)).toThrow(ServiceUnavailableException);
  });
});
