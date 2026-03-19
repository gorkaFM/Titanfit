import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { workoutService } from '@/lib/workoutService';
import { ChevronLeft, Eye, Trash2 } from 'lucide-react-native';

export default function HistoryScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [workouts, setWorkouts] = useState<any[]>([]);

    const fetchAllWorkouts = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('workouts')
                .select(`
                    *,
                    workout_exercises (
                        exercises_library (target_muscle_group),
                        workout_sets (
                            reps,
                            weight,
                            is_completed
                        )
                    )
                `)
                .eq('user_id', user.id)
                .eq('is_completed', true)
                .order('date', { ascending: false });

            if (error) throw error;

            const processed = (data || []).map(w => {
                let totalVolume = 0;
                let totalReps = 0;
                w.workout_exercises?.forEach((we: any) => {
                    we.workout_sets?.forEach((s: any) => {
                        if (s.is_completed) {
                            totalVolume += (s.weight || 0) * (s.reps || 0);
                            totalReps += (s.reps || 0);
                        }
                    });
                });
                const workoutMuscles = w.workout_exercises?.map((we: any) => we.exercises_library?.target_muscle_group).filter(Boolean) || [];
                return { ...w, totalVolume, totalReps, workoutMuscles };
            });

            setWorkouts(processed);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAllWorkouts();
    }, [fetchAllWorkouts]);

    const handleDelete = async (id: string) => {
        try {
            await workoutService.deleteWorkout(id);
            fetchAllWorkouts();
        } catch {
            alert("Error al eliminar");
        }
    };

    const groupedWorkouts = useMemo(() => {
        const groups: Record<string, any[]> = {};
        workouts.forEach(w => {
            const date = new Date(w.date);
            const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(w);
        });
        return groups;
    }, [workouts]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase();
    };

    return (
        <SafeAreaView className="flex-1 bg-zinc-950">
            <View className="px-6 py-4 flex-row items-center border-b border-zinc-900">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-zinc-900 items-center justify-center border border-zinc-800 mr-4">
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text className="text-white font-black text-xl uppercase tracking-tighter">Historial de Entrenos</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {loading ? (
                    <ActivityIndicator color="#3b82f6" className="mt-10" />
                ) : workouts.length === 0 ? (
                    <View className="py-20 items-center">
                        <Text className="text-zinc-500 font-bold uppercase tracking-widest">No hay historial todavía</Text>
                    </View>
                ) : (
                    Object.entries(groupedWorkouts).map(([groupKey, groupWorkouts]) => (
                        <View key={groupKey} className="mb-8">
                            <Text className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4 ml-1">{groupKey}</Text>
                            <View className="gap-y-4">
                                {groupWorkouts.map(workout => (
                                    <View
                                        key={workout.id}
                                        className="rounded-[32] p-5 border bg-zinc-900/60 border-zinc-800"
                                    >
                                        <View className="flex-row items-center justify-between mb-4">
                                            <View className="flex-1 mr-4">
                                                <Text className="font-black text-lg uppercase tracking-tighter text-white">
                                                    {workout.name}
                                                </Text>
                                                <Text className="text-[10px] font-bold uppercase tracking-widest mt-1 text-zinc-500">
                                                    {formatDate(workout.date)} • {Math.floor(workout.duration_seconds / 60)} MIN
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center gap-x-2">
                                                <TouchableOpacity 
                                                    onPress={() => router.push({
                                                        pathname: '/workouts/summary',
                                                        params: { 
                                                            workoutId: workout.id,
                                                            duration: workout.duration_seconds,
                                                            volume: workout.totalVolume,
                                                            exerciseCount: workout.workout_exercises?.length || 0,
                                                            muscles: JSON.stringify(workout.workoutMuscles)
                                                        }
                                                    })}
                                                    className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800"
                                                >
                                                    <Eye size={18} color="#3b82f6" />
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    onPress={() => handleDelete(workout.id)}
                                                    className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800"
                                                >
                                                    <Trash2 size={16} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View className="flex-row items-center gap-x-3">
                                            <View className="flex-1 bg-zinc-950/50 px-4 py-3 rounded-2xl flex-row items-center justify-around border border-zinc-800/30">
                                                <View className="items-center">
                                                    <Text className="text-white font-black text-xs">{workout.totalVolume}kg</Text>
                                                    <Text className="text-[7px] font-bold text-zinc-500 uppercase">Volumen</Text>
                                                </View>
                                                <View className="w-[1] h-3 bg-zinc-800" />
                                                <View className="items-center">
                                                    <Text className="text-white font-black text-xs">{workout.totalReps}</Text>
                                                    <Text className="text-[7px] font-bold text-zinc-500 uppercase">Reps</Text>
                                                </View>
                                                <View className="w-[1] h-3 bg-zinc-800" />
                                                <View className="items-center">
                                                    <Text className="text-white font-black text-xs">{Math.floor(workout.duration_seconds / 60)} min</Text>
                                                    <Text className="text-[7px] font-bold text-zinc-500 uppercase">Tiempo</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
