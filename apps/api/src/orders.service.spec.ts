import {describe, expect, it} from 'vitest';
import {calculateDiscount} from './orders.service';

describe('order pricing rules', () => {
  it('calculates percent discount and respects its cap', () => {
    expect(calculateDiscount('PERCENT', 20, 15000, 100000)).toBe(15000);
  });

  it('never discounts below zero', () => {
    expect(calculateDiscount('FIXED', 50000, 0, 30000)).toBe(30000);
  });

  it('supports an uncapped percentage promotion', () => {
    expect(calculateDiscount('PERCENT', 10, 0, 75000)).toBe(7500);
  });
});
