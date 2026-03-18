-- 1. Catálogo de Ejercicios
CREATE TABLE public.exercises_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    target_muscle_group TEXT NOT NULL,
    video_url TEXT
);

-- 2. Entrenamientos Generales
CREATE TABLE public.workouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_completed BOOLEAN DEFAULT false
);

-- 3. Ejercicios dentro de un Entrenamiento
CREATE TABLE public.workout_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES public.exercises_library(id) NOT NULL,
    supersets_with UUID REFERENCES public.workout_exercises(id) ON DELETE SET NULL
);

-- 4. Series (Sets) asociadas a un Ejercicio del Entreno
CREATE TABLE public.workout_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES public.exercises_library(id) NOT NULL, -- Desnormalizado de apoyo
    reps INT NOT NULL DEFAULT 0,
    weight NUMERIC NOT NULL DEFAULT 0,
    rpe INT,
    rest_seconds INT DEFAULT 90,
    is_completed BOOLEAN DEFAULT false
);

-- Habilitar RLS en las tablas del usuario
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- Políticas sencillas: Los usuarios solo pueden ver y editar sus propios entrenamientos
CREATE POLICY "Users can manage their own workouts" 
ON public.workouts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their workout exercises" 
ON public.workout_exercises FOR ALL USING (
    workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view their workout sets" 
ON public.workout_sets FOR ALL USING (
    workout_exercise_id IN (SELECT id FROM public.workout_exercises WHERE workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid()))
);
