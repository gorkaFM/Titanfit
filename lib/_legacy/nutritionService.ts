import { ActivityLevel, NutritionGoal, UserNutritionProfile } from '@/types/nutrition';
import { supabase } from './supabase';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface ProductScanResult {
    barcode: string;
    name: string;
    ingredients: string;
    nutriments: any;
    image_url?: string;
}

export interface NutritionAdvice {
    suitable: boolean;
    score: number;
    explanation: string;
    macros_per_100g: { protein: number; carbs: number; fat: number; kcal: number };
}

// ─────────────────────────────────────────────────────────────
// Helper: llamada genérica a Gemini con retry + timeout
// thinkingBudget: 0 → desactiva thinking tokens (ahorro ~80% coste)
// ─────────────────────────────────────────────────────────────
const MAX_RETRIES = 3;

async function geminiCall(prompt: string, timeoutMs = 45000): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.9,
                        topP: 0.95,
                        thinkingConfig: { thinkingBudget: 0 },  // ← AHORRO: sin thinking tokens
                    }
                })
            });
            clearTimeout(timer);
            const json = await res.json();

            if (res.status === 429 || res.status >= 500) {
                const retryDelay = attempt * 3000;
                console.warn(`[Gemini] HTTP ${res.status} intento ${attempt}/${MAX_RETRIES}. Retry en ${retryDelay / 1000}s...`);
                lastError = new Error(json.error?.message || `HTTP ${res.status}`);
                await new Promise(r => setTimeout(r, retryDelay));
                continue;
            }

            if (!res.ok || json.error) {
                throw new Error(json.error?.message || `HTTP ${res.status}`);
            }

            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Gemini devolvió respuesta vacía');
            return text;
        } catch (e: any) {
            clearTimeout(timer);
            if (e.name === 'AbortError') {
                lastError = new Error(`Timeout (intento ${attempt}/${MAX_RETRIES}): la IA tardó más de ${timeoutMs / 1000}s`);
                console.warn(`[Gemini] ${lastError.message}. Reintentando...`);
                continue;
            }
            lastError = e;
            if (attempt < MAX_RETRIES && (e.message?.includes('fetch') || e.message?.includes('network'))) {
                const retryDelay = attempt * 2000;
                console.warn(`[Gemini] Error red intento ${attempt}: ${e.message}. Retry en ${retryDelay / 1000}s...`);
                await new Promise(r => setTimeout(r, retryDelay));
                continue;
            }
            throw e;
        }
    }
    throw lastError || new Error('Gemini: máximo de reintentos alcanzado');
}

// ─────────────────────────────────────────────────────────────
// Cálculo TDEE real con Mifflin-St Jeor
// ─────────────────────────────────────────────────────────────
function calcTDEE(sex: 'male' | 'female', age: number, heightCm: number, weightKg: number, activityLevel: ActivityLevel): number {
    // Mifflin-St Jeor BMR
    const bmr = sex === 'male'
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    const multipliers: Record<ActivityLevel, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
    };
    return Math.round(bmr * (multipliers[activityLevel] ?? 1.55));
}

