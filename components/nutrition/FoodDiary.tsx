import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
    View, Text, ScrollView, TouchableOpacity, SafeAreaView,
    ActivityIndicator
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Plus, Trash2, ChevronLeft, ChevronRight, Zap } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { MealLogItem, NUTRI_SCORE_COLORS } from '@/lib/foodSearchService';
import FoodSearchModal from './FoodSearchModal';
import ThemeToggle from '@/components/ThemeToggle';

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface MealSection {
    id: string;
    meal_type: string;
    meal_label: string;
    sort_order: number;
    items: (MealLogItem & { id: string })[];
}

const DEFAULT_MEALS = [
    { meal_type: 'desayuno', meal_label: 'Desayuno', sort_order: 0 },
    { meal_type: 'comida', meal_label: 'Comida', sort_order: 1 },
    { meal_type: 'merienda', meal_label: 'Merienda', sort_order: 2 },
    { meal_type: 'cena', meal_label: 'Cena', sort_order: 3 },
] as const;

const EXTRA_MEAL_OPTIONS = [
    { meal_type: 'pre_entreno', meal_label: 'Pre-entreno' },
    { meal_type: 'post_entreno', meal_label: 'Post-entreno' },
    { meal_type: 'snack', meal_label: 'Snack' },
    { meal_type: 'extra', meal_label: 'Extra' },
];

