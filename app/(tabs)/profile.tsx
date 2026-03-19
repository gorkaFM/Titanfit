import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { workoutService } from '@/lib/workoutService';
import { supabase } from '@/lib/supabase';
import { User, Ruler, Activity, ChevronRight, Save, LogOut, TrendingUp, Info, Target, Flame } from 'lucide-react-native';
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
    const [nutritionTargets, setNutritionTargets] = useState({
        daily_kcal: '2000',
        protein_pct: '30',
        carbs_pct: '45',
        fat_pct: '25',
    });

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
                // Load nutrition targets if stored
                if (latest.daily_kcal) {
                    setNutritionTargets({
                        daily_kcal: latest.daily_kcal.toString(),
                        protein_pct: (latest.protein_pct ?? 30).toString(),
                        carbs_pct:   (latest.carbs_pct   ?? 45).toString(),
                        fat_pct:     (latest.fat_pct     ?? 25).toString(),
                    });
                }
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

            // Include nutrition targets in the save payload
            const macroSum = parseFloat(nutritionTargets.protein_pct) +
                             parseFloat(nutritionTargets.carbs_pct) +
                             parseFloat(nutritionTargets.fat_pct);
            if (Math.abs(macroSum - 100) > 1) {
                alert(`Los macros deben sumar 100% (ahora suman ${macroSum}%)`);
                setSaving(false);
                return;
            }

            await workoutService.updateMeasurements(user!.id, {
                ...numericData,
                daily_kcal:  parseFloat(nutritionTargets.daily_kcal)  || 2000,
                protein_pct: parseFloat(nutritionTargets.protein_pct) || 30,
                carbs_pct:   parseFloat(nutritionTargets.carbs_pct)   || 45,
                fat_pct:     parseFloat(nutritionTargets.fat_pct)     || 25,
            });
            await loadData();
            alert('Perfil actualizado correctamente');
        } catch (e: any) {
            const msg = e?.message ?? JSON.stringify(e) ?? 'Error desconocido';
            alert(`Error al guardar:\n${msg}`);
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
        <ScrollView
            className="flex-1 px-6 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
        >
                {/* Header Profile */}
                <View className="flex-row items-center mb-10">
                    {/* Avatar + name — flex-1 + min-w-0 so it shrinks before pushing buttons off */}
                    <View className="flex-row items-center flex-1 min-w-0 mr-3">
                        <View className={`w-14 h-14 flex-shrink-0 ${isDark ? 'bg-zinc-900 border-blue-600' : 'bg-white border-blue-500 shadow-sm'} rounded-full border-2 items-center justify-center p-1`}>
                            <View className={`w-full h-full ${isDark ? 'bg-zinc-800' : 'bg-slate-50'} rounded-full items-center justify-center`}>
                                <User size={22} color={isDark ? '#3b82f6' : '#2563eb'} />
                            </View>
                        </View>
                        <View className="ml-3 flex-1 min-w-0">
                            <Text
                                className={`font-black text-base uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {user?.email?.split('@')[0]}
                            </Text>
                            <Text className={`font-bold text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Titan Nivel 1</Text>
                        </View>
                    </View>
                    {/* Actions — flex-shrink-0 so they never get pushed */}
                    <View className="flex-row items-center flex-shrink-0 gap-x-2">
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

                {/* ── Objetivos Nutricionales ── */}
                <View className="flex-row items-center justify-between mt-10 mb-4">
                    <Text className={`font-black text-lg uppercase tracking-tighter ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Objetivos Nutricionales</Text>
                    <Target size={18} color="#3b82f6" />
                </View>

                {/* kcal diarias */}
                <View className={`border rounded-3xl p-5 mb-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <Text className={`font-bold text-[9px] uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Calorías diarias objetivo</Text>
                    <View className="flex-row items-end">
                        <TextInput
                            className={`font-black text-3xl p-0 ${isDark ? 'text-white' : 'text-slate-900'}`}
                            value={nutritionTargets.daily_kcal}
                            onChangeText={v => setNutritionTargets(t => ({ ...t, daily_kcal: v.replace(/[^0-9]/g, '') }))}
                            keyboardType="numeric"
                            placeholderTextColor={isDark ? '#3f3f46' : '#cbd5e1'}
                        />
                        <Text className={`font-bold text-sm ml-2 mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>kcal / día</Text>
                    </View>
                    {/* Desglose de macros en gramos */}
                    {(() => {
                        const kcal = parseFloat(nutritionTargets.daily_kcal) || 2000;
                        const p = Math.round(kcal * (parseFloat(nutritionTargets.protein_pct) / 100) / 4);
                        const c = Math.round(kcal * (parseFloat(nutritionTargets.carbs_pct) / 100) / 4);
                        const f = Math.round(kcal * (parseFloat(nutritionTargets.fat_pct) / 100) / 9);
                        return (
                            <View className="flex-row gap-x-4 mt-4">
                                {[{ l: 'Proteína', v: p, col: '#3b82f6' }, { l: 'Carbos', v: c, col: '#10b981' }, { l: 'Grasa', v: f, col: '#f59e0b' }].map(m => (
                                    <View key={m.l} className="flex-1 items-center">
                                        <Text className="font-black text-lg" style={{ color: m.col }}>{m.v}g</Text>
                                        <Text className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{m.l}</Text>
                                    </View>
                                ))}
                            </View>
                        );
                    })()}
                </View>

                {/* Distribución de macros en % */}
                {(() => {
                    const sum = parseFloat(nutritionTargets.protein_pct || '0') +
                                parseFloat(nutritionTargets.carbs_pct   || '0') +
                                parseFloat(nutritionTargets.fat_pct     || '0');
                    const ok = Math.abs(sum - 100) <= 1;
                    return (
                        <View className={`border rounded-3xl p-5 mb-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className={`font-bold text-[9px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Distribución de Macros (%)</Text>
                                <View className={`px-2 py-1 rounded-full ${ok ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                    <Text className={`font-black text-[10px] ${ok ? 'text-emerald-500' : 'text-red-500'}`}>{Math.round(sum)}%</Text>
                                </View>
                            </View>
                            {[
                                { label: 'Proteína', key: 'protein_pct' as const, color: '#3b82f6' },
                                { label: 'Carbohidratos', key: 'carbs_pct'   as const, color: '#10b981' },
                                { label: 'Grasas',        key: 'fat_pct'     as const, color: '#f59e0b' },
                            ].map(m => (
                                <View key={m.key} className="flex-row items-center mb-3">
                                    <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: m.color }} />
                                    <Text className={`font-bold text-xs w-28 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{m.label}</Text>
                                    <TextInput
                                        className={`font-black text-lg w-14 text-right ${isDark ? 'text-white' : 'text-slate-900'}`}
                                        value={nutritionTargets[m.key]}
                                        onChangeText={v => setNutritionTargets(t => ({ ...t, [m.key]: v.replace(/[^0-9]/g, '') }))}
                                        keyboardType="numeric"
                                        placeholderTextColor={isDark ? '#3f3f46' : '#cbd5e1'}
                                    />
                                    <Text className={`font-bold text-sm ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>%</Text>
                                    <View className="flex-1 ml-3 h-1.5 rounded-full overflow-hidden bg-zinc-800/20">
                                        <View className="h-full rounded-full" style={{
                                            width: `${Math.min(parseFloat(nutritionTargets[m.key]) || 0, 100)}%`,
                                            backgroundColor: m.color
                                        }} />
                                    </View>
                                </View>
                            ))}
                            {!ok && <Text className="text-red-500 font-bold text-[10px] text-center mt-1">Los macros deben sumar exactamente 100%</Text>}
                        </View>
                    );
                })()}

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