export const nutritionService = {

    // ───── PERFIL ─────
    async getNutritionProfile(userId: string): Promise<UserNutritionProfile | null> {
        const { data, error } = await supabase
            .from('user_nutrition_profiles').select('*').eq('id', userId).single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        const profile = data as UserNutritionProfile;

        // Auto-migración: si el perfil no tiene los campos de cycling, recalcular
        if (!profile.target_calories_training || !profile.target_calories_rest || !profile.weight_kg) {
            // Inferir peso si no existe (estimar desde proteínas: protein ≈ weight * 2.0)
            const estimatedWeight = profile.weight_kg || Math.round(profile.target_protein / 2.0);
            const newMacros = this.calculateMacros(
                estimatedWeight,
                profile.goal,
                profile.sex,
                profile.age,
                profile.height_cm,
                profile.activity_level
            );
            // Actualizar en la DB
            const updatedFields = {
                weight_kg: estimatedWeight,
                target_calories: newMacros.target_calories,
                target_calories_training: newMacros.target_calories_training,
                target_calories_rest: newMacros.target_calories_rest,
                target_protein: newMacros.target_protein,
                target_carbs: newMacros.target_carbs,
                target_fats: newMacros.target_fats,
            };
            await supabase.from('user_nutrition_profiles').update(updatedFields).eq('id', userId);
            Object.assign(profile, updatedFields);
            console.log('[NutriService] Auto-migrated profile with cycling targets:', updatedFields);
        }

        return profile;
    },

    async saveNutritionProfile(profile: UserNutritionProfile): Promise<UserNutritionProfile> {
        const { data, error } = await supabase
            .from('user_nutrition_profiles')
            .upsert(profile, { onConflict: 'id' })
            .select().single();
        if (error) throw error;
        return data as UserNutritionProfile;
    },

    async deleteNutritionProfile(userId: string): Promise<void> {
        const { error } = await supabase
            .from('user_nutrition_profiles').delete().eq('id', userId);
        if (error) throw error;
    },

    // ───── CÁLCULO MACROS CON CALORIE CYCLING (ISSN) ─────
    calculateMacros(
        weightKg: number,
        goal: NutritionGoal,
        sex: 'male' | 'female',
        age: number,
        heightCm: number,
        activityLevel: ActivityLevel
    ): Pick<UserNutritionProfile, 'target_calories' | 'target_calories_training' | 'target_calories_rest' | 'target_protein' | 'target_carbs' | 'target_fats' | 'estimated_weeks'> {
        const tdee = calcTDEE(sex, age, heightCm, weightKg, activityLevel);

        // ── Calorie cycling según objetivo ──
        let calTraining: number, calRest: number;
        if (goal === 'Pérdida de Peso') {
            calTraining = Math.max(1400, Math.round(tdee * 0.85)); // -15%
            calRest = Math.max(1200, Math.round(tdee * 0.75));     // -25%
        } else if (goal === 'Ganancia Muscular') {
            calTraining = Math.round(tdee * 1.10); // +10%
            calRest = Math.round(tdee * 1.0);      // mantenimiento
        } else {
            // Recomposición: mantenimiento en training, -15% en descanso
            calTraining = tdee;
            calRest = Math.round(tdee * 0.85);
        }

        // Media ponderada como referencia general (asumiendo 4 training + 3 rest)
        const calAvg = Math.round((calTraining * 4 + calRest * 3) / 7);

        // ── Macros (basados en media) ──
        // Recomp/deficit → proteína más alta (2.2g/kg) para preservar músculo
        const proteinPerKg = goal === 'Ganancia Muscular' ? 2.0 : 2.2;
        const protein = Math.round(weightKg * proteinPerKg);
        const fats = Math.round(weightKg * 0.9);
        const carbs = Math.max(0, Math.round((calAvg - protein * 4 - fats * 9) / 4));

        // Semanas estimadas
        let estimated_weeks: number | null = null;
        if (goal === 'Pérdida de Peso') estimated_weeks = 16;
        else if (goal === 'Ganancia Muscular') estimated_weeks = 12;
        else estimated_weeks = 20; // recomp es más lento

        return {
            target_calories: calAvg,
            target_calories_training: calTraining,
            target_calories_rest: calRest,
            target_protein: protein,
            target_carbs: carbs,
            target_fats: fats,
            estimated_weeks
        };
    },

    // ───── PLANES DIARIOS ─────
    async getWeeklyPlans(userId: string, weekStart: string) {
        const dates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart + 'T12:00:00'); // noon to avoid TZ issues
            d.setDate(d.getDate() + i);
            return d.toISOString().split('T')[0];
        });
        const { data } = await supabase
            .from('nutrition_daily_plans')
            .select('*, nutrition_meals(*)')
            .eq('user_id', userId)
            .in('date', dates);
        return data ?? [];
    },

    async createDailyPlan(userId: string, date: string, profile: UserNutritionProfile, isTrainingDay = false) {
        const kcal = isTrainingDay ? (profile.target_calories_training ?? profile.target_calories) : (profile.target_calories_rest ?? profile.target_calories);
        // Ajustar macros proporcionalmente al target del día
        const ratio = kcal / (profile.target_calories || 1);
        const { data, error } = await supabase
            .from('nutrition_daily_plans')
            .insert({
                user_id: userId, date,
                is_training_day: isTrainingDay,
                target_calories: kcal,
                target_protein: profile.target_protein, // proteína se mantiene fija
                target_carbs: Math.round(profile.target_carbs * ratio),
                target_fats: profile.target_fats,       // grasas fijas
                consumed_calories: 0, consumed_protein: 0, consumed_carbs: 0, consumed_fats: 0,
            }).select().single();
        if (error) throw error;
        return data;
    },

    async upsertDailyPlan(userId: string, date: string, profile: UserNutritionProfile, isTrainingDay = false) {
        const { data: existing } = await supabase
            .from('nutrition_daily_plans')
            .select('*').eq('user_id', userId).eq('date', date).single();
        if (existing) return existing;
        return this.createDailyPlan(userId, date, profile, isTrainingDay);
    },

    // ───── TOGGLE DÍA ENTRENAMIENTO ─────
    async toggleTrainingDay(planId: string, isTraining: boolean, profile: UserNutritionProfile) {
        const kcal = isTraining ? (profile.target_calories_training ?? profile.target_calories) : (profile.target_calories_rest ?? profile.target_calories);
        const ratio = kcal / (profile.target_calories || 1);
        const { data, error } = await supabase
            .from('nutrition_daily_plans')
            .update({
                is_training_day: isTraining,
                target_calories: kcal,
                target_carbs: Math.round(profile.target_carbs * ratio),
            })
            .eq('id', planId).select().single();
        if (error) throw error;
        return data;
    },

    // ───── DUPLICAR COMIDA A OTRO DÍA ─────
    async duplicateMeal(meal: { meal_type: string; meal_name: string; recipe_text: string | null; calories: number; protein: number; carbs: number; fats: number }, targetPlanId: string) {
        // Borrar comida existente del mismo tipo en el plan destino
        await supabase.from('nutrition_meals').delete().eq('plan_id', targetPlanId).eq('meal_type', meal.meal_type);
        // Insertar copia
        const { data, error } = await supabase.from('nutrition_meals').insert({
            plan_id: targetPlanId,
            meal_type: meal.meal_type,
            meal_name: meal.meal_name,
            recipe_text: meal.recipe_text,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fats: meal.fats,
            is_locked: false,
            is_completed: false,
        }).select().single();
        if (error) throw error;
        return data;
    },

    // ───── LISTA DE LA COMPRA VÍA IA ─────
    async generateShoppingList(allMeals: Array<{ meal_name: string; recipe_text: string | null }>): Promise<Array<{ category: string; items: string[] }>> {
        const recipes = allMeals.map(m => `- ${m.meal_name}: ${m.recipe_text || 'sin receta'}`).join('\n');
        const prompt = [
            'Eres un asistente de cocina. A partir de estas recetas de la semana, genera una LISTA DE LA COMPRA organizada por categorías.',
            '',
            'RECETAS DE LA SEMANA:',
            recipes,
            '',
            'REGLAS:',
            '1. Agrupa los ingredientes por categoría: Proteínas, Lácteos y Huevos, Frutas y Verduras, Cereales y Legumbres, Condimentos y Aceites, Otros.',
            '2. Suma las cantidades si un ingrediente aparece en varias recetas.',
            '3. Indica cantidad aproximada en gramos o unidades.',
            '4. NO incluyas sal, pimienta ni agua.',
            '5. Responde SOLO con JSON array:',
            '[{"category":"Proteínas","items":["Pechuga de pollo 1.5kg","Atún en lata 3 uds"]},{"category":"Lácteos","items":[...]}]'
        ].join('\n');

        const text = await geminiCall(prompt, 60000);
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('Formato inválido');
        return parsed;
    },

    async saveMeals(planId: string, meals: Array<{
        meal_type: string; meal_name: string; recipe_text: string;
        calories: number; protein: number; carbs: number; fats: number;
    }>) {
        const rows = meals.map(m => ({ ...m, plan_id: planId, is_locked: false, is_completed: false }));
        const { data, error } = await supabase.from('nutrition_meals').insert(rows).select();
        if (error) throw error;
        return data;
    },

    async toggleMealLock(mealId: string, isLocked: boolean) {
        const { error } = await supabase.from('nutrition_meals').update({ is_locked: isLocked }).eq('id', mealId);
        if (error) throw error;
    },

    async toggleMealComplete(mealId: string, isCompleted: boolean) {
        const { error } = await supabase.from('nutrition_meals').update({ is_completed: isCompleted }).eq('id', mealId);
        if (error) throw error;
    },

    // ───── MOTOR IA ─────────────────────────────────────
    // Genera ONE day's meals. Returns array of meal objects.
    // previousMeals: nombres de platos ya generados en otros días (para evitar repeticiones cross-day)
    async _generateOneDayMeals(
        profile: UserNutritionProfile,
        dayLabel: string,
        dayIndex: number = 0,
        previousMeals: string[] = []
    ): Promise<Array<{
        meal_type: string; meal_name: string; recipe_text: string;
        calories: number; protein: number; carbs: number; fats: number;
    }>> {
        const mealTypes = this._getMealTypes(profile.meals_per_day ?? 3);
        // Semilla ÚNICA por día: combinamos timestamp, dayIndex y random para máxima entropía
        const seed = (Date.now() + dayIndex * 17389 + Math.floor(Math.random() * 99999)) % 999999;

        const previousMealsBlock = previousMeals.length > 0
            ? [
                '',
                '⛔ PLATOS YA GENERADOS EN OTROS DÍAS (PROHIBIDO REPETIRLOS O USAR NOMBRES SIMILARES):',
                ...previousMeals.map((m, i) => `  ${i + 1}. ${m}`),
                ''
            ].join('\n')
            : '';

        const prompt = [
            'Eres nutricionista deportivo certificado ISSN. SOLICITUD ÚNICA #' + seed + '.',
            'Genera un menú COMPLETAMENTE NUEVO y ORIGINAL para el ' + dayLabel + '.',
            '',
            'DATOS DEL ATLETA:',
            '- Objetivo: ' + profile.goal,
            '- Sexo: ' + (profile.sex === 'male' ? 'Hombre' : 'Mujer') + ', Edad: ' + (profile.age ?? 'N/A') + ', Altura: ' + (profile.height_cm ?? 'N/A') + 'cm',
            '- Kcal/día: ' + profile.target_calories + ' | Proteínas: ' + profile.target_protein + 'g | Carbos: ' + profile.target_carbs + 'g | Grasas: ' + profile.target_fats + 'g',
            '- Comidas: ' + mealTypes.join(', ') + ' (' + mealTypes.length + ' en total)',
            '- Ayuno intermitente: ' + (profile.intermittent_fasting ? 'SÍ (primera comida a mediodía)' : 'No'),
            '- Días entrenamiento/sem: ' + (profile.training_days ?? 3),
            '',
            'PREFERENCIAS DEL USUARIO (OBLIGATORIO CUMPLIRLAS):',
            '★ ALIMENTOS FAVORITOS — dales prioridad: ' + (profile.loved_foods || 'ninguno especificado'),
            '✗ ALIMENTOS PROHIBIDOS — NUNCA los uses en ningún ingrediente: ' + (profile.disliked_foods || 'ninguno'),
            '- Contexto/hábitos: ' + (profile.habits || 'sin especificar'),
            previousMealsBlock,
            'REGLAS ESTRICTAS DE GENERACIÓN:',
            '1. La SUMA total de macros del día DEBE cuadrar con ' + profile.target_calories + ' kcal (±50 kcal de tolerancia).',
            '2. Los alimentos favoritos DEBEN aparecer en alguno de los platos.',
            '3. JAMÁS incluyas ningún alimento prohibido en ningún ingrediente ni receta.',
            '4. Sé CREATIVO: nada de platos genéricos como "pollo a la plancha" o "arroz hervido". Usa nombres propios, salsas, técnicas de cocina.',
            '5. CADA PLATO debe ser DIFERENTE en ingredientes principales a los listados arriba como ya generados.',
            '6. Usa ingredientes disponibles en supermercados españoles (Mercadona, Lidl, Carrefour).',
            '7. Recetas rápidas: ≤ 30 minutos de preparación.',
            '8. Varía las fuentes de proteína entre platos (pollo, huevos, atún, ternera, legumbres, lácteos...).',
            '',
            'Responde SOLO con un JSON array de ' + mealTypes.length + ' objetos. Sin texto extra, sin markdown, sin explicaciones:',
            JSON.stringify(mealTypes.map(mt => ({
                meal_type: mt,
                meal_name: 'NOMBRE CREATIVO Y ESPECÍFICO DEL PLATO',
                recipe_text: 'Ingredientes con cantidades exactas (en gramos) + 3 pasos de preparación',
                calories: Math.round(profile.target_calories / mealTypes.length),
                protein: Math.round(profile.target_protein / mealTypes.length),
                carbs: Math.round(profile.target_carbs / mealTypes.length),
                fats: Math.round(profile.target_fats / mealTypes.length)
            })), null, 2)
        ].join('\n');

        const text = await geminiCall(prompt, 90000);
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('Gemini no devolvió un array');
        // Sanitizar: Gemini a veces devuelve decimales ("124.2") que PostgreSQL rechaza en columnas INT
        return parsed.map((m: any) => ({
            meal_type: String(m.meal_type || 'Comida'),
            meal_name: String(m.meal_name || 'Plato sin nombre'),
            recipe_text: String(m.recipe_text || 'Sin receta'),
            calories: Math.round(Number(m.calories) || 0),
            protein: Math.round(Number(m.protein) || 0),
            carbs: Math.round(Number(m.carbs) || 0),
            fats: Math.round(Number(m.fats) || 0),
        }));
    },

    // Genera los 7 días SECUENCIALMENTE, acumulando platos previos para evitar repetición
    async generateWeeklyMeals(profile: UserNutritionProfile): Promise<Array<{
        day: number; meal_type: string; meal_name: string; recipe_text: string;
        calories: number; protein: number; carbs: number; fats: number;
    }> | null> {
        // NOTE: ya no se usa directamente — DailyTracker llama a _generateOneDayMeals día a día.
        // Se mantiene como utilidad por compatibilidad.
        const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const allMeals: Array<{ day: number; meal_type: string; meal_name: string; recipe_text: string; calories: number; protein: number; carbs: number; fats: number }> = [];
        const accumulatedMealNames: string[] = [];

        for (let idx = 0; idx < dayLabels.length; idx++) {
            try {
                const meals = await this._generateOneDayMeals(profile, dayLabels[idx], idx, accumulatedMealNames);
                const withDay = meals.map(m => ({ ...m, day: idx }));
                allMeals.push(...withDay);
                // Acumular nombres para que el siguiente día no los repita
                accumulatedMealNames.push(...meals.map(m => m.meal_name));
            } catch (err) {
                console.error(`Error generando ${dayLabels[idx]}:`, err);
            }
            // Delay 1.5s entre días para evitar rate limit
            if (idx < 6) await new Promise(r => setTimeout(r, 1500));
        }

        return allMeals.length > 0 ? allMeals : null;
    },

    // Reroll de un plato individual
    async rerollMeal(
        profile: UserNutritionProfile,
        mealType: string,
        remainingCals: number,
        remainingProtein: number,
        remainingCarbs: number,
        remainingFats: number
    ): Promise<{ meal_name: string; recipe_text: string; calories: number; protein: number; carbs: number; fats: number } | null> {
        const seed = Date.now() % 99999;
        const prompt = [
            'Eres nutricionista deportivo ISSN.',
            'Genera UN ÚNICO plato NUEVO Y DIFERENTE (Semilla #' + seed + ') para ' + mealType + ' con este presupuesto de macros:',
            '- Calorías: ' + remainingCals + ' kcal',
            '- Proteínas: ' + remainingProtein + 'g | Carbos: ' + remainingCarbs + 'g | Grasas: ' + remainingFats + 'g',
            '- Alimentos favoritos (PRIORIZAR): ' + (profile.loved_foods || 'Sin especificar'),
            '- Alimentos PROHIBIDOS (NUNCA usar): ' + (profile.disliked_foods || 'Ninguno'),
            '',
            'REGLAS DE REEMPLAZO:',
            '1. NO REPITAS platos que ya haya en el menú.',
            '2. Sé original. NO uses "pollo con arroz" ni similares platos genéricos.',
            '3. NUNCA uses los alimentos prohibidos.',
            '',
            'Devuelve ÚNICAMENTE este JSON (sin markdown):',
            '{"meal_name":"NOMBRE ORIGINAL","recipe_text":"RECETA EN 3 PASOS","calories":0,"protein":0,"carbs":0,"fats":0}'
        ].join('\n');

        const text = await geminiCall(prompt, 90000);
        const parsed = JSON.parse(text);
        // Sanitizar decimales
        return {
            meal_name: String(parsed.meal_name || 'Plato sin nombre'),
            recipe_text: String(parsed.recipe_text || 'Sin receta'),
            calories: Math.round(Number(parsed.calories) || 0),
            protein: Math.round(Number(parsed.protein) || 0),
            carbs: Math.round(Number(parsed.carbs) || 0),
            fats: Math.round(Number(parsed.fats) || 0),
        };
    },

    _getMealTypes(mealsPerDay: number): string[] {
        switch (mealsPerDay) {
            case 2: return ['Comida', 'Cena'];
            case 3: return ['Desayuno', 'Comida', 'Cena'];
            case 4: return ['Desayuno', 'Comida', 'Merienda', 'Cena'];
            case 5: return ['Desayuno', 'Media Mañana', 'Comida', 'Merienda', 'Cena'];
            default: return ['Desayuno', 'Comida', 'Cena'];
        }
    },

    // ───── ESCÁNER ─────
    async scanBarcode(barcode: string): Promise<ProductScanResult | null> {
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
            const data = await response.json();
            if (data.status === 1 && data.product) {
                return {
                    barcode,
                    name: data.product.product_name || 'Desconocido',
                    ingredients: data.product.ingredients_text_es || data.product.ingredients_text || 'No especificados',
                    nutriments: data.product.nutriments || {},
                    image_url: data.product.image_front_url
                };
            }
            return null;
        } catch (e) {
            console.error('Error scanBarcode:', e);
            return null;
        }
    },

    async analyzeWithISSN(product: ProductScanResult, userObjective: 'déficit' | 'superávit' | 'mantenimiento' = 'mantenimiento'): Promise<NutritionAdvice | null> {
        const prompt = [
            'Eres Nutricionista ISSN. Evalúa el alimento: "' + product.name + '".',
            'Ingredientes: ' + product.ingredients,
            'Macros/100g: Carbos ' + (product.nutriments.carbohydrates_100g || 0) + 'g, Proteínas ' + (product.nutriments.proteins_100g || 0) + 'g, Grasas ' + (product.nutriments.fat_100g || 0) + 'g, Kcal ' + (product.nutriments.energy_kcal_100g || 0),
            'Objetivo: ' + userObjective,
            'Devuelve JSON: {"suitable":bool,"score":1-10,"explanation":"...","macros_per_100g":{"protein":0,"carbs":0,"fat":0,"kcal":0}}'
        ].join('\n');
        try {
            const text = await geminiCall(prompt, 20000);
            return JSON.parse(text) as NutritionAdvice;
        } catch (e) {
            console.error('analyzeWithISSN error:', e);
            return null;
        }
    }
};
