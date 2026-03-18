import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock, Dumbbell, Flame, Share2, Trophy } from 'lucide-react-native';
import { workoutService } from '@/lib/workoutService';
import Svg, { G, Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export default function WorkoutSummaryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    const duration = parseInt(params.duration as string || '0', 10);
    const volume = parseInt(params.volume as string || '0', 10);
    const exerciseCount = parseInt(params.exerciseCount as string || '0', 10);
    const musclesWorked = JSON.parse(params.muscles as string || '[]');

    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (params.workoutId) {
            setLoading(true);
            workoutService.getWorkoutDetails(params.workoutId as string)
                .then(setDetails)
                .finally(() => setLoading(false));
        }
    }, [params.workoutId]);

    // Calcular distribución muscular para el Pie Chart
    const muscleStats = useMemo(() => {
        const counts: Record<string, number> = {};
        musclesWorked.forEach((m: string) => {
            counts[m] = (counts[m] || 0) + 1;
        });
        
        const total = musclesWorked.length || 1;
        return Object.entries(counts).map(([name, count]) => ({
            name,
            percentage: (count / total) * 100,
            value: count
        }));
    }, [musclesWorked]);

    // Simple Pie Chart Generator
    const renderPieChart = () => {
        const radius = 70;
        const strokeWidth = 25;
        const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        let accumulatedAngle = 0;

        return (
            <View className="items-center justify-center py-6">
                <Svg width={200} height={200} viewBox="0 0 200 200">
                    <G rotation="-90" origin="100, 100">
                        {muscleStats.map((stat, index) => {
                            const angle = (stat.percentage / 100) * 360;
                            const x1 = 100 + radius * Math.cos((accumulatedAngle * Math.PI) / 180);
                            const y1 = 100 + radius * Math.sin((accumulatedAngle * Math.PI) / 180);
                            
                            accumulatedAngle += angle;
                            
                            const x2 = 100 + radius * Math.cos((accumulatedAngle * Math.PI) / 180);
                            const y2 = 100 + radius * Math.sin((accumulatedAngle * Math.PI) / 180);
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
                            
                            return (
                                <Path
                                    key={index}
                                    d={d}
                                    fill="none"
                                    stroke={colorPalette[index % colorPalette.length]}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                />
                            );
                        })}
                        {muscleStats.length === 0 && (
                            <Circle cx="100" cy="100" r={radius} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />
                        )}
                    </G>
                </Svg>
                
                {/* Leyenda */}
                <View className="flex-row flex-wrap justify-center mt-6 gap-4">
                    {muscleStats.map((stat, index) => (
                        <View key={index} className="flex-row items-center">
                            <View 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: colorPalette[index % colorPalette.length] }} 
                            />
                            <Text className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest">{stat.name}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-zinc-950">
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Estilo Épico */}
                <View className="px-6 pt-4 pb-12 items-center bg-zinc-900 border-b border-zinc-800 rounded-b-[60]">
                    <TouchableOpacity 
                        onPress={() => router.replace('/(tabs)')}
                        className="self-start p-2 mb-2 bg-zinc-800 rounded-full"
                    >
                        <ChevronLeft size={24} color="#a1a1aa" />
                    </TouchableOpacity>
                    <View className="w-16 h-16 bg-blue-500 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-blue-500/40">
                        <Trophy size={32} color="#fff" />
                    </View>
                    <Text className="text-4xl font-black text-white text-center uppercase tracking-tighter leading-none mb-2">
                        ENTRENO{'\n'}COMPLETADO
                    </Text>
                    <Text className="text-blue-500 font-bold uppercase tracking-[4px] text-xs">¡Buen trabajo, Titan!</Text>
                </View>

                {/* KPIs Principales */}
                <View className="flex-row px-6 mt-[-30] gap-x-4">
                    <View className="flex-1 bg-zinc-900 border border-zinc-800 p-5 rounded-[32] items-center">
                        <Clock size={20} color="#3b82f6" className="mb-2" />
                        <Text className="text-white font-black text-xl">{formatTime(duration)}</Text>
                        <Text className="text-zinc-500 font-bold text-[8px] uppercase tracking-widest mt-1">Duración</Text>
                    </View>

                    <View className="flex-1 bg-zinc-900 border border-zinc-800 p-5 rounded-[32] items-center shadow-2xl shadow-blue-500/10">
                        <Flame size={20} color="#ef4444" className="mb-2" />
                        <Text className="text-white font-black text-xl">{volume} KG</Text>
                        <Text className="text-zinc-500 font-bold text-[8px] uppercase tracking-widest mt-1">Volumen Total</Text>
                    </View>

                    <View className="flex-1 bg-zinc-900 border border-zinc-800 p-5 rounded-[32] items-center">
                        <Dumbbell size={20} color="#10b981" className="mb-2" />
                        <Text className="text-white font-black text-xl">{exerciseCount}</Text>
                        <Text className="text-zinc-500 font-bold text-[8px] uppercase tracking-widest mt-1">Ejercicios</Text>
                    </View>
                </View>

                {/* Gráfico de Músculos Trabajados */}
                <View className="px-6 mt-12 mb-10">
                    <Text className="text-zinc-400 font-black text-lg uppercase tracking-tighter mb-4 text-center">Foco Muscular</Text>
                    <View className="bg-zinc-900/50 border border-zinc-900 rounded-[40] p-6">
                        {renderPieChart()}
                    </View>
                </View>

                {/* Desglose de Ejercicios */}
                {(details || loading) && (
                    <View className="px-6 mb-12">
                        <Text className="text-zinc-400 font-black text-lg uppercase tracking-tighter mb-6 text-center">Detalle del Entrenamiento</Text>
                        <View className="gap-y-6">
                            {details?.workout_exercises?.map((we: any, idx: number) => (
                                <View key={we.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-5">
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-1">
                                            <Text className="text-white font-black text-lg uppercase tracking-tight">{we.exercises_library?.name}</Text>
                                            <Text className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{we.exercises_library?.target_muscle_group}</Text>
                                        </View>
                                        <View className="bg-blue-600/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                                            <Text className="text-blue-400 font-black text-[10px] uppercase">{we.workout_sets?.length} Series</Text>
                                        </View>
                                    </View>
                                    
                                    <View className="gap-y-2">
                                        {we.workout_sets?.map((set: any, sIdx: number) => (
                                            <View key={sIdx} className="flex-row items-center justify-between bg-zinc-950/40 p-3 rounded-2xl border border-zinc-800/30">
                                                <Text className="text-zinc-500 font-black text-[10px] uppercase">Serie {sIdx + 1}</Text>
                                                <View className="flex-row items-center gap-x-4">
                                                    <View className="items-end">
                                                        <Text className="text-white font-black text-sm">{set.weight} <Text className="text-[8px] text-zinc-500">KG</Text></Text>
                                                    </View>
                                                    <View className="w-[1] h-3 bg-zinc-800" />
                                                    <View className="items-end">
                                                        <Text className="text-white font-black text-sm">{set.reps} <Text className="text-[8px] text-zinc-500">REPS</Text></Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Acciones */}
                <View className="px-6 mb-20 gap-y-4">
                    <TouchableOpacity 
                        className="bg-blue-600 h-16 rounded-3xl flex-row items-center justify-center shadow-2xl shadow-blue-500/30"
                        onPress={() => router.replace('/(tabs)')}
                    >
                        <Text className="text-white font-black uppercase tracking-widest">Listo para descansar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="bg-zinc-900 h-16 rounded-3xl flex-row items-center justify-center border border-zinc-800">
                        <Share2 size={20} color="#a1a1aa" className="mr-2" />
                        <Text className="text-zinc-400 font-bold uppercase tracking-widest">Compartir Logro</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
