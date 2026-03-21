import { ConfigService } from '@nestjs/config';

interface FeeRate {
  type: 'percentage' | 'flat';
  value: number;
}

const DEFAULT_FEE_RATES: Record<string, FeeRate> = {
  qris: { type: 'percentage', value: 0.007 },
  bank_transfer: { type: 'flat', value: 4000 },
  echannel: { type: 'flat', value: 4000 },
  cstore: { type: 'flat', value: 5000 },
  credit_card: { type: 'percentage', value: 0.029 },
  gopay: { type: 'percentage', value: 0.02 },
  shopeepay: { type: 'percentage', value: 0.02 },
};

export function getFeeRates(configService?: ConfigService): Record<string, FeeRate> {
  const overrideJson = configService?.get<string>('MIDTRANS_FEE_RATES');
  if (overrideJson) {
    try {
      return { ...DEFAULT_FEE_RATES, ...JSON.parse(overrideJson) };
    } catch {
      return DEFAULT_FEE_RATES;
    }
  }
  return DEFAULT_FEE_RATES;
}

export function calculateFee(
  grossAmount: number,
  paymentType: string,
  configService?: ConfigService,
): { midtransFee: number; transferAmount: number; platformCost: number } {
  const rates = getFeeRates(configService);
  const rate = rates[paymentType];

  let midtransFee = 0;
  if (rate) {
    midtransFee =
      rate.type === 'percentage'
        ? Math.round(grossAmount * rate.value)
        : rate.value;
  }

  // Platform absorbs fee — institution receives full gross amount
  return {
    midtransFee,
    transferAmount: grossAmount,
    platformCost: midtransFee,
  };
}
