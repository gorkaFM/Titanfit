-- ================================================================
-- TitanFit: Hardening del diario nutricional
-- Ejecutar una sola vez en Supabase SQL Editor
-- Objetivo:
-- 1. Consolidar meal_logs duplicados por user/date/meal_type
-- 2. Blindar la unicidad para evitar que vuelvan a crearse
-- ================================================================

BEGIN;

WITH ranked_logs AS (
    SELECT
        id,
        user_id,
        date,
        meal_type,
        FIRST_VALUE(id) OVER (
            PARTITION BY user_id, date, meal_type
            ORDER BY sort_order ASC, created_at ASC, id ASC
        ) AS canonical_id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, date, meal_type
            ORDER BY sort_order ASC, created_at ASC, id ASC
        ) AS duplicate_rank
    FROM meal_logs
),
relinked_items AS (
    UPDATE meal_log_items AS items
    SET meal_log_id = ranked_logs.canonical_id
    FROM ranked_logs
    WHERE items.meal_log_id = ranked_logs.id
      AND ranked_logs.duplicate_rank > 1
    RETURNING items.id
)
DELETE FROM meal_logs AS logs
USING ranked_logs
WHERE logs.id = ranked_logs.id
  AND ranked_logs.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS meal_logs_user_date_type_unique
    ON meal_logs(user_id, date, meal_type);

COMMIT;
