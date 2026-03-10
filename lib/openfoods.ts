// ============================================================
// OPENFOODFACTS API CLIENT — Server-side only
// Used in /api/nutrition/search route
// ============================================================

import type { FoodItem } from '@/types';

const OFF_API = 'https://world.openfoodfacts.org/cgi/search.pl';
const TIMEOUT_MS = 5000;

interface OFFProduct {
  id: string;
  product_name?: string;
  product_name_en?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
}

interface OFFResponse {
  products?: OFFProduct[];
  count?: number;
}

function normalizeProduct(p: OFFProduct): FoodItem | null {
  const name = (p.product_name_en || p.product_name || '').trim();
  if (!name) return null;

  const n = p.nutriments ?? {};
  // energy-kcal_100g is direct, otherwise convert kJ to kcal
  const calories = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
  const protein = n.proteins_100g ?? 0;
  const carbs = n.carbohydrates_100g ?? 0;
  const fat = n.fat_100g ?? 0;
  const fiber = n.fiber_100g ?? undefined;

  // Skip products with clearly wrong data
  if (calories < 0 || calories > 1000) return null;
  if (protein < 0 || protein > 100) return null;
  if (carbs < 0 || carbs > 100) return null;
  if (fat < 0 || fat > 100) return null;

  return {
    id: `off_${p.id}`,
    name,
    calories_per_100g: Math.round(calories * 10) / 10,
    protein_per_100g: Math.round(protein * 10) / 10,
    carbs_per_100g: Math.round(carbs * 10) / 10,
    fat_per_100g: Math.round(fat * 10) / 10,
    fiber_per_100g: fiber !== undefined ? Math.round(fiber * 10) / 10 : undefined,
    serving_size_g: p.serving_quantity ?? undefined,
    serving_label: p.serving_size ?? undefined,
    source: 'openfoodfacts',
  };
}

/** Search OpenFoodFacts. Returns up to 15 normalized FoodItems. */
export async function searchOpenFoodFacts(query: string): Promise<FoodItem[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    json: '1',
    page_size: '20',
    fields: 'id,product_name,product_name_en,nutriments,serving_size,serving_quantity',
    // Prefer products with complete nutrition data
    sort_by: 'completeness',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${OFF_API}?${params}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FitnessOS/1.0 (https://fitness-os.app; contact@fitness-os.app)',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) return [];

    const data: OFFResponse = await res.json();
    const products = data.products ?? [];

    const results: FoodItem[] = [];
    for (const p of products) {
      const item = normalizeProduct(p);
      if (item) results.push(item);
      if (results.length >= 15) break;
    }

    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
