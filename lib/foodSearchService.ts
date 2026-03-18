/**
 * foodSearchService.ts
 * Servicio de búsqueda de alimentos — TitanFit v2
 *
 * Estrategia de búsqueda:
 *   1. Open Food Facts (productos españoles/europeos, con Nutri-Score)
 *      → Si no hay resultados suficientes, busca sin filtro de país
 *   2. USDA FoodData Central (fallback para alimentos genéricos sin marca)
 *
 * APIs 100% gratuitas, sin autenticación.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FoodSearchResult {
    id: string;
    name: string;
    brand?: string;
    source: 'usda' | 'open_food_facts' | 'manual';
    per100g: {
        kcal: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber?: number;
        sugar?: number;
    };
    nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E';
    barcode?: string;
}

export interface MealLogItem {
    name: string;
    brand?: string;
    quantity_g: number;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    nutri_score?: string;
    barcode?: string;
    usda_fdc_id?: string;
    source: 'usda' | 'open_food_facts' | 'manual' | 'gemini';
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

const VALID_SCORES = ['A', 'B', 'C', 'D', 'E'] as const;

function parseOFFProduct(p: any): FoodSearchResult | null {
    const n = p.nutriments ?? {};
    const rawKcal = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
    const kcal = Math.round(rawKcal ?? 0);

    // Descarta si no tiene datos mínimos
    if (!kcal && !n['proteins_100g']) return null;

    const name = (p.product_name_es ?? p.product_name ?? '').trim();
    if (!name) return null;

    const score = p.nutriscore_grade?.toUpperCase();

    return {
        id: p.code ?? p._id ?? String(Math.random()),
        name,
        brand: p.brands?.split(',')[0].trim() || undefined,
        source: 'open_food_facts',
        barcode: p.code || undefined,
        per100g: {
            kcal,
            protein: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
            carbs: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
            fat: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
            fiber: n['fiber_100g'] != null ? Math.round(n['fiber_100g'] * 10) / 10 : undefined,
            sugar: n['sugars_100g'] != null ? Math.round(n['sugars_100g'] * 10) / 10 : undefined,
        },
        nutriScore: VALID_SCORES.includes(score as any) ? (score as 'A' | 'B' | 'C' | 'D' | 'E') : undefined,
    };
}

// ─── Open Food Facts — Búsqueda por texto ────────────────────────────────────

const OFF_SEARCH_FIELDS = 'fields=product_name,product_name_es,brands,nutriments,nutriscore_grade,code';
const OFF_TIMEOUT_MS = 4000;

async function searchOFF(
    query: string,
    countryFilter: string,
    pageSize = 15,
): Promise<FoodSearchResult[]> {
    const country = countryFilter ? `&countries_tags=${countryFilter}` : '';
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}${country}&${OFF_SEARCH_FIELDS}&sort_by=unique_scans_n`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);

    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.products ?? [])
            .map(parseOFFProduct)
            .filter((x: FoodSearchResult | null): x is FoodSearchResult => x !== null)
            .slice(0, pageSize);
    } catch {
        clearTimeout(timer);
        return [];
    }
}

/**
 * Búsqueda principal: lanza España y Global en PARALELO.
 * Fusiona resultados poniendo España primero.
 */
export async function searchFoodOpenFoodFacts(query: string, maxResults = 15): Promise<FoodSearchResult[]> {
    if (!query.trim()) return [];

    const [esResult, globalResult] = await Promise.allSettled([
        searchOFF(query, 'en:spain', maxResults),
        searchOFF(query, '',         maxResults),
    ]);

    const esItems    = esResult.status    === 'fulfilled' ? esResult.value    : [];
    const globalItems = globalResult.status === 'fulfilled' ? globalResult.value : [];

    // España primero, luego globales no duplicados
    const seen = new Set(esItems.map(r => r.id));
    const merged = [
        ...esItems,
        ...globalItems.filter(r => !seen.has(r.id)),
    ];
    return merged.slice(0, maxResults);
}

// ─── USDA FoodData Central — Fallback para genéricos ─────────────────────────

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = 'DEMO_KEY';

