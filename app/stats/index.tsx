import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { workoutService } from '@/lib/workoutService';
import { ChevronLeft, Trophy, Activity, Dumbbell, History, TrendingUp, Info } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { BodyHeatmap } from '@/components/BodyHeatmap';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const KEY_EXERCISES_MAPPING: Record<string, string[]> = {
    "Press banca": ["Press de Banca con Barra", "Barbell Bench Press - Medium Grip", "Press banca"],
    "Sentadilla": ["Sentadilla Trasera", "Barbell Full Squat", "Sentadilla con barra"],
    "Peso Muerto": ["Peso Muerto Convencional", "Deadlift", "Peso muerto"],
    "Curl Bíceps": ["Curl de Bíceps con Barra", "Barbell Curl", "Curl bíceps"],
    "Press Hombros": ["Press de Hombros Mancuernas", "Dumbbell Shoulder Press", "Press hombros"]
};

const KEY_EXERCISES = Object.keys(KEY_EXERCISES_MAPPING);

export default function StatisticsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{ totalVolume: number, workoutsCount: number, muscleDistribution: Record<string, number> } | null>(null);
    const [exerciseFrequency, setExerciseFrequency] = useState<any[]>([]);
    const [keyExerciseData, setKeyExerciseData] = useState<Record<string, any[]>>({});
    const [selectedKeyEx, setSelectedKeyEx] = useState(KEY_EXERCISES[0]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [dashboardStats, freq, ...keyProgression] = await Promise.all([
                workoutService.getDashboardStats(user.id, 'year'),
                workoutService.getExerciseFrequency(user.id),
                ...KEY_EXERCISES.map(key => 
                    workoutService.findExercisesByNames(KEY_EXERCISES_MAPPING[key]).then(exs => 
                        exs.length > 0 ? workoutService.getExerciseProgression(user.id, exs[0].id) : []
                    )
                )
            ]);

            setStats(dashboardStats);
            setExerciseFrequency(freq);
            
            const progressionMap: Record<string, any[]> = {};
            KEY_EXERCISES.forEach((name, i) => {
                progressionMap[name] = keyProgression[i];
            });
            setKeyExerciseData(progressionMap);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const heatmapData = useMemo(() => {
        const d = stats?.muscleDistribution || {};
        return {
            chest: d['Pecho'] || 0,
            back: d['Espalda'] || 0,
            legs: d['Piernas'] || 0,
            shoulders: d['Hombros'] || 0,
            arms: d['Brazos'] || 0,
            core: d['Core'] || 0
        };
    }, [stats]);

    const currentProgression = keyExerciseData[selectedKeyEx] || [];

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-zinc-950 items-center justify-center">
                <ActivityIndicator color="#3b82f6" size="large" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-zinc-950">
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-zinc-900 items-center justify-center border border-zinc-800">
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text className="text-white font-black text-xl uppercase tracking-tighter">Estadísticas Élite</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                {/* Análisis Muscular */}
                <View className="mt-6 mb-8 bg-zinc-900 border border-zinc-800 rounded-[40px] p-6">
                    <Text className="text-white font-black text-lg uppercase tracking-tighter mb-6 text-center">Análisis de Carga Muscular</Text>
                    <View className="items-center">
                        <BodyHeatmap stats={heatmapData} />
                    </View>
                </View>

                {/* Evolución de Ejercicios Clave */}
                <View className="mb-8">
                    <Text className="text-zinc-500 font-bold text-[10px] uppercase tracking-[4px] mb-4">Evolución Pro</Text>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        {KEY_EXERCISES.map(name => (
                            <TouchableOpacity
                                key={name}
                                onPress={() => setSelectedKeyEx(name)}
                                className={`px-5 py-3 rounded-full mr-2 border ${selectedKeyEx === name ? 'bg-blue-600 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}
                            >
                                <Text className={`font-black text-[10px] uppercase tracking-widest ${selectedKeyEx === name ? 'text-white' : 'text-zinc-500'}`}>
                                    {name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6">
                        {currentProgression.length > 1 ? (
                            <LineChart
                                data={{
                                    labels: currentProgression.map((p, i) => i % 2 === 0 ? new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''),
                                    datasets: [
                                        {
                                            data: currentProgression.map(p => p.maxWeight),
                                            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                                            strokeWidth: 3
                                        }
                                    ],
                                    legend: ["Mejor Peso (kg)"]
                                }}
                                width={SCREEN_WIDTH - 88}
                                height={220}
                                chartConfig={{
                                    backgroundColor: '#18181b',
                                    backgroundGradientFrom: '#18181b',
                                    backgroundGradientTo: '#18181b',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(161, 161, 170, ${opacity})`,
                                    style: { borderRadius: 16 },
                                    propsForDots: { r: "4", strokeWidth: "2", stroke: "#3b82f6" }
                                }}
                                bezier
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        ) : (
                            <View className="h-40 items-center justify-center">
                                <Activity size={32} color="#3f3f46" />
                                <Text className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mt-4">Datos insuficientes para gráfica</Text>
                            </View>
                        )}
                        <View className="mt-4 pt-4 border-t border-zinc-800 flex-row justify-between items-center">
                            <View>
                                <Text className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest">Mejor Marca</Text>
                                <Text className="text-white font-black text-xl">{currentProgression.length > 0 ? Math.max(...currentProgression.map(p => p.maxWeight)) : 0} KG</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest">Est. 1RM Max</Text>
                                <Text className="text-blue-500 font-black text-xl">{currentProgression.length > 0 ? Math.max(...currentProgression.map(p => p.oneRM)) : 0} KG</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Histórico completo por frecuencia */}
                <View className="mb-12">
                    <Text className="text-zinc-500 font-bold text-[10px] uppercase tracking-[4px] mb-4">Historial por Frecuencia</Text>
                    <View className="gap-y-3">
                        {exerciseFrequency.map((ex, index) => (
                            <View key={ex.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-[28px] flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <View className="w-10 h-10 rounded-xl bg-blue-600/10 items-center justify-center mr-4">
                                        <Text className="text-blue-500 font-black text-xs">{index + 1}</Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-black text-sm uppercase tracking-tight">{ex.name}</Text>
                                        <Text className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest mt-1">{ex.muscle}</Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center gap-x-2">
                                    <View className="items-center bg-zinc-950 px-3 py-2 rounded-2xl border border-zinc-800 min-w-[70px]">
                                        <Text className="text-white font-black text-xs">{ex.lastWeight} KG</Text>
                                        <Text className="text-[6px] font-bold text-zinc-500 uppercase">Último</Text>
                                    </View>
                                    <View className="items-center bg-blue-600/10 px-3 py-2 rounded-2xl border border-blue-500/20 min-w-[70px]">
                                        <Text className="text-blue-500 font-black text-xs">{ex.count}</Text>
                                        <Text className="text-[6px] font-bold text-blue-400 uppercase">Sesiones</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
}
