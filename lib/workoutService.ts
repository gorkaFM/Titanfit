import { Exercise, Workout } from '../types/workout';
import { supabase } from './supabase';

export const workoutService = {
    // Obtener el catálogo de ejercicios
    async getExercises(): Promise<Exercise[]> {
        const { data, error } = await supabase
            .from('exercises_library')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    // Obtener todas las series de la última vez que se hizo el ejercicio
    async getLastPerformance(userId: string, exerciseId: string) {
        const { data, error } = await supabase
            .from('workout_sets')
            .select(`
                weight, 
                reps, 
                is_completed,
                workout_exercise_id,
                workout_exercises!inner(
                    id,
                    workouts!inner(id, date)
                )
            `)
            .eq('exercise_id', exerciseId)
            .eq('workout_exercises.workouts.user_id', userId)
            .eq('is_completed', true);
            // El ordenamiento y límite se manejan en memoria para evitar fallos en nested joins

        if (error) {
            console.error('Error fetching last performance:', error);
            return null;
        }

        if (!data || data.length === 0) return null;

        // Limpiar estructura y obtener la sesión más reciente
        const sets = data.map((s: any) => {
            const we = Array.isArray(s.workout_exercises) ? s.workout_exercises[0] : s.workout_exercises;
            const w = Array.isArray(we?.workouts) ? we.workouts[0] : we?.workouts;
            return { ...s, we_id: we?.id, date: w?.date || '' };
        });

        // Ordenar por fecha descendente
        sets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const lastSessionId = sets[0].we_id;
        return sets.filter(s => s.we_id === lastSessionId);
    },

    // Calcular el 1RM histórico máximo (Fórmula de Epley)
    async getHistorical1RM(userId: string, exerciseId: string): Promise<number> {
        const { data, error } = await supabase
            .from('workout_sets')
            .select(`
                weight, 
                reps,
                workout_exercises!inner(
                    id,
                    workouts!inner(id, user_id)
                )
            `)
            .eq('exercise_id', exerciseId)
            .eq('workout_exercises.workouts.user_id', userId)
            .eq('is_completed', true);

        if (error || !data || data.length === 0) return 0;

        let max1RM = 0;
        data.forEach((s: any) => {
            const epley1RM = (s.weight || 0) * (1 + (s.reps || 0) / 30);
            if (epley1RM > max1RM) max1RM = epley1RM;
        });

        return Math.round(max1RM);
    },

    // Obtener el peso máximo histórico levantado
    async getHistoricalMaxWeight(userId: string, exerciseId: string): Promise<number> {
        const { data, error } = await supabase
            .from('workout_sets')
            .select(`
                weight,
                workout_exercises!inner(
                    workouts!inner(user_id)
                )
            `)
            .eq('exercise_id', exerciseId)
            .eq('workout_exercises.workouts.user_id', userId)
            .eq('is_completed', true);

        if (error || !data || data.length === 0) return 0;

        let maxWeight = 0;
        data.forEach((s: any) => {
            if ((s.weight || 0) > maxWeight) maxWeight = s.weight;
        });

        return maxWeight;
    },

    // Obtener progresión histórica (1RM por fecha) para la gráfica
    async getExerciseProgression(userId: string, exerciseId: string) {
        const { data, error } = await supabase
            .from('workout_sets')
            .select(`
                weight, 
                reps,
                workout_exercise_id,
                workout_exercises!inner(
                    id,
                    workouts!inner(id, date, user_id)
                )
            `)
            .eq('exercise_id', exerciseId)
            .eq('workout_exercises.workouts.user_id', userId)
            .eq('is_completed', true);

        if (error || !data) return [];
        
        // Procesar y agrupar por sesión única
        const sessionMax: Record<string, { oneRM: number, maxWeight: number, date: string }> = {};
        
        data.forEach((s: any) => {
            // Manejar variabilidad de estructura Supabase/PostgREST
            const we = Array.isArray(s.workout_exercises) ? s.workout_exercises[0] : s.workout_exercises;
            const w = Array.isArray(we?.workouts) ? we.workouts[0] : we?.workouts;
            
            // Priorizar workout_exercise_id directo si we.id falla
            const sessionId = we?.id || s.workout_exercise_id;
            
            if (!sessionId || !w) return;
            
            const epley1RM = (s.weight || 0) * (1 + (s.reps || 0) / 30);
            const currentWeight = s.weight || 0;

            if (!sessionMax[sessionId] || epley1RM > sessionMax[sessionId].oneRM) {
                sessionMax[sessionId] = { 
                    oneRM: epley1RM, 
                    maxWeight: Math.max(currentWeight, sessionMax[sessionId]?.maxWeight || 0),
                    date: w.date 
                };
            } else {
                sessionMax[sessionId].maxWeight = Math.max(currentWeight, sessionMax[sessionId].maxWeight);
            }
        });

        // Convertir a array de puntos y ORDENAR cronológicamente
        return Object.values(sessionMax)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(p => ({
                date: p.date,
                oneRM: Math.round(p.oneRM),
                maxWeight: p.maxWeight
            }));
    },

    // Guardar un entrenamiento completo
    async saveWorkout(workout: Omit<Workout, 'id'>) {
        // 1. Crear el Workout
        const { data: wData, error: wError } = await supabase
            .from('workouts')
            .insert({
                user_id: workout.user_id,
                name: workout.name,
                date: workout.date,
                is_completed: workout.is_completed,
                duration_seconds: workout.duration_seconds
            })
            .select()
            .single();

        if (wError || !wData) throw wError || new Error("No se pudo crear el entreno");

        const workoutId = wData.id;

        // 2. Insertar ejercicios y luego sus series (gestionando los superset id referenciales)
        // Para simplificar Supabase, primero guardamos los ejercicios (para obtener sus UUIDs)
        const dbExercises = [];

        for (const we of workout.exercises) {
            const { data: weData, error: weError } = await supabase
                .from('workout_exercises')
                .insert({
                    workout_id: workoutId,
                    exercise_id: we.exercise_id,
                })
                .select()
                .single();

            if (weError) throw weError;

            // Guardamos referencia memoria
            dbExercises.push({
                localId: we.id,
                dbId: weData.id,
                supersets_with: we.supersets_with,
                sets: we.sets,
                exercise_id: we.exercise_id
            });
        }

        // Si hay agrupaciones, actualizamos el supersets_with con el ID real de la base de datos
        for (const dbe of dbExercises) {
            if (dbe.supersets_with) {
                // Buscamos cuál es el ID real del ejercicio padre
                const parent = dbExercises.find(x => x.localId === dbe.supersets_with);
                if (parent) {
                    await supabase
                        .from('workout_exercises')
                        .update({ supersets_with: parent.dbId })
                        .eq('id', dbe.dbId);
                }
            }

            // 3. Insertamos sus series
            if (dbe.sets.length > 0) {
                const setsToInsert = dbe.sets.map(s => ({
                    workout_exercise_id: dbe.dbId,
                    exercise_id: dbe.exercise_id,
                    reps: s.reps,
                    weight: s.weight,
                    rest_seconds: s.rest_seconds,
                    is_completed: s.is_completed,
                    duration_seconds: s.duration_seconds
                }));

                const { error: sError } = await supabase
                    .from('workout_sets')
                    .insert(setsToInsert);

                if (sError) throw sError;
            }
        }

        return { success: true, workoutId };
    },

    // Obtener estadísticas para el Dashboard
    async getDashboardStats(userId: string, period: 'week' | 'month' | 'year') {
        const now = new Date();
        let startDate = new Date();

        if (period === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            startDate.setMonth(now.getMonth() - 1);
        } else {
            startDate.setFullYear(now.getFullYear() - 1);
        }

        const { data, error } = await supabase
            .from('workouts')
            .select(`
                id,
                date,
                duration_seconds,
                workout_exercises (
                    exercise_id,
                    exercises_library (target_muscle_group),
                    workout_sets (
                        reps,
                        weight,
                        is_completed
                    )
                )
            `)
            .eq('user_id', userId)
            .eq('is_completed', true)
            .gte('date', startDate.toISOString());

        if (error) throw error;

        let totalVolume = 0;
        let workoutsCount = data.length;
        const muscleDistribution: Record<string, number> = {
            'Pecho': 0,
            'Espalda': 0,
            'Piernas': 0,
            'Hombros': 0,
            'Brazos': 0,
            'Core': 0
        };

        data.forEach(w => {
            w.workout_exercises.forEach((we: any) => {
                const muscle = we.exercises_library?.target_muscle_group;
                we.workout_sets.forEach((s: any) => {
                    if (s.is_completed) {
                        totalVolume += (s.weight || 0) * (s.reps || 0);
                        if (muscle && muscleDistribution[muscle] !== undefined) {
                            muscleDistribution[muscle] += 1; // Contamos series completadas
                        }
                    }
                });
            });
        });

        return {
            totalVolume,
            workoutsCount,
            muscleDistribution
        };
    },

    // --- BIOMETRÍA ---

    async getLatestMeasurements(userId: string) {
        const { data, error } = await supabase
            .from('user_measurements')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async updateMeasurements(userId: string, measurements: any) {
        const { error } = await supabase
            .from('user_measurements')
            .insert({
                user_id: userId,
                date: new Date().toISOString().split('T')[0],
                ...measurements
            });

        if (error) throw error;
        return { success: true };
    },

    async getMeasurementHistory(userId: string) {
        const { data, error } = await supabase
            .from('user_measurements')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Eliminar un entrenamiento específico
    async deleteWorkout(workoutId: string) {
        const { error } = await supabase
            .from('workouts')
            .delete()
            .eq('id', workoutId);

        if (error) throw error;
        return { success: true };
    },

    // Reset total de datos del usuario
    async resetUserData(userId: string) {
        // Eliminar entrenamientos (cascada a ejercicios y series)
        const { error: wError } = await supabase
            .from('workouts')
            .delete()
            .eq('user_id', userId);

        if (wError) throw wError;

        // Eliminar mediciones
        const { error: mError } = await supabase
            .from('user_measurements')
            .delete()
            .eq('user_id', userId);

        if (mError) throw mError;

        return { success: true };
    },

    // Obtener detalle completo de un entreno
    async getWorkoutDetails(workoutId: string) {
        const { data, error } = await supabase
            .from('workouts')
            .select(`
                *,
                workout_exercises (
                    id,
                    exercise_id,
                    exercises_library (name, target_muscle_group),
                    workout_sets (
                        reps,
                        weight,
                        is_completed,
                        duration_seconds
                    )
                )
            `)
            .eq('id', workoutId)
            .single();

        if (error) throw error;
        return data;
    },

    // Obtener la frecuencia de cada ejercicio realizado por el usuario
    async getExerciseFrequency(userId: string) {
        const { data, error } = await supabase
            .from('workout_sets')
            .select(`
                weight,
                exercise_id,
                exercises_library (name, target_muscle_group),
                workout_exercises!inner(
                    id,
                    workouts!inner(user_id, date)
                )
            `)
            .eq('workout_exercises.workouts.user_id', userId)
            .eq('is_completed', true);

        if (error || !data) return [];

        const freq: Record<string, { id: string, name: string, muscle: string, count: number, lastWeight: number, lastDate: string }> = {};
        
        data.forEach((s: any) => {
            const exId = s.exercise_id;
            const we = Array.isArray(s.workout_exercises) ? s.workout_exercises[0] : s.workout_exercises;
            const w = Array.isArray(we?.workouts) ? we.workouts[0] : we?.workouts;
            const date = w?.date || '';
            const weight = s.weight || 0;

            if (!freq[exId]) {
                freq[exId] = {
                    id: exId,
                    name: s.exercises_library?.name || 'Ejercicio',
                    muscle: s.exercises_library?.target_muscle_group || 'Varios',
                    count: 0,
                    lastWeight: 0,
                    lastDate: ''
                };
            }
            
            freq[exId].count++;
            
            // Si es una fecha más reciente o la misma fecha pero mayor peso
            if (!freq[exId].lastDate || new Date(date) > new Date(freq[exId].lastDate)) {
                freq[exId].lastDate = date;
                freq[exId].lastWeight = weight;
            } else if (date === freq[exId].lastDate && weight > freq[exId].lastWeight) {
                freq[exId].lastWeight = weight;
            }
        });

        return Object.values(freq).sort((a, b) => b.count - a.count);
    },

    // Buscar ejercicios por nombre exacto o similar
    async findExercisesByNames(names: string[]) {
        const { data, error } = await supabase
            .from('exercises_library')
            .select('*')
            .in('name', names);
        
        if (error) throw error;
        return data || [];
    }
};
// Riverside progression:
// };
