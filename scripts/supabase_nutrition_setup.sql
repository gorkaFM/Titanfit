-- ================================================================
-- TitanFit: SQL completo para ejecutar en Supabase
-- Copia todo este contenido y pégalo en el SQL Editor de Supabase
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- PASO 1: Añadir columnas de objetivos nutricionales
--         a la tabla body_measurements (ya existente)
-- ────────────────────────────────────────────────────────────────

ALTER TABLE body_measurements
    ADD COLUMN IF NOT EXISTS daily_kcal  NUMERIC DEFAULT 2000,
    ADD COLUMN IF NOT EXISTS protein_pct NUMERIC DEFAULT 30,
    ADD COLUMN IF NOT EXISTS carbs_pct   NUMERIC DEFAULT 45,
    ADD COLUMN IF NOT EXISTS fat_pct     NUMERIC DEFAULT 25;

-- ────────────────────────────────────────────────────────────────
-- PASO 2: Crear tabla de sesiones de comida (diario)
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type     TEXT NOT NULL CHECK (meal_type IN (
                    'desayuno', 'pre_entreno', 'comida', 'merienda',
                    'cena', 'post_entreno', 'snack', 'extra'
                  )),
    meal_label    TEXT,
    sort_order    INT DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- PASO 3: Crear tabla de alimentos dentro de cada comida
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_log_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_log_id   UUID NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    brand         TEXT,
    quantity_g    NUMERIC NOT NULL DEFAULT 100,
    kcal          NUMERIC NOT NULL DEFAULT 0,
    protein_g     NUMERIC NOT NULL DEFAULT 0,
    carbs_g       NUMERIC NOT NULL DEFAULT 0,
    fat_g         NUMERIC NOT NULL DEFAULT 0,
    fiber_g       NUMERIC,
    sugar_g       NUMERIC,
    nutri_score   TEXT CHECK (nutri_score IN ('A','B','C','D','E')),
    barcode       TEXT,
    usda_fdc_id   TEXT,
    source        TEXT DEFAULT 'manual' CHECK (source IN ('usda','open_food_facts','manual','gemini')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- PASO 4: Índices para rendimiento
-- ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS meal_logs_user_date   ON meal_logs(user_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS meal_logs_user_date_type_unique ON meal_logs(user_id, date, meal_type);
CREATE INDEX IF NOT EXISTS meal_log_items_log_id ON meal_log_items(meal_log_id);
CREATE INDEX IF NOT EXISTS meal_log_items_user   ON meal_log_items(user_id);

-- ────────────────────────────────────────────────────────────────
-- PASO 5: Row Level Security (RLS) — cada usuario solo ve lo suyo
-- ────────────────────────────────────────────────────────────────

ALTER TABLE meal_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_log_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_logs_self"       ON meal_logs;
DROP POLICY IF EXISTS "meal_log_items_self"  ON meal_log_items;

CREATE POLICY "meal_logs_self" ON meal_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "meal_log_items_self" ON meal_log_items
    FOR ALL USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- ¡Listo! Pulsa "Run" y ya está todo configurado.
-- ────────────────────────────────────────────────────────────────
