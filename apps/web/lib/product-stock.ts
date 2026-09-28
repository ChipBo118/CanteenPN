export type StockRecipe = {
  ingredients: {
    quantity: string | number;
    ingredient: {
      currentQuantity: string | number;
      reservedQuantity: string | number;
    };
  }[];
};

export function estimateProductStock(recipes: StockRecipe[]) {
  const recipeStocks = recipes.flatMap(recipe => {
    if (!recipe.ingredients.length) return [];
    const portions = recipe.ingredients.map(line => {
      const available = Number(line.ingredient.currentQuantity) - Number(line.ingredient.reservedQuantity);
      const required = Number(line.quantity);
      return required > 0 ? Math.max(0, Math.floor(available / required)) : 0;
    });
    return [Math.min(...portions)];
  });

  return recipeStocks.length ? Math.max(...recipeStocks) : null;
}

export function productStockLabel(recipes: StockRecipe[]) {
  const stock = estimateProductStock(recipes);
  return stock === null ? 'Chưa định lượng' : `${stock} suất`;
}
