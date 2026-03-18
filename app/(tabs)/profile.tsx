import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { workoutService } from '@/lib/workoutService';
import { supabase } from '@/lib/supabase';
import { User, Ruler, Activity, ChevronRight, Save, LogOut, TrendingUp, Info } from 'lucide-react-native';
import Svg, { Polyline, G, Line } from 'react-native-svg';
import { LineChart } from 'react-native-chart-kit';
import ThemeToggle from '@/components/ThemeToggle';
import { useColorScheme } from 'nativewind';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Mini Gráfico de Línea para Tendencia
const MiniLineChart = ({ data, color }: { data: number[], color: string }) => {
    if (data.length < 2) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const padding = 5;
    const h = 40;
    const w = 80;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((val - min) / range) * (h - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <View className="ml-4">
            <Svg width={w} height={h}>
                <Polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
};

export default function ProfileScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [measurements, setMeasurements] = useState<any>({
        age: '', height: '', weight: '',
        bicep: '', waist: '', hip: '', chest: '', glute: '',
        body_fat: ''
    });
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [latest, fullHistory] = await Promise.all([
                workoutService.getLatestMeasurements(user!.id),
                workoutService.getMeasurementHistory(user!.id)
            ]);

            if (latest) {
                setMeasurements({
                    age: latest.age?.toString() || '',
                    height: latest.height?.toString() || '',
                    weight: latest.weight?.toString() || '',
                    bicep: latest.bicep?.toString() || '',
                    waist: latest.waist?.toString() || '',
                    hip: latest.hip?.toString() || '',
                    chest: latest.chest?.toString() || '',
                    glute: latest.glute?.toString() || '',
                    body_fat: latest.body_fat?.toString() || ''
                });
            }
            setHistory(fullHistory);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const numericData = Object.keys(measurements).reduce((acc: any, key) => {
                acc[key] = parseFloat(measurements[key]) || null;
                return acc;
            }, {});

            await workoutService.updateMeasurements(user!.id, numericData);
            await loadData();
            alert('Perfil actualizado correctamente');
        } catch (e) {
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleResetAll = async () => {
        Alert.alert(
            "BORRADO TOTAL",
            "¿ESTÁS SEGURO? Esta acción borrará TODO tu historial de entrenamientos y mediciones. No se puede deshacer.",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "SÍ, BORRAR TODO", 
                    style: "destructive",
                    onPress: async () => {
                        setSaving(true);
                        try {
                            await workoutService.resetUserData(user!.id);
                            loadData();
                        } catch (e) {
                            console.error(e);
                        } finally {
                            setSaving(false);
                        }
                    } 
                }
            ]
        );
    };

    const renderInput = (label: string, field: string, placeholder: string, unit: string, showTrend: boolean = true) => {
        const fieldHistory = history.map(h => h[field]).filter(v => v !== null);
        const lastValue = fieldHistory.length > 0 ? fieldHistory[fieldHistory.length - 1] : null;
        const isWeight = field === 'weight';
        const chartColor = isWeight ? '#ef4444' : '#3b82f6';

        return (
            <View className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'} border rounded-3xl p-5 mb-4 flex-row items-center justify-between`}>
                <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1 mr-4">
                        <Text className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest">{label}</Text>
                        {lastValue !== null && (
                            <Text className="text-zinc-600 font-bold text-[8px] uppercase tracking-widest">Último: {lastValue}{unit}</Text>
                        )}
                    </View>
                    <View className="flex-row items-end">
                        <TextInput
                            className={`${isDark ? 'text-white' : 'text-slate-900'} font-black text-xl p-0 min-w-[40px]`}
                            value={measurements[field]}
                            onChangeText={(val) => {
                                // Permitir decimales con coma o punto
                                const cleanVal = val.replace(',', '.');
                                setMeasurements({ ...measurements, [field]: cleanVal });
                            }}
                            placeholder={placeholder}
                            placeholderTextColor="#3f3f46"
                            keyboardType="numeric"
                        />
                        <Text className="text-zinc-600 font-bold text-xs ml-1 mb-1">{unit}</Text>
                    </View>
                </View>
                {showTrend && fieldHistory.length > 1 && (
                    <MiniLineChart data={fieldHistory} color={chartColor} />
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'} items-center justify-center`}>
                <ActivityIndicator color={isDark ? '#3b82f6' : '#2563eb'} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
            <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
                {/* Header Profile */}
                <View className="flex-row items-center justify-between mb-10">
                    <View className="flex-row items-center">
                        <View className={`w-16 h-16 ${isDark ? 'bg-zinc-900 border-blue-600' : 'bg-white border-blue-500 shadow-sm'} rounded-full border-2 items-center justify-center p-1`}>
                            <View className={`w-full h-full ${isDark ? 'bg-zinc-800' : 'bg-slate-50'} rounded-full items-center justify-center`}>
                                <User size={24} color={isDark ? '#3b82f6' : '#2563eb'} />
                            </View>
                        </View>
                        <View className="ml-4">
                            <Text className={`font-black text-xl uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.email?.split('@')[0]}</Text>
                            <Text className={`font-bold text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Titan Nivel 1</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        <ThemeToggle />
                        <TouchableOpacity onPress={() => supabase.auth.signOut()} className={`${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'} p-3 rounded-2xl border`}>
                            <LogOut size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Biometría Base */}
                <Text className={`font-black text-lg uppercase tracking-tighter mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Biometría Base</Text>
                
                {/* Gráfica de Peso Pro (Añadido) */}
                <View className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'} border rounded-[40px] p-6 mb-6`}>
                    <View className="flex-row items-center justify-between mb-6">
                        <View>
                            <Text className={`font-black text-xs uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>Evolución de Peso</Text>
                            <Text className={`font-bold text-[9px] uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Últimos registros pro</Text>
                        </View>
                        <View className={`${isDark ? 'bg-blue-600/10' : 'bg-blue-50'} p-2 rounded-xl`}>
                            <TrendingUp size={16} color={isDark ? '#3b82f6' : '#2563eb'} />
                        </View>
                    </View>

                    {history.filter(h => h.weight).length > 1 ? (
                        <LineChart
                            data={{
                                labels: history.filter(h => h.weight).slice(-6).map(h => h.date ? h.date.split('-')[2] : ''),
                                datasets: [{
                                    data: history.filter(h => h.weight).slice(-6).map(h => parseFloat(h.weight)),
                                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                                    strokeWidth: 3
                                }]
                            }}
                            width={SCREEN_WIDTH - 88}
                            height={140}
                            chartConfig={{
                                backgroundColor: isDark ? '#18181b' : '#ffffff',
                                backgroundGradientFrom: isDark ? '#18181b' : '#ffffff',
                                backgroundGradientTo: isDark ? '#18181b' : '#ffffff',
                                decimalPlaces: 1,
                                color: (opacity = 1) => isDark ? `rgba(59, 130, 246, ${opacity})` : `rgba(37, 99, 235, ${opacity})`,
                                labelColor: (opacity = 1) => isDark ? `rgba(161, 161, 170, ${opacity})` : `rgba(100, 116, 139, ${opacity})`,
                                style: { borderRadius: 16 },
                                propsForDots: { r: "4", strokeWidth: "2", stroke: isDark ? "#3b82f6" : "#2563eb" }
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 16 }}
                        />
                    ) : (
                        <View className="h-20 items-center justify-center">
                            <Text className="text-zinc-700 font-bold text-[10px] uppercase tracking-widest">Nuevos datos necesarios para la gráfica</Text>
                        </View>
                    )}
                </View>

                <View className="flex-row gap-x-4 mb-2">
                   <View className="flex-1">{renderInput('Edad', 'age', '0', 'años', false)}</View>
                   <View className="flex-1">{renderInput('Altura', 'height', '0', 'cm', false)}</View>
                </View>
                <View className="flex-row gap-x-4 mb-2">
                    <View className="flex-1">{renderInput('Peso Actual', 'weight', '0', 'kg', false)}</View>
                    <View className="flex-1">{renderInput('Grasa Corp.', 'body_fat', '0', '%', true)}</View>
                </View>
                {/* Medidas Corporales */}
                <View className="flex-row items-center justify-between mt-8 mb-4">
                    <Text className="text-zinc-400 font-black text-lg uppercase tracking-tighter">Medidas Críticas</Text>
                    <TrendingUp size={18} color="#3b82f6" />
                </View>
                
                {renderInput('Perímetro de Brazo', 'bicep', '0', 'cm')}
                {renderInput('Cintura', 'waist', '0', 'cm')}
                {renderInput('Cadera', 'hip', '0', 'cm')}
                {renderInput('Pecho', 'chest', '0', 'cm')}
                {renderInput('Glúteo', 'glute', '0', 'cm')}

                <TouchableOpacity 
                    onPress={handleSave}
                    disabled={saving}
                    className="bg-blue-600 h-16 rounded-3xl flex-row items-center justify-center mt-10 mb-20 shadow-2xl shadow-blue-500/30"
                >
                    {saving ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Save size={20} color="#fff" className="mr-3" />
                            <Text className="text-white font-black uppercase tracking-widest">Guardar Evolución</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={handleResetAll}
                    disabled={saving}
                    className="mb-20 py-4 items-center"
                >
                    <Text className="text-zinc-700 font-bold uppercase tracking-widest text-[10px]">Reiniciar todos los progresos</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
