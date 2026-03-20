import { useAuth } from '@/context/AuthContext';
import { useWorkout } from '@/context/WorkoutContext';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { workoutService } from '@/lib/workoutService';
import { ChevronRight, Eye, Flame, History, Plus, Trash2, Zap } from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { ActivityIndicator, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function WorkoutsScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { user } = useAuth();
    const router = useRouter();
    const { isActive } = useWorkout();
    const [loading, setLoading] = useState(true);

    const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);

    const fetchWorkouts = useCallback(async () => {
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
                .order('date', { ascending: false })
                .limit(10);

            if (error) throw error;

            // Procesar estadísticas
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

            setRecentWorkouts(processed);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchWorkouts();
    }, [fetchWorkouts]);

    const handleDeleteWorkout = async (id: string) => {
        try {
            await workoutService.deleteWorkout(id);
            fetchWorkouts();
        } catch {
            alert("Error al eliminar");
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase();
    };

    const stats = [
        { id: 1, label: 'Entrenos', value: recentWorkouts.length.toString(), icon: <Flame size={16} color={isDark ? '#e4e4e7' : '#18181b'} /> },
        { id: 2, label: 'Historial', value: recentWorkouts.length > 0 ? 'Activo' : '0', icon: <History size={16} color={isDark ? '#e4e4e7' : '#18181b'} /> },
    ];

    return (
        <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
            <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >

                {/* 🔴 Active Workout Banner — shown when a session is in progress */}
                {isActive && (
                    <TouchableOpacity
                        onPress={() => router.push('/workouts/active')}
                        activeOpacity={0.85}
                        className="mb-6 overflow-hidden rounded-[28px]"
                        style={{ backgroundColor: '#1d4ed8' }}
                    >
                        <View className="px-6 py-4 flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1">
                                <View className="w-3 h-3 rounded-full bg-emerald-400 mr-3" style={{ shadowColor: '#34d399', shadowOpacity: 1, shadowRadius: 6 }} />
                                <View>
                                    <Text className="text-white font-black text-sm uppercase tracking-widest">Entrenamiento en curso</Text>
                                    <Text className="text-blue-200 font-bold text-[10px] uppercase tracking-widest mt-0.5">Toca para continuar →</Text>
                                </View>
                            </View>
                            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                                <Zap size={20} color="#ffffff" fill="#ffffff" />
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Header */}
                <View className="flex-row justify-between items-center mb-8">
                    <View>
                        <Text className={`text-sm font-medium uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                            TitanFit
                        </Text>
                        <Text className={`text-3xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Entrenamientos
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <ThemeToggle />
                        <View className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-sm border border-slate-100'}`}>
                            <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {user?.email?.charAt(0).toUpperCase() || 'V'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Stats Row */}
                <View className="flex-row gap-x-4 mb-8">
                    {stats.map((stat) => (
                        <View
                            key={stat.id}
                            className={`flex-1 rounded-2xl p-4 flex-row items-center overflow-hidden ${isDark ? 'bg-zinc-900/40 border border-zinc-800/50' : 'bg-white shadow-sm border border-slate-100'}`}
                        >
                            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isDark ? 'bg-zinc-800/50' : 'bg-slate-100'}`}>
                                {stat.icon}
                            </View>
                            <View>
                                <Text className={`text-xs font-medium mb-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{stat.label}</Text>
                                <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Motivación Central (Rayo + Frase) */}
                <View className="mb-6 items-center">
                    <View className="relative mb-6">
                        <View className="absolute -inset-4 bg-blue-600/30 blur-2xl rounded-full" />
                        <View className="w-24 h-24 rounded-full items-center justify-center bg-blue-600 shadow-2xl shadow-blue-500/50">
                            <Zap size={48} color="#ffffff" fill="#ffffff" strokeWidth={1.5} />
                        </View>
                    </View>
                    <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black text-3xl uppercase tracking-tighter text-center mb-1`}>
                        ¡VAMOS A POR ELLO!
                    </Text>
                    <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} font-bold text-[9px] text-center uppercase tracking-[0.25em] opacity-90`}>
                        PREPARA TUS MÚSCULOS Y COMIENZA LA SESIÓN
                    </Text>
                </View>

                {/* Botón Principal (Continuación) */}
                <View className="mb-12">
                    <TouchableOpacity
                        onPress={() => router.push('/workouts/active')}
                        activeOpacity={0.8}
                        className="overflow-hidden rounded-[32px] bg-blue-600 shadow-2xl shadow-blue-500/50 w-full"
                    >
                        <View className="p-8 items-center justify-center flex-row">
                            <Plus size={24} color="#ffffff" strokeWidth={4} className="mr-3" />
                            <Text className="text-white font-black text-lg uppercase tracking-widest text-center">Elegir Ejercicios</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Entrenamientos en Casa (Añadido) */}
                <View className="mb-10">
                    <Text className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4 px-1">Rutinas Fixed Home</Text>
                    <View className="gap-y-3">
                        <TouchableOpacity 
                            onPress={() => router.push({ pathname: '/workouts/active', params: { routine: 'A' } })}
                            className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'} p-6 rounded-[32px] flex-row items-center justify-between border shadow-2xl shadow-blue-500/5`}
                        >
                            <View className="flex-row items-center flex-1">
                                <View className="bg-blue-600/10 p-3 rounded-2xl mr-4 h-12 w-12 items-center justify-center">
                                    <Flame size={24} color="#3b82f6" />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center">
                                        <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black uppercase text-sm tracking-widest mr-2`}>Rutina A</Text>
                                        <View className="bg-blue-600/20 px-2 py-0.5 rounded-full"><Text className="text-blue-400 font-bold text-[7px] uppercase">Empuje</Text></View>
                                    </View>
                                    <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-bold text-[10px] mt-1`} numberOfLines={1}>Pecho, cuádriceps, hombros y tríceps.</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={isDark ? '#3f3f46' : '#94a3b8'} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => router.push({ pathname: '/workouts/active', params: { routine: 'B' } })}
                            className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'} p-6 rounded-[32px] flex-row items-center justify-between border shadow-2xl shadow-blue-500/5`}
                        >
                            <View className="flex-row items-center flex-1">
                                <View className="bg-emerald-600/10 p-3 rounded-2xl mr-4 h-12 w-12 items-center justify-center">
                                    <Flame size={24} color="#10b981" />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center">
                                        <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black uppercase text-sm tracking-widest mr-2`}>Rutina B</Text>
                                        <View className="bg-emerald-600/20 px-2 py-0.5 rounded-full"><Text className="text-emerald-400 font-bold text-[7px] uppercase">Tirón</Text></View>
                                    </View>
                                    <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-bold text-[10px] mt-1`} numberOfLines={1}>Espalda, bíceps e isquios.</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={isDark ? '#3f3f46' : '#94a3b8'} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => router.push({ pathname: '/workouts/active', params: { routine: 'C' } })}
                            className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'} p-6 rounded-[32px] flex-row items-center justify-between border shadow-2xl shadow-blue-500/5`}
                        >
                            <View className="flex-row items-center flex-1">
                                <View className="bg-purple-600/10 p-3 rounded-2xl mr-4 h-12 w-12 items-center justify-center">
                                    <Flame size={24} color="#a855f7" />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center">
                                        <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black uppercase text-sm tracking-widest mr-2`}>Rutina C</Text>
                                        <View className="bg-purple-600/20 px-2 py-0.5 rounded-full"><Text className="text-purple-400 font-bold text-[7px] uppercase">Unilateral</Text></View>
                                    </View>
                                    <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-bold text-[10px] mt-1`} numberOfLines={1}>Trabajo unilateral para corregir asimetrías.</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color="#3f3f46" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Workouts or Templates */}
                <View className="mb-4 flex-row items-center justify-between">
                    <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Historial Reciente
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/workouts/history')}>
                        <Text className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            Ver todos
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="py-10 items-center">
                        <ActivityIndicator color={isDark ? '#e4e4e7' : '#18181b'} />
                    </View>
                ) : (
                    <View className="gap-y-4">
                        {recentWorkouts.length === 0 ? (
                            <View className="py-20 items-center">
                                <View className={`relative mb-8`}>
                                    <View className={`absolute -inset-4 bg-blue-600/20 blur-2xl rounded-full`} />
                                    <View className={`w-32 h-32 rounded-full items-center justify-center border-4 ${isDark ? 'bg-zinc-900 border-blue-600/30' : 'bg-white border-blue-500/10 shadow-xl'}`}>
                                        <Zap size={64} color="#3b82f6" fill="#3b82f6" strokeWidth={1.5} />
                                    </View>
                                </View>
                                
                                <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black text-3xl uppercase tracking-tighter text-center mb-2 px-4`}>
                                    ¡VAMOS A POR ELLO!
                                </Text>
                                <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-bold text-[10px] text-center px-10 leading-relaxed uppercase tracking-[0.2em] mb-12 opacity-80`}>
                                    PREPARA TUS MÚSCULOS Y COMIENZA LA SESIÓN
                                </Text>

                                <TouchableOpacity
                                    onPress={() => router.push('/workouts/active')}
                                    activeOpacity={0.8}
                                    className="bg-blue-600 px-10 py-5 rounded-full flex-row items-center shadow-2xl shadow-blue-500/40"
                                >
                                    <Plus size={24} color="#ffffff" strokeWidth={4} className="mr-3" />
                                    <Text className="text-white font-black text-lg uppercase tracking-widest">Elegir Ejercicios</Text>
                                </TouchableOpacity>
                            </View>
                        ) : recentWorkouts.slice(0, 2).map((workout) => (
                            <View
                                key={workout.id}
                                className={`rounded-[32] p-5 border overflow-hidden ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white shadow-lg shadow-slate-200/50 border-white'}`}
                            >
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-1 mr-4">
                                        <Text className={`font-black text-xl leading-tight uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {workout.name}
                                        </Text>
                                        <Text className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
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
                                            className={`w-11 h-11 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}
                                        >
                                            <Eye size={18} color={isDark ? '#3b82f6' : '#2563eb'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={() => handleDeleteWorkout(workout.id)}
                                            className={`w-11 h-11 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}
                                        >
                                            <Trash2 size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Stats Pill */}
                                <View className="flex-row items-center gap-x-3">
                                    <View className={`flex-1 ${isDark ? 'bg-zinc-950/50 border-zinc-800/30' : 'bg-slate-50 border-slate-100'} px-4 py-3 rounded-2xl flex-row items-center justify-around border`}>
                                        <View className="items-center">
                                            <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black text-sm`}>{workout.totalVolume}kg</Text>
                                            <Text className={`text-[8px] font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'} uppercase`}>Volumen</Text>
                                        </View>
                                        <View className={`w-[1] h-4 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
                                        <View className="items-center">
                                            <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black text-sm`}>{workout.totalReps}</Text>
                                            <Text className={`text-[8px] font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'} uppercase`}>Reps</Text>
                                        </View>
                                        <View className={`w-[1] h-4 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
                                        <View className="items-center">
                                            <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black text-sm`}>{Math.floor(workout.duration_seconds / 60)} min</Text>
                                            <Text className={`text-[8px] font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'} uppercase`}>Tiempo</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}
