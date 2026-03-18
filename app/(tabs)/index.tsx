import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { workoutService } from '@/lib/workoutService';
import { Zap, Info, Trophy, TrendingUp, Calendar, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Svg from 'react-native-svg';
import ThemeToggle from '@/components/ThemeToggle';
import { useColorScheme } from 'nativewind';

const { width } = Dimensions.get('window');

import { BodyHeatmap } from '@/components/BodyHeatmap';

export default function DashboardScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const { user } = useAuth();
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{ totalVolume: number, workoutsCount: number, muscleDistribution: Record<string, number> } | null>(null);

    const loadStats = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await workoutService.getDashboardStats(user.id, period);
            setStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, [user, period]);

    const heatmapData = useMemo(() => {
        // Fallback para visualización inmediata si no hay datos reales
        const defaultMock = { 
            'Pecho': 30, 
            'Espalda': 25, 
            'Piernas': 15, 
            'Hombros': 10, 
            'Brazos': 20, 
            'Core': 5 
        };
        
        const d = (stats?.muscleDistribution && Object.keys(stats.muscleDistribution).length > 0) 
            ? stats.muscleDistribution 
            : defaultMock;

        return {
            chest: d['Pecho'] || 0,
            back: d['Espalda'] || 0,
            legs: d['Piernas'] || 0,
            shoulders: d['Hombros'] || 0,
            arms: d['Brazos'] || 0,
            core: d['Core'] || 0
        };
    }, [stats]);

    const periods = [
        { id: 'week', label: 'Semana' },
        { id: 'month', label: 'Mes' },
        { id: 'year', label: 'Año' },
    ];

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
            <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-8">
                    <View>
                        <Text className={`font-bold text-xs uppercase tracking-[4px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Elite Dashboard</Text>
                        <Text className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Tu Progreso</Text>
                    </View>
                    <View className="flex-row items-center">
                        <ThemeToggle />
                        <TouchableOpacity 
                            onPress={() => router.push('/stats')}
                            className="w-12 h-12 bg-blue-600 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/20"
                        >
                            <TrendingUp size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Period Selector (Pills) */}
                <View className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'} flex-row p-1.5 rounded-3xl mb-8 border`}>
                    {periods.map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            onPress={() => setPeriod(p.id as any)}
                            className={`flex-1 py-3 rounded-2xl items-center ${period === p.id ? 'bg-blue-600 shadow-xl' : ''}`}
                        >
                            <Text className={`font-black text-[10px] uppercase tracking-widest ${period === p.id ? 'text-white' : (isDark ? 'text-zinc-500' : 'text-slate-400')}`}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <View className="py-20">
                        <ActivityIndicator color="#3b82f6" size="large" />
                    </View>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <View className="flex-row gap-x-4 mb-8">
                            <View className={`${isDark ? 'bg-zinc-900 border-zinc-800 shadow-blue-500/5' : 'bg-white border-slate-100 shadow-sm'} flex-1 border p-6 rounded-[32px] shadow-2xl`}>
                                <View className="bg-blue-500/10 w-10 h-10 rounded-xl items-center justify-center mb-4">
                                    <Trophy size={20} color="#3b82f6" />
                                </View>
                                <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black text-3xl leading-none`}>{stats?.workoutsCount}</Text>
                                <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-bold text-[9px] uppercase tracking-widest mt-2`}>Éxitos</Text>
                            </View>
                            <View className={`${isDark ? 'bg-zinc-900 border-zinc-800 shadow-blue-500/5' : 'bg-white border-slate-100 shadow-sm'} flex-1 border p-6 rounded-[32px] shadow-2xl`}>
                                <View className="bg-emerald-500/10 w-10 h-10 rounded-xl items-center justify-center mb-4">
                                    <Zap size={20} color="#10b981" />
                                </View>
                                <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black text-3xl leading-none`}>{(stats?.totalVolume || 0).toLocaleString()}</Text>
                                <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-bold text-[9px] uppercase tracking-widest mt-2`}>Tonelaje total (kg)</Text>
                            </View>
                        </View>

                        {/* Muscle Heatmap Card */}
                        <View className={`${isDark ? 'bg-zinc-900 border-zinc-800 shadow-blue-500/5' : 'bg-white border-slate-100 shadow-sm'} border rounded-[40px] p-6 mb-8 shadow-2xl`}>
                            <View className="flex-row items-center justify-between mb-8 px-2">
                                <View>
                                    <Text className={`font-black text-lg uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Análisis Muscular</Text>
                                    <Text className={`font-bold text-[10px] uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Carga acumulada por grupos</Text>
                                </View>
                                <View className={`${isDark ? 'bg-zinc-800/50' : 'bg-slate-50'} p-2 rounded-full`}>
                                    <Info size={16} color="#3b82f6" />
                                </View>
                            </View>
                            <View className={`items-center justify-center rounded-[32px] py-4 border ${isDark ? 'bg-zinc-950/30 border-zinc-800/50' : 'bg-slate-50 border-slate-100'}`}>
                                <BodyHeatmap stats={heatmapData} />
                                {/* Leyenda de Intensidad Pro */}
                                <View className={`flex-row justify-center gap-6 mt-6 py-4 border-t w-full px-6 ${isDark ? 'border-zinc-900/50' : 'border-slate-100'}`}>
                                    {[
                                        { label: 'Frío', color: '#1e40af' },
                                        { label: 'Templado', color: '#10b981' },
                                        { label: 'Caliente', color: '#f97316' },
                                        { label: 'Máximo', color: '#ef4444' }
                                    ].map((item) => (
                                        <View key={item.label} className="flex-row items-center">
                                            <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                                            <Text className={`text-[8px] font-black uppercase tracking-wider ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{item.label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Quick Start Action (NUEVO - Posición Corregida) */}
                        <TouchableOpacity
                            onPress={() => router.push('/workouts/active')}
                            activeOpacity={0.8}
                            className="mb-12 overflow-hidden rounded-[32px] bg-blue-600 shadow-2xl shadow-blue-500/30"
                        >
                            <View className="p-8 flex-row items-center justify-between">
                                <View>
                                    <Text className="text-white font-black text-2xl uppercase tracking-tighter">Iniciar Entrenamiento</Text>
                                    <Text className="text-white/70 font-bold text-[10px] uppercase tracking-widest mt-1">Registrar sesión de hoy</Text>
                                </View>
                                <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
                                    <Plus size={28} color="#ffffff" strokeWidth={3} />
                                </View>
                            </View>
                        </TouchableOpacity>
                        
                        <View className="h-32" />
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
