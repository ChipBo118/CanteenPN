import { calculateComboPrice, calculateProductUnitPrice } from './pricing.rules';

describe('authoritative pricing rules', () => {
  it('adds base, variant and generic option adjustments using integer VND', () => {
    expect(calculateProductUnitPrice(25000, 5000, [3000, 0])).toBe(33000);
  });
  it('calculates the mandatory combo discount at exactly 10 percent', () => {
    expect(calculateComboPrice(60000)).toBe(54000);
    expect(calculateComboPrice(55555)).toBe(50000);
  });
  it('rejects non-integer authoritative money', () => {
    expect(() => calculateProductUnitPrice(25000.5, 0, [])).toThrow('integer VND');
  });
});

