-- ================================================================
-- TitanFit: RPC transaccional para importar el plan semanal al diario
-- Ejecutar despues de nutrition_meal_logs_hardening.sql
-- ================================================================

CREATE OR REPLACE FUNCTION import_menu_plan_to_diary(
    p_user_id UUID,
    p_start_date DATE,
    p_plan JSONB
)
RETURNS TABLE (
    first_date DATE,
    last_date DATE,
    inserted_items INT,
    replaced_sections INT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    day_entry JSONB;
    meal_entry JSONB;
    target_date DATE := p_start_date;
    current_log_id UUID;
    normalized_meal_type TEXT;
    normalized_meal_label TEXT;
    normalized_sort_order INT;
    inserted_counter INT := 0;
    replaced_counter INT := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'El usuario autenticado no coincide con el destino de la importacion';
    END IF;

    IF jsonb_typeof(p_plan) <> 'array' OR jsonb_array_length(p_plan) = 0 THEN
        RAISE EXCEPTION 'El plan recibido es invalido o esta vacio';
    END IF;

    first_date := p_start_date;
    last_date := p_start_date + (jsonb_array_length(p_plan) - 1);

    FOR day_entry IN SELECT value FROM jsonb_array_elements(p_plan)
    LOOP
        IF jsonb_typeof(day_entry -> 'meals') <> 'array' THEN
            RAISE EXCEPTION 'El dia del plan no contiene una lista valida de comidas';
        END IF;

        FOR meal_entry IN SELECT value FROM jsonb_array_elements(day_entry -> 'meals')
        LOOP
            normalized_meal_type := CASE
                WHEN lower(coalesce(meal_entry ->> 'meal', '')) LIKE '%desayuno%' THEN 'desayuno'
                WHEN lower(coalesce(meal_entry ->> 'meal', '')) LIKE '%pre%' THEN 'pre_entreno'
                WHEN lower(coalesce(meal_entry ->> 'meal', '')) LIKE '%comida%' OR lower(coalesce(meal_entry ->> 'meal', '')) LIKE '%almuerzo%' THEN 'comida'
                WHEN lower(coalesce(meal_entry ->> 'meal', '')) LIKE '%merienda%' OR lower(coalesce(meal_entry ->> 'meal', '')) LIKE '%media%' THEN 'merienda'
                WHEN lower(coalesce(meal_entry ->> 'meal', '')) LIKE '%cena%' THEN 'cena'
                WHEN lower(coalesce(meal_entry ->> 'meal', '')) LIKE '%post%' THEN 'post_entreno'
                ELSE 'extra'
            END;

            normalized_meal_label := CASE normalized_meal_type
                WHEN 'desayuno' THEN 'Desayuno'
                WHEN 'pre_entreno' THEN 'Pre-entreno'
                WHEN 'comida' THEN 'Comida'
                WHEN 'merienda' THEN 'Merienda'
                WHEN 'cena' THEN 'Cena'
                WHEN 'post_entreno' THEN 'Post-entreno'
                ELSE coalesce(nullif(meal_entry ->> 'meal', ''), 'Extra')
            END;

            normalized_sort_order := CASE normalized_meal_type
                WHEN 'desayuno' THEN 0
                WHEN 'pre_entreno' THEN 1
                WHEN 'comida' THEN 2
                WHEN 'merienda' THEN 3
                WHEN 'cena' THEN 4
                WHEN 'post_entreno' THEN 5
                ELSE 6
            END;

            INSERT INTO meal_logs (user_id, date, meal_type, meal_label, sort_order)
            VALUES (p_user_id, target_date, normalized_meal_type, normalized_meal_label, normalized_sort_order)
            ON CONFLICT (user_id, date, meal_type)
            DO UPDATE SET
                meal_label = EXCLUDED.meal_label,
                sort_order = EXCLUDED.sort_order
            RETURNING id INTO current_log_id;

            DELETE FROM meal_log_items
            WHERE meal_log_id = current_log_id
              AND user_id = p_user_id
              AND source = 'gemini';

            replaced_counter := replaced_counter + 1;

            INSERT INTO meal_log_items (
                meal_log_id,
                user_id,
                name,
                quantity_g,
                kcal,
                protein_g,
                carbs_g,
                fat_g,
                source
            )
            VALUES (
                current_log_id,
                p_user_id,
                coalesce(nullif(meal_entry ->> 'foods', ''), 'Comida importada'),
                1,
                round(coalesce((meal_entry ->> 'kcal_approx')::numeric, 0)),
                0,
                0,
                0,
                'gemini'
            );

            inserted_counter := inserted_counter + 1;
        END LOOP;

        target_date := target_date + 1;
    END LOOP;

    inserted_items := inserted_counter;
    replaced_sections := replaced_counter;
    RETURN NEXT;
END;
$$;
