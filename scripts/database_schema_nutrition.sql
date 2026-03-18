-- 1. Perfiles Nutricionales de los Usuarios
-- ⚠️ IMPORTANTE: Todas estas columnas DEBEN existir en Supabase.
-- Si alguna falta, ejecutar ALTER TABLE para añadirla.
CREATE TABLE public.user_nutrition_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    goal TEXT NOT NULL CHECK (goal IN ('Pérdida de Peso', 'Mantenimiento / Recomposición', 'Ganancia Muscular')),
    sex TEXT NOT NULL DEFAULT 'male' CHECK (sex IN ('male', 'female')),
    age INT NOT NULL DEFAULT 25,
    height_cm INT NOT NULL DEFAULT 170,
    weight_kg NUMERIC(5,1) NOT NULL DEFAULT 75.0,
    body_fat_pct NUMERIC(4,1),
    meals_per_day INT NOT NULL DEFAULT 3,
    activity_level TEXT NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
    training_days INT NOT NULL DEFAULT 3,
    intermittent_fasting BOOLEAN DEFAULT false,
    habits TEXT,
    loved_foods TEXT,
    disliked_foods TEXT,
    target_calories INT NOT NULL,
    target_calories_training INT NOT NULL DEFAULT 2500,
    target_calories_rest INT NOT NULL DEFAULT 2200,
    target_protein INT NOT NULL,
    target_carbs INT NOT NULL,
    target_fats INT NOT NULL,
    estimated_weeks INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⚠️ MIGRACIONES — Ejecutar en Supabase SQL Editor si la tabla ya existe:
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1) DEFAULT 75.0;
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC(4,1);
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS target_calories_training INT DEFAULT 2500;
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS target_calories_rest INT DEFAULT 2200;
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS sex TEXT DEFAULT 'male';
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS age INT DEFAULT 25;
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS height_cm INT DEFAULT 170;
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS meals_per_day INT DEFAULT 3;
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate';
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS training_days INT DEFAULT 3;
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS loved_foods TEXT;
ALTER TABLE public.user_nutrition_profiles ADD COLUMN IF NOT EXISTS disliked_foods TEXT;

-- 2. Planes Diarios de Nutrición
CREATE TABLE public.nutrition_daily_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_training_day BOOLEAN DEFAULT false,
    target_calories INT NOT NULL,
    target_protein INT NOT NULL,
    target_carbs INT NOT NULL,
    target_fats INT NOT NULL,
    consumed_calories INT DEFAULT 0,
    consumed_protein INT DEFAULT 0,
    consumed_carbs INT DEFAULT 0,
    consumed_fats INT DEFAULT 0,
    UNIQUE(user_id, date)
);

-- ⚠️ MIGRACIÓN: Añadir is_training_day si la tabla ya existe
ALTER TABLE public.nutrition_daily_plans ADD COLUMN IF NOT EXISTS is_training_day BOOLEAN DEFAULT false;

-- 3. Comidas sugeridas (o introducidas) dentro del Plan Diario
CREATE TABLE public.nutrition_meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES public.nutrition_daily_plans(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('Desayuno', 'Media Mañana', 'Comida', 'Merienda', 'Cena', 'Snack')),
    meal_name TEXT NOT NULL,
    recipe_text TEXT,
    calories INT NOT NULL DEFAULT 0,
    protein INT NOT NULL DEFAULT 0,
    carbs INT NOT NULL DEFAULT 0,
    fats INT NOT NULL DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false
);

-- 4. Alimentos Escaneados / Manuales añadidos a una comida
CREATE TABLE public.nutrition_scanned_foods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meal_id UUID REFERENCES public.nutrition_meals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    barcode TEXT,
    serving_size_g INT,
    calories INT NOT NULL DEFAULT 0,
    protein INT NOT NULL DEFAULT 0,
    carbs INT NOT NULL DEFAULT 0,
    fats INT NOT NULL DEFAULT 0
);

-- Habilitar RLS
ALTER TABLE public.user_nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_scanned_foods ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can manage their own nutrition profile" 
ON public.user_nutrition_profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their daily plans" 
ON public.nutrition_daily_plans FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their meals" 
ON public.nutrition_meals FOR ALL USING (
    plan_id IN (SELECT id FROM public.nutrition_daily_plans WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage their scanned foods" 
ON public.nutrition_scanned_foods FOR ALL USING (
    meal_id IN (SELECT id FROM public.nutrition_meals WHERE plan_id IN (SELECT id FROM public.nutrition_daily_plans WHERE user_id = auth.uid()))
);