interface Props {
    userId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateToISO(d: Date) {
    return d.toISOString().slice(0, 10);
}

function formatDate(d: Date) {
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── MacroRing visual ─────────────────────────────────────────────────────────

function MacroBar({ label, value, max, color, unit = 'g' }: {
    label: string; value: number; max: number; color: string; unit?: string
}) {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    return (
        <View className="flex-1 mx-1">
            <View className="flex-row justify-between mb-1">
                <Text className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{label}</Text>
                <Text className="text-[9px] font-black" style={{ color }}>{value}{unit}</Text>
            </View>
            <View className="h-1.5 rounded-full bg-zinc-800/30 overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
            </View>
        </View>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FoodDiary({ userId }: Props) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [date, setDate] = useState(new Date());
    const [meals, setMeals] = useState<MealSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTarget, setSearchTarget] = useState<MealSection | null>(null);
    const [showAddMealMenu, setShowAddMealMenu] = useState(false);
    const [targets, setTargets] = useState({ kcal: 2000, protein: 150, carbs: 225, fat: 56 });

    // Reload nutrition targets every time this screen is focused
    useFocusEffect(
        useCallback(() => {
            (async () => {
                try {
                    const { data } = await supabase
                        .from('user_measurements')
                        .select('daily_kcal, protein_pct, carbs_pct, fat_pct')
                        .eq('user_id', userId)
                        .order('date', { ascending: false })
                        .limit(1)
                        .single();
                    if (!data?.daily_kcal) return;
                    const kcal = data.daily_kcal;
                    setTargets({
                        kcal,
                        protein: Math.round(kcal * ((data.protein_pct ?? 30) / 100) / 4),
                        carbs:   Math.round(kcal * ((data.carbs_pct   ?? 45) / 100) / 4),
                        fat:     Math.round(kcal * ((data.fat_pct     ?? 25) / 100) / 9),
                    });
                } catch {} // fallback to defaults silently
            })();
        }, [userId])
    );

    // ─── Carga datos del día ──────────────────────────────────────────────────

    const loadDay = useCallback(async () => {
        setLoading(true);
        try {
            const isoDate = dateToISO(date);

            // Cargar meal_logs del día
            const { data: logsData, error: logsErr } = await supabase
                .from('meal_logs')
                .select('*')
                .eq('user_id', userId)
                .eq('date', isoDate)
                .order('sort_order');

            if (logsErr) throw logsErr;

            let sections: MealSection[] = [];

            if (!logsData || logsData.length === 0) {
                // Primera vez: crear secciones por defecto en DB
                const inserts = DEFAULT_MEALS.map(m => ({ ...m, user_id: userId, date: isoDate }));
                const { data: inserted } = await supabase.from('meal_logs').insert(inserts).select();
                sections = (inserted || []).map(row => ({ ...row, items: [] }));
            } else {
                // Cargar items por cada sección
                const logIds = logsData.map(l => l.id);
                const { data: itemsData } = await supabase
                    .from('meal_log_items')
                    .select('*')
                    .in('meal_log_id', logIds);

                sections = logsData.map(log => ({
                    ...log,
                    items: (itemsData || []).filter(i => i.meal_log_id === log.id),
                }));
            }

            setMeals(sections);
        } catch (e) {
            console.error('[FoodDiary] loadDay error:', e);
        } finally {
            setLoading(false);
        }
    }, [date, userId]);

    useEffect(() => { loadDay(); }, [loadDay]);

    // ─── Añadir alimento a una comida ─────────────────────────────────────────

    const handleAddItem = async (mealLogId: string, item: MealLogItem) => {
        try {
            const { data, error } = await supabase
                .from('meal_log_items')
                .insert({ ...item, meal_log_id: mealLogId, user_id: userId })
                .select()
                .single();
            if (error) throw error;
            setMeals(prev => prev.map(m =>
                m.id === mealLogId ? { ...m, items: [...m.items, data] } : m
            ));
        } catch (e) {
            console.error('[FoodDiary] addItem error:', e);
        }
    };

    // ─── Borrar alimento ──────────────────────────────────────────────────────

    const handleDeleteItem = async (mealLogId: string, itemId: string) => {
        try {
            await supabase.from('meal_log_items').delete().eq('id', itemId);
            setMeals(prev => prev.map(m =>
                m.id === mealLogId ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m
            ));
        } catch (e) {
            console.error('[FoodDiary] deleteItem error:', e);
        }
    };

    // ─── Añadir nueva sección de comida ───────────────────────────────────────

    const handleAddMealSection = async (type: string, label: string) => {
        setShowAddMealMenu(false);
        try {
            const isoDate = dateToISO(date);
            const sort = Math.max(...meals.map(m => m.sort_order), 0) + 1;
            const { data, error } = await supabase
                .from('meal_logs')
                .insert({ user_id: userId, date: isoDate, meal_type: type, meal_label: label, sort_order: sort })
                .select()
                .single();
            if (error) throw error;
            setMeals(prev => [...prev, { ...data, items: [] }]);
        } catch (e) {
            console.error('[FoodDiary] addSection error:', e);
        }
    };

    // ─── Totales del día ──────────────────────────────────────────────────────

    const dayTotals = meals.reduce((acc, m) => {
        m.items.forEach(i => {
            acc.kcal += i.kcal ?? 0;
            acc.protein += i.protein_g ?? 0;
            acc.carbs += i.carbs_g ?? 0;
            acc.fat += i.fat_g ?? 0;
        });
        return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

    // Targets are now loaded from the user profile

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
            {/* Header */}
            <View className={`flex-row items-center justify-between px-6 pt-2 pb-4 border-b ${isDark ? 'border-zinc-900' : 'border-slate-200'}`}>
                <View className="flex-1">
                    <Text className={`font-bold text-[10px] uppercase tracking-[4px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Diario</Text>
                    <Text className={`font-black text-2xl uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Nutrición</Text>
                </View>
                <ThemeToggle />
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Navegador de fecha */}
                <View className="flex-row items-center justify-between mb-5">
                    <TouchableOpacity
                        onPress={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }}
                        className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-white shadow-sm'}`}
                    >
                        <ChevronLeft size={20} color={isDark ? '#e4e4e7' : '#0f172a'} />
                    </TouchableOpacity>
                    <Text className={`font-black text-sm capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatDate(date)}
                    </Text>
                    <TouchableOpacity
                        onPress={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }}
                        className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-white shadow-sm'}`}
                    >
                        <ChevronRight size={20} color={isDark ? '#e4e4e7' : '#0f172a'} />
                    </TouchableOpacity>
                </View>

                {/* Resumen global del día */}
                <View className={`rounded-[32px] p-5 mb-5 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <View className="flex-row items-center mb-4">
                        <View className="bg-blue-500/10 p-2 rounded-xl mr-3">
                            <Zap size={18} color="#3b82f6" fill="#3b82f6" />
                        </View>
                        <View>
                            <Text className={`font-black text-2xl leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {Math.round(dayTotals.kcal)}
                            </Text>
                            <Text className={`font-bold text-[9px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                kcal de {targets.kcal}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row">
                        <MacroBar label="Proteína" value={Math.round(dayTotals.protein)} max={targets.protein} color="#3b82f6" />
                        <MacroBar label="Carbos" value={Math.round(dayTotals.carbs)} max={targets.carbs} color="#10b981" />
                        <MacroBar label="Grasas" value={Math.round(dayTotals.fat)} max={targets.fat} color="#f59e0b" />
                    </View>
                </View>

                {/* Secciones de comida */}
                {loading ? (
                    <View className="py-20 items-center">
                        <ActivityIndicator color="#3b82f6" />
                    </View>
                ) : (
                    meals.map(meal => {
                        const mealKcal = meal.items.reduce((s, i) => s + (i.kcal ?? 0), 0);
                        return (
                            <View
                                key={meal.id}
                                className={`rounded-[28px] mb-4 border overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}
                            >
                                {/* Cabecera de sección */}
                                <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                    <View>
                                        <Text className={`font-black uppercase text-sm tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {meal.meal_label}
                                        </Text>
                                        {mealKcal > 0 && (
                                            <Text className={`font-bold text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                {Math.round(mealKcal)} kcal
                                            </Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setSearchTarget(meal)}
                                        className="bg-blue-600 w-9 h-9 rounded-full items-center justify-center"
                                    >
                                        <Plus size={18} color="#ffffff" strokeWidth={3} />
                                    </TouchableOpacity>
                                </View>

                                {/* Items */}
                                {meal.items.length === 0 ? (
                                    <View className="px-5 py-4">
                                        <Text className={`font-medium text-sm ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}>
                                            Toca + para añadir alimentos
                                        </Text>
                                    </View>
                                ) : (
                                    meal.items.map((item, idx) => (
                                        <View
                                            key={item.id}
                                            className={`flex-row items-center justify-between px-5 py-3.5 ${idx < meal.items.length - 1 ? `border-b ${isDark ? 'border-zinc-800/50' : 'border-slate-50'}` : ''}`}
                                        >
                                            <View className="flex-1 mr-3">
                                                <View className="flex-row items-center gap-x-2 mb-0.5">
                                                    <Text className={`font-bold text-sm flex-1 ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                                                        {item.name}
                                                    </Text>
                                                    {item.nutri_score && NUTRI_SCORE_COLORS[item.nutri_score] && (
                                                        <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: NUTRI_SCORE_COLORS[item.nutri_score].bg }}>
                                                            <Text className="font-black text-[9px]" style={{ color: NUTRI_SCORE_COLORS[item.nutri_score].text }}>
                                                                {item.nutri_score}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text className={`text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                    {item.quantity_g}g · {item.kcal} kcal · P {item.protein_g}g · C {item.carbs_g}g · G {item.fat_g}g
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteItem(meal.id, item.id)}
                                                className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}
                                            >
                                                <Trash2 size={14} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </View>
                        );
                    })
                )}

                {/* Añadir nueva sección de comida */}
                {showAddMealMenu ? (
                    <View className={`rounded-[28px] border overflow-hidden mb-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        {EXTRA_MEAL_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.meal_type}
                                onPress={() => handleAddMealSection(opt.meal_type, opt.meal_label)}
                                className={`flex-row items-center px-5 py-4 border-b last:border-b-0 ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}
                            >
                                <Plus size={16} color="#3b82f6" />
                                <Text className={`ml-3 font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{opt.meal_label}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            onPress={() => setShowAddMealMenu(false)}
                            className={`flex-row items-center justify-center px-5 py-4 ${isDark ? 'border-t border-zinc-800' : 'border-t border-slate-100'}`}
                        >
                            <Text className={`font-bold text-sm ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => setShowAddMealMenu(true)}
                        className={`flex-row items-center justify-center gap-x-3 py-4 rounded-[28px] border mb-4 ${isDark ? 'bg-zinc-900/50 border-zinc-800 border-dashed' : 'bg-white border-slate-200 border-dashed'}`}
                    >
                        <Plus size={18} color={isDark ? '#3f3f46' : '#94a3b8'} />
                        <Text className={`font-bold text-sm ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>Añadir comida extra</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Modal de búsqueda de alimentos */}
            {searchTarget && (
                <FoodSearchModal
                    visible={!!searchTarget}
                    mealLabel={searchTarget.meal_label}
                    onClose={() => setSearchTarget(null)}
                    onAddItem={(item) => {
                        handleAddItem(searchTarget.id, item);
                        setSearchTarget(null);
                    }}
                />
            )}
        </SafeAreaView>
    );
}