export async function searchFoodUSDA(query: string, maxResults = 8): Promise<FoodSearchResult[]> {
    if (!query.trim()) return [];

    try {
        const url = `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=${maxResults}&api_key=${USDA_API_KEY}&dataType=Foundation,SR%20Legacy`;
        const res = await fetch(url);
        if (!res.ok) return [];

        const data = await res.json();
        const foods: FoodSearchResult[] = [];

        for (const food of (data.foods ?? [])) {
            const nutrients = food.foodNutrients ?? [];
            const get = (name: string): number => {
                const n = nutrients.find((x: any) =>
                    x.nutrientName?.toLowerCase().includes(name.toLowerCase())
                );
                return Math.round((n?.value ?? 0) * 10) / 10;
            };

            const kcal = get('energy') || get('calories');
            if (!kcal) continue;

            foods.push({
                id: String(food.fdcId),
                name: food.description,
                brand: undefined,
                source: 'usda',
                per100g: {
                    kcal,
                    protein: get('protein'),
                    carbs: get('carbohydrate'),
                    fat: get('total lipid') || get('fat'),
                    fiber: get('fiber') || undefined,
                    sugar: get('sugar') || undefined,
                },
            });
        }
        return foods;
    } catch (error) {
        console.error('[foodSearch] USDA error:', error);
        return [];
    }
}

// ─── Búsqueda combinada (OFF primero + USDA fallback) ────────────────────────

/**
 * Función principal de búsqueda que usan los componentes.
 * Open Food Facts (España/Europa) → USDA si hay pocos resultados.
 */
export async function searchFood(query: string, maxResults = 15): Promise<FoodSearchResult[]> {
    if (!query.trim()) return [];

    const offResults = await searchFoodOpenFoodFacts(query, maxResults);

    if (offResults.length >= 5) return offResults;

    // Completar con USDA si Open Food Facts da pocos resultados
    try {
        const usdaResults = await searchFoodUSDA(query, maxResults - offResults.length);
        const seen = new Set(offResults.map(r => r.name.toLowerCase()));
        const uniqueUSDA = usdaResults.filter(r => !seen.has(r.name.toLowerCase()));
        return [...offResults, ...uniqueUSDA].slice(0, maxResults);
    } catch {
        return offResults;
    }
}

// ─── Open Food Facts — Búsqueda por código de barras ─────────────────────────

export async function searchFoodByBarcode(barcode: string): Promise<FoodSearchResult | null> {
    if (!barcode.trim()) return null;

    try {
        const url = `https://world.openfoodfacts.org/api/v3/product/${barcode}.json?fields=product_name,product_name_es,brands,nutriments,nutriscore_grade,code`;
        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        if (data.status !== 'success' || !data.product) return null;

        return parseOFFProduct({ ...data.product, code: barcode });
    } catch (error) {
        console.error('[foodSearch] Barcode error:', error);
        return null;
    }
}

// ─── Cálculo de macros por cantidad ───────────────────────────────────────────

export function calculateMacros(food: FoodSearchResult, quantity_g: number): MealLogItem {
    const ratio = quantity_g / 100;
    return {
        name: food.name,
        brand: food.brand,
        quantity_g,
        kcal: Math.round(food.per100g.kcal * ratio),
        protein_g: Math.round(food.per100g.protein * ratio * 10) / 10,
        carbs_g: Math.round(food.per100g.carbs * ratio * 10) / 10,
        fat_g: Math.round(food.per100g.fat * ratio * 10) / 10,
        fiber_g: food.per100g.fiber != null ? Math.round(food.per100g.fiber * ratio * 10) / 10 : undefined,
        sugar_g: food.per100g.sugar != null ? Math.round(food.per100g.sugar * ratio * 10) / 10 : undefined,
        nutri_score: food.nutriScore,
        barcode: food.barcode,
        usda_fdc_id: food.source === 'usda' ? food.id : undefined,
        source: food.source === 'usda' ? 'usda' : 'open_food_facts',
    };
}

// ─── Colores del Nutri-Score ───────────────────────────────────────────────────

export const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
    A: { bg: '#038141', text: '#ffffff' },
    B: { bg: '#85BB2F', text: '#ffffff' },
    C: { bg: '#FECB02', text: '#000000' },
    D: { bg: '#EE8100', text: '#ffffff' },
    E: { bg: '#E63312', text: '#ffffff' },
};
