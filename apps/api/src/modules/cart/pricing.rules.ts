export function calculateProductUnitPrice(basePrice: number, variantAdjustment: number, optionAdjustments: number[]) {
  if (![basePrice, variantAdjustment, ...optionAdjustments].every(Number.isInteger)) throw new Error('Money values must be integer VND.');
  return basePrice + variantAdjustment + optionAdjustments.reduce((sum, value) => sum + value, 0);
}

export function calculateComboPrice(originalPrice: number, discountPercentage = 10) {
  if (!Number.isInteger(originalPrice) || !Number.isInteger(discountPercentage)) throw new Error('Combo values must be integers.');
  return Math.round(originalPrice * (100 - discountPercentage) / 100);
}

