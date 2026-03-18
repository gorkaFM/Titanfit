export type NutritionGoal = 'Pérdida de Peso' | 'Mantenimiento / Recomposición' | 'Ganancia Muscular';
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserNutritionProfile {
    id: string;
    goal: NutritionGoal;
    sex: Sex;
    age: number;
    height_cm: number;
    weight_kg: number;
    body_fat_pct: number | null;
    meals_per_day: number;
    intermittent_fasting: boolean;
    activity_level: ActivityLevel;
    training_days: number;
    habits: string | null;
    loved_foods: string | null;
    disliked_foods: string | null;
    target_calories: number;        // Media semanal o valor general
    target_calories_training: number; // Kcal día entrenamiento
    target_calories_rest: number;     // Kcal día descanso
    target_protein: number;
    target_carbs: number;
    target_fats: number;
    estimated_weeks: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface NutritionDailyPlan {
    id: string;
    user_id: string;
    date: string;
    is_training_day: boolean;
    target_calories: number;
    target_protein: number;
    target_carbs: number;
    target_fats: number;
    consumed_calories: number;
    consumed_protein: number;
    consumed_carbs: number;
    consumed_fats: number;
}

export type MealType = 'Desayuno' | 'Media Mañana' | 'Comida' | 'Merienda' | 'Cena' | 'Snack';

export interface NutritionMeal {
    id: string;
    plan_id: string;
    meal_type: MealType;
    meal_name: string;
    recipe_text: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    is_locked: boolean;
    is_completed: boolean;
}

export interface ScannedFood {
    id: string;
    meal_id: string;
    name: string;
    barcode: string | null;
    serving_size_g: number | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}
