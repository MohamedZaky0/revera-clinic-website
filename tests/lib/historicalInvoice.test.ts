import { describe, it, expect } from 'vitest';
import { mapTransactionPaymentMethod } from '@/lib/historicalInvoice';

describe('mapTransactionPaymentMethod', () => {
  it.each([
    ['card', 'card'],
    ['visa', 'card'],
    ['mastercard', 'card'],
    ['Card', 'card'],
    ['VISA', 'card'],
    ['instapay', 'instapay'],
    ['InstaPay', 'instapay'],
    ['wallet', 'wallet'],
    ['Wallet', 'wallet'],
    ['transfer', 'bank_transfer'],
    ['bank transfer', 'bank_transfer'],
    ['Bank Transfer', 'bank_transfer'],
    ['bank', 'bank_transfer'],
    ['vodafone', 'vodafone_cash'],
    ['Vodafone Cash', 'vodafone_cash'],
    ['vodafone_cash', 'vodafone_cash'],
    ['cash', 'cash'],
    ['Cash', 'cash'],
    ['', 'cash'],
    [null, 'cash'],
    [undefined, 'cash'],
    ['something odd', 'other'],
    ['random', 'other'],
  ])('%s -> %s', (input, expected) => {
    expect(mapTransactionPaymentMethod(input as any)).toBe(expected);
  });
});
