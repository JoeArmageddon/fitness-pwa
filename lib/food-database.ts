// ============================================================
// INDIA-FOCUSED FOOD DATABASE
// Static seed data — no API required
// ============================================================

import type { FoodItem } from '@/types';

export const FOOD_DATABASE: FoodItem[] = [
  // ── Breads & Grains ──────────────────────────────────────
  { id: 'roti', name: 'Roti / Chapati', name_hindi: 'रोटी', calories_per_100g: 297, protein_per_100g: 9.9, carbs_per_100g: 60.8, fat_per_100g: 3.7, fiber_per_100g: 2.7, serving_size_g: 30, serving_label: '1 roti' },
  { id: 'paratha', name: 'Plain Paratha', name_hindi: 'परांठा', calories_per_100g: 326, protein_per_100g: 8.3, carbs_per_100g: 52.8, fat_per_100g: 9.8, fiber_per_100g: 2.1, serving_size_g: 60, serving_label: '1 paratha' },
  { id: 'aloo_paratha', name: 'Aloo Paratha', name_hindi: 'आलू परांठा', calories_per_100g: 296, protein_per_100g: 7.1, carbs_per_100g: 43.9, fat_per_100g: 10.4, fiber_per_100g: 3.2, serving_size_g: 120, serving_label: '1 paratha' },
  { id: 'rice_cooked', name: 'Rice (Cooked)', name_hindi: 'चावल', calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3, fiber_per_100g: 0.4, serving_size_g: 150, serving_label: '1 cup cooked' },
  { id: 'brown_rice', name: 'Brown Rice (Cooked)', calories_per_100g: 112, protein_per_100g: 2.6, carbs_per_100g: 23.5, fat_per_100g: 0.9, fiber_per_100g: 1.8, serving_size_g: 150, serving_label: '1 cup cooked' },
  { id: 'oats', name: 'Oats (Rolled)', calories_per_100g: 389, protein_per_100g: 17, carbs_per_100g: 66, fat_per_100g: 7, fiber_per_100g: 10.6, serving_size_g: 80, serving_label: '1 cup dry' },
  { id: 'poha', name: 'Poha (Flattened Rice)', name_hindi: 'पोहा', calories_per_100g: 110, protein_per_100g: 2.4, carbs_per_100g: 23, fat_per_100g: 0.9, serving_size_g: 150, serving_label: '1 plate' },
  { id: 'upma', name: 'Upma', calories_per_100g: 135, protein_per_100g: 3, carbs_per_100g: 22, fat_per_100g: 4, serving_size_g: 200, serving_label: '1 plate' },
  { id: 'idli', name: 'Idli', name_hindi: 'इडली', calories_per_100g: 39, protein_per_100g: 2, carbs_per_100g: 7.9, fat_per_100g: 0.2, fiber_per_100g: 0.5, serving_size_g: 50, serving_label: '1 idli' },
  { id: 'dosa', name: 'Dosa (Plain)', name_hindi: 'डोसा', calories_per_100g: 168, protein_per_100g: 3.7, carbs_per_100g: 25, fat_per_100g: 5.9, serving_size_g: 100, serving_label: '1 dosa' },
  { id: 'bread_white', name: 'White Bread', calories_per_100g: 265, protein_per_100g: 9, carbs_per_100g: 49, fat_per_100g: 3.2, serving_size_g: 30, serving_label: '1 slice' },
  { id: 'bread_multigrain', name: 'Multigrain Bread', calories_per_100g: 240, protein_per_100g: 10, carbs_per_100g: 42, fat_per_100g: 4, fiber_per_100g: 5, serving_size_g: 30, serving_label: '1 slice' },

  // ── Lentils & Legumes ────────────────────────────────────
  { id: 'dal_toor', name: 'Toor Dal (Cooked)', name_hindi: 'तूर दाल', calories_per_100g: 116, protein_per_100g: 7, carbs_per_100g: 20, fat_per_100g: 0.4, fiber_per_100g: 4, serving_size_g: 150, serving_label: '1 bowl' },
  { id: 'dal_moong', name: 'Moong Dal (Cooked)', name_hindi: 'मूंग दाल', calories_per_100g: 104, protein_per_100g: 7.5, carbs_per_100g: 17, fat_per_100g: 0.4, fiber_per_100g: 5, serving_size_g: 150, serving_label: '1 bowl' },
  { id: 'dal_chana', name: 'Chana Dal (Cooked)', name_hindi: 'चना दाल', calories_per_100g: 127, protein_per_100g: 8.7, carbs_per_100g: 20, fat_per_100g: 1, fiber_per_100g: 5, serving_size_g: 150, serving_label: '1 bowl' },
  { id: 'dal_masoor', name: 'Masoor Dal (Cooked)', name_hindi: 'मसूर दाल', calories_per_100g: 116, protein_per_100g: 9, carbs_per_100g: 20, fat_per_100g: 0.4, fiber_per_100g: 4, serving_size_g: 150, serving_label: '1 bowl' },
  { id: 'dal_fry', name: 'Dal Fry', name_hindi: 'दाल फ्राई', calories_per_100g: 130, protein_per_100g: 7, carbs_per_100g: 18, fat_per_100g: 3.5, serving_size_g: 200, serving_label: '1 bowl' },
  { id: 'rajma', name: 'Rajma (Kidney Beans)', name_hindi: 'राजमा', calories_per_100g: 337, protein_per_100g: 22, carbs_per_100g: 61, fat_per_100g: 1.4, fiber_per_100g: 15, serving_size_g: 150, serving_label: '1 bowl' },
  { id: 'chole', name: 'Chole / Chickpeas (Cooked)', name_hindi: 'छोले', calories_per_100g: 164, protein_per_100g: 8.9, carbs_per_100g: 27, fat_per_100g: 2.6, fiber_per_100g: 7.6, serving_size_g: 150, serving_label: '1 bowl' },
  { id: 'sambar', name: 'Sambar', name_hindi: 'सांभर', calories_per_100g: 44, protein_per_100g: 2.5, carbs_per_100g: 7, fat_per_100g: 1.2, serving_size_g: 200, serving_label: '1 bowl' },

  // ── Vegetables ───────────────────────────────────────────
  { id: 'palak', name: 'Palak (Spinach)', name_hindi: 'पालक', calories_per_100g: 23, protein_per_100g: 2.9, carbs_per_100g: 3.6, fat_per_100g: 0.4, fiber_per_100g: 2.2, serving_size_g: 100 },
  { id: 'paneer', name: 'Paneer', name_hindi: 'पनीर', calories_per_100g: 265, protein_per_100g: 18, carbs_per_100g: 3.4, fat_per_100g: 20, serving_size_g: 100 },
  { id: 'palak_paneer', name: 'Palak Paneer', name_hindi: 'पालक पनीर', calories_per_100g: 155, protein_per_100g: 10, carbs_per_100g: 8, fat_per_100g: 10, serving_size_g: 200, serving_label: '1 bowl' },
  { id: 'aloo', name: 'Potato (Boiled)', name_hindi: 'आलू', calories_per_100g: 87, protein_per_100g: 1.9, carbs_per_100g: 20, fat_per_100g: 0.1, fiber_per_100g: 1.8, serving_size_g: 100 },

  // ── Dairy & Eggs ─────────────────────────────────────────
  { id: 'egg_whole', name: 'Whole Egg', calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11, serving_size_g: 50, serving_label: '1 egg' },
  { id: 'egg_white', name: 'Egg White', calories_per_100g: 52, protein_per_100g: 11, carbs_per_100g: 0.7, fat_per_100g: 0.2, serving_size_g: 33, serving_label: '1 egg white' },
  { id: 'milk_cow', name: 'Cow Milk', name_hindi: 'दूध', calories_per_100g: 42, protein_per_100g: 3.4, carbs_per_100g: 5, fat_per_100g: 1, serving_size_g: 240, serving_label: '1 glass' },
  { id: 'milk_buffalo', name: 'Buffalo Milk', calories_per_100g: 97, protein_per_100g: 4.5, carbs_per_100g: 5, fat_per_100g: 6.9, serving_size_g: 240, serving_label: '1 glass' },
  { id: 'curd', name: 'Curd / Dahi', name_hindi: 'दही', calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fat_per_100g: 4.3, serving_size_g: 200, serving_label: '1 bowl' },
  { id: 'whey_protein', name: 'Whey Protein Powder', calories_per_100g: 400, protein_per_100g: 80, carbs_per_100g: 7, fat_per_100g: 5, serving_size_g: 30, serving_label: '1 scoop' },

  // ── Non-Veg ──────────────────────────────────────────────
  { id: 'chicken_breast', name: 'Chicken Breast (Cooked)', calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, serving_size_g: 150, serving_label: '1 piece' },
  { id: 'chicken_whole', name: 'Chicken (with skin, cooked)', calories_per_100g: 239, protein_per_100g: 27, carbs_per_100g: 0, fat_per_100g: 14, serving_size_g: 150 },
  { id: 'fish_rohu', name: 'Rohu Fish (Cooked)', name_hindi: 'रोहू', calories_per_100g: 97, protein_per_100g: 16, carbs_per_100g: 0, fat_per_100g: 3.4, serving_size_g: 150 },
  { id: 'tuna_canned', name: 'Tuna (Canned in water)', calories_per_100g: 109, protein_per_100g: 25, carbs_per_100g: 0, fat_per_100g: 1, serving_size_g: 100 },

  // ── Nuts & Fats ──────────────────────────────────────────
  { id: 'peanut_butter', name: 'Peanut Butter', calories_per_100g: 588, protein_per_100g: 25, carbs_per_100g: 20, fat_per_100g: 50, serving_size_g: 32, serving_label: '2 tbsp' },
  { id: 'almonds', name: 'Almonds', name_hindi: 'बादाम', calories_per_100g: 579, protein_per_100g: 21, carbs_per_100g: 22, fat_per_100g: 50, fiber_per_100g: 12.5, serving_size_g: 28, serving_label: '1 oz (23 almonds)' },
  { id: 'walnuts', name: 'Walnuts', name_hindi: 'अखरोट', calories_per_100g: 654, protein_per_100g: 15, carbs_per_100g: 14, fat_per_100g: 65, fiber_per_100g: 6.7, serving_size_g: 28, serving_label: '1 oz' },
  { id: 'ghee', name: 'Ghee', name_hindi: 'घी', calories_per_100g: 900, protein_per_100g: 0.3, carbs_per_100g: 0, fat_per_100g: 99.5, serving_size_g: 10, serving_label: '1 tsp' },
  { id: 'olive_oil', name: 'Olive Oil', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, serving_size_g: 14, serving_label: '1 tbsp' },

  // ── Fruits ───────────────────────────────────────────────
  { id: 'banana', name: 'Banana', name_hindi: 'केला', calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3, fiber_per_100g: 2.6, serving_size_g: 118, serving_label: '1 medium' },
  { id: 'apple', name: 'Apple', name_hindi: 'सेब', calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fat_per_100g: 0.2, fiber_per_100g: 2.4, serving_size_g: 182, serving_label: '1 medium' },
  { id: 'mango', name: 'Mango', name_hindi: 'आम', calories_per_100g: 60, protein_per_100g: 0.8, carbs_per_100g: 15, fat_per_100g: 0.4, fiber_per_100g: 1.6, serving_size_g: 200, serving_label: '1 medium' },
  { id: 'guava', name: 'Guava', name_hindi: 'अमरूद', calories_per_100g: 68, protein_per_100g: 2.6, carbs_per_100g: 14, fat_per_100g: 1, fiber_per_100g: 5.4, serving_size_g: 100 },
];

// Search function for food database
export function searchFoods(query: string, limit = 10): FoodItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return FOOD_DATABASE.slice(0, limit);
  
  return FOOD_DATABASE
    .filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.name_hindi?.includes(q) ||
        f.id.includes(q)
    )
    .slice(0, limit);
}

// Get food by ID
export function getFoodById(id: string): FoodItem | undefined {
  return FOOD_DATABASE.find((f) => f.id === id);
}
