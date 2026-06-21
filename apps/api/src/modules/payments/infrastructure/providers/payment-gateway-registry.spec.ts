import { ServiceUnavailableException } from '@nestjs/common';
import { PaymentProviderType } from '@sih-saas/shared';
import { PaymentGatewayRegistry } from './payment-gateway-registry';

describe('PaymentGatewayRegistry', () => {
  it('résout chaque passerelle implémentée par son type', () => {
    const sandbox = { type: PaymentProviderType.SANDBOX } as any;
    const wave = { type: PaymentProviderType.WAVE } as any;
    const orangeMoney = { type: PaymentProviderType.ORANGE_MONEY } as any;
    const stripe = { type: PaymentProviderType.STRIPE } as any;
    const registry = new PaymentGatewayRegistry(sandbox, wave, orangeMoney, stripe);

    expect(registry.get(PaymentProviderType.SANDBOX)).toBe(sandbox);
    expect(registry.get(PaymentProviderType.WAVE)).toBe(wave);
    expect(registry.get(PaymentProviderType.ORANGE_MONEY)).toBe(orangeMoney);
    expect(registry.get(PaymentProviderType.STRIPE)).toBe(stripe);
  });

  it('résout CARTE vers la même instance que STRIPE (alias, Phase 32)', () => {
    const stripe = { type: PaymentProviderType.STRIPE } as any;
    const registry = new PaymentGatewayRegistry({} as any, {} as any, {} as any, stripe);

    expect(registry.get(PaymentProviderType.CARTE)).toBe(stripe);
  });

  it('rejette un type de passerelle inconnu', () => {
    const registry = new PaymentGatewayRegistry({} as any, {} as any, {} as any, {} as any);

    expect(() => registry.get('INCONNU' as PaymentProviderType)).toThrow(ServiceUnavailableException);
  });
});
