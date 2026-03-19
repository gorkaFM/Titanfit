-- ================================================================
-- TitanFit: Nutrition Module v2 — Food Diary Schema
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- Tabla de sesiones de comida por día
CREATE TABLE IF NOT EXISTS meal_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type     TEXT NOT NULL CHECK (meal_type IN (
                    'desayuno', 'pre_entreno', 'comida', 'merienda',
                    'cena', 'post_entreno', 'snack', 'extra'
                  )),
    meal_label    TEXT,                  -- Nombre personalizado (ej: "Snack de las 11")
    sort_order    INT DEFAULT 0,         -- Para ordenar las comidas en pantalla
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de alimentos dentro de cada comida
CREATE TABLE IF NOT EXISTS meal_log_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_log_id   UUID NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    brand         TEXT,                  -- Marca del producto (si viene de Open Food Facts)
    quantity_g    NUMERIC NOT NULL DEFAULT 100,
    kcal          NUMERIC NOT NULL DEFAULT 0,
    protein_g     NUMERIC NOT NULL DEFAULT 0,
    carbs_g       NUMERIC NOT NULL DEFAULT 0,
    fat_g         NUMERIC NOT NULL DEFAULT 0,
    fiber_g       NUMERIC,
    sugar_g       NUMERIC,
    -- Identificadores de fuente (para trazabilidad)
    nutri_score   TEXT CHECK (nutri_score IN ('A','B','C','D','E')),
    barcode       TEXT,                  -- EAN/UPC si viene del escáner
    usda_fdc_id   TEXT,                  -- ID en USDA FoodData Central
    source        TEXT DEFAULT 'manual' CHECK (source IN ('usda','open_food_facts','manual','gemini')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS meal_logs_user_date ON meal_logs(user_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS meal_logs_user_date_type_unique ON meal_logs(user_id, date, meal_type);
CREATE INDEX IF NOT EXISTS meal_log_items_log_id ON meal_log_items(meal_log_id);
CREATE INDEX IF NOT EXISTS meal_log_items_user_id ON meal_log_items(user_id);

-- Row Level Security
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_log_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: cada usuario solo ve sus propios datos
CREATE POLICY "meal_logs_self" ON meal_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "meal_log_items_self" ON meal_log_items
    FOR ALL USING (auth.uid() = user_id);
