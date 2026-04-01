-- SCRIPT DE SEGURIDAD CRÍTICA: TITANFIT
-- Pega este código exacto en el "SQL Editor" de tu Supabase Dashboard y dale a "RUN".

-- 1. HABILITAR RLS (ROW LEVEL SECURITY) EN TODAS LAS TABLAS PRINCIPALES
-- Esto cierra la puerta inmediatamente a accesos anónimos.
ALTER TABLE exercises_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_measurements ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICA PARA LIBRERÍA DE EJERCICIOS (LECTURA PÚBLICA / ESCRITURA CERRADA)
-- Todos pueden leer el catálogo, nadie puede alterarlo desde la app.
CREATE POLICY "Lectura pública de ejercicios" ON exercises_library 
FOR SELECT USING (true);

-- 3. POLÍTICA PARA ENTRENAMIENTOS (WORKOUTS)
-- Los usuarios SOLO pueden ver, crear, editar o borrar entrenamientos que tengan SU propia ID.
CREATE POLICY "Propiedad estricta de workouts" ON workouts 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. POLÍTICA PARA MEDICIONES (BIOMETRÍA)
-- Propiedad estricta sobre el peso, altura, grasa corporal, etc.
CREATE POLICY "Propiedad estricta de mediciones" ON user_measurements 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. POLÍTICA PARA EJERCICIOS DENTRO DEL ENTRENAMIENTO (WORKOUT_EXERCISES)
-- Como no tienen user_id propio, comprobamos si el workout padre te pertenece.
CREATE POLICY "Propiedad heredada de workout_exercises" ON workout_exercises 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workouts 
    WHERE workouts.id = workout_exercises.workout_id 
    AND workouts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workouts 
    WHERE workouts.id = workout_exercises.workout_id 
    AND workouts.user_id = auth.uid()
  )
);

-- 6. POLÍTICA PARA SERIES (WORKOUT_SETS)
-- Comprobación en cascada: Series -> Ejercicio -> Entrenamiento -> Usuario.
CREATE POLICY "Propiedad heredada de workout_sets" ON workout_sets 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workout_exercises
    JOIN workouts ON workouts.id = workout_exercises.workout_id
    WHERE workout_exercises.id = workout_sets.workout_exercise_id 
    AND workouts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_exercises
    JOIN workouts ON workouts.id = workout_exercises.workout_id
    WHERE workout_exercises.id = workout_sets.workout_exercise_id 
    AND workouts.user_id = auth.uid()
  )
);
