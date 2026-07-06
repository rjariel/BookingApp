import { describe, expect, it } from 'vitest';
import { type AddonLine, calcBookingTotal, paymentStatusFor, rebookingDeposit } from './pricing';

describe('calcBookingTotal', () => {
  it('returns the package price when there are no add-ons', () => {
    expect(calcBookingTotal(1500)).toBe(1500);
  });

  it('adds priced add-on lines (unitPrice × qty)', () => {
    const addons: AddonLine[] = [
      { unitPrice: 200, qty: 2 }, // extra prints
      { unitPrice: 350, qty: 1 }, // 5R frame
    ];
    expect(calcBookingTotal(1500, addons)).toBe(2250);
  });

  it('rounds to 2 decimal places', () => {
    expect(calcBookingTotal(0.1, [{ unitPrice: 0.2, qty: 1 }])).toBe(0.3);
  });
});

describe('paymentStatusFor', () => {
  it('is unpaid at zero', () => {
    expect(paymentStatusFor(2250, 0)).toBe('unpaid');
  });

  it('is partial below the total', () => {
    expect(paymentStatusFor(2250, 1000)).toBe('partial');
  });

  it('is paid at or above the total', () => {
    expect(paymentStatusFor(2250, 2250)).toBe('paid');
    expect(paymentStatusFor(2250, 3000)).toBe('paid');
  });
});

describe('rebookingDeposit', () => {
  it('is half the original package price', () => {
    expect(rebookingDeposit(2000)).toBe(1000);
  });

  it('rounds to 2 decimal places', () => {
    expect(rebookingDeposit(999)).toBe(499.5);
  });
});
