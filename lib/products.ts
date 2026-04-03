// lib/products.ts

export interface ProductMapping {
  sheetName: string;
  slug: string;
  url: string;
  badge: string;
}

// Map sheet product names to their website URLs and category badges
export const PRODUCT_MAP: ProductMapping[] = [
  // LS Pro variants
  { sheetName: "LS Pro", slug: "ls-pro", url: "https://timberprocoatingsusa.com/products/log-siding-classic-semi-solid-series", badge: "Color-series" },
  { sheetName: "LS PRO (Color Series)", slug: "ls-pro-color", url: "https://timberprocoatingsusa.com/products/log-siding-classic-semi-solid-series", badge: "Color-series" },
  { sheetName: "LS Pro (Color Series)", slug: "ls-pro-color", url: "https://timberprocoatingsusa.com/products/log-siding-classic-semi-solid-series", badge: "Color-series" },
  { sheetName: "LS Pro (Clear)", slug: "ls-pro-clear", url: "https://timberprocoatingsusa.com/products/log-siding-classic-microtint-series", badge: "Clear sealer" },
  { sheetName: "Clear LS Pro", slug: "clear-ls-pro", url: "https://timberprocoatingsusa.com/products/log-siding-classic-microtint-series", badge: "Clear sealer" },

  // LSS Formula variants
  { sheetName: "LSS Formula", slug: "lss-formula", url: "https://timberprocoatingsusa.com/products/log-siding-smooth-semi-solid-series", badge: "Smooth wood" },
  { sheetName: "LSS (Color Series)", slug: "lss-color", url: "https://timberprocoatingsusa.com/products/log-siding-smooth-semi-solid-series", badge: "Color-series" },
  { sheetName: "LSS (Clear)", slug: "lss-clear", url: "https://timberprocoatingsusa.com/products/deck-fence-microtint-series-copy", badge: "Clear sealer" },
  { sheetName: "LLS Formula", slug: "lls-formula", url: "https://timberprocoatingsusa.com/products/log-siding-smooth-semi-solid-series", badge: "Smooth wood" },

  // Specialty products
  { sheetName: "Crystal Urethane", slug: "crystal-urethane", url: "https://timberprocoatingsusa.com/products/crystal-urethane", badge: "Interior finish" },
  { sheetName: "Internal Wood Stabilizer", slug: "internal-wood-stabilizer", url: "https://timberprocoatingsusa.com/products/internal-wood-stabilizer-1", badge: "Wood protection" },
  { sheetName: "Internal Concrete Stabilizer", slug: "internal-concrete-stabilizer", url: "https://timberprocoatingsusa.com/products/internal-concrete-stabilizer", badge: "Concrete sealer" },
  { sheetName: "Internal Concrete Sealer", slug: "internal-concrete-sealer", url: "https://timberprocoatingsusa.com/products/internal-concrete-stabilizer", badge: "Concrete sealer" },
  { sheetName: "Paver Stain", slug: "paver-stain", url: "https://timberprocoatingsusa.com/products/paver-stain", badge: "Color enhancement" },

  // Fire retardants
  { sheetName: "Ember Guard", slug: "ember-guard", url: "https://timberprocoatingsusa.com/products/ember-guard", badge: "Fire-retardant" },
  { sheetName: "Ember Guard Pro", slug: "ember-guard-pro", url: "https://timberprocoatingsusa.com/products/ember-guard-pro-class-a-fire-retardant", badge: "Fire-retardant" },

  // Cleaners / Strippers
  { sheetName: "Clean and Brite", slug: "clean-and-brite", url: "https://timberprocoatingsusa.com/products/clean-brite", badge: "One-step cleanser" },
  { sheetName: "Clean & Brite", slug: "clean-and-brite", url: "https://timberprocoatingsusa.com/products/clean-brite", badge: "One-step cleanser" },
  { sheetName: "Strip & Brite", slug: "strip-and-brite", url: "https://timberprocoatingsusa.com/products/strip-brite-1-gallon", badge: "Wood stripper" },
  { sheetName: "Strip and Brite", slug: "strip-and-brite", url: "https://timberprocoatingsusa.com/products/strip-brite-1-gallon", badge: "Wood stripper" },

  // Deck & Fence
  { sheetName: "Deck & Fence", slug: "deck-and-fence", url: "https://timberprocoatingsusa.com/products/deck-fence-formula", badge: "Outdoor protection" },
];

export function findProduct(sheetName: string): ProductMapping | null {
  return PRODUCT_MAP.find((p) => p.sheetName === sheetName) || null;
}
