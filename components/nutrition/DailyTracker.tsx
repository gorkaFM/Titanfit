import { useColorScheme } from 'nativewind';
import { nutritionService } from '@/lib/nutritionService';
import { supabase } from '@/lib/supabase';
import { NutritionMeal, UserNutritionProfile } from '@/types/nutrition';
import { Award, ChevronRight, Copy, Dumbbell, Lock, Moon, RotateCcw, ShoppingCart, Unlock, Utensils, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import ShoppingList from './ShoppingList';
import ThemeToggle from '../ThemeToggle';

// ─── Theme: Freeletics dark + teal (Híbrido Dinámico) ───
const getTheme = (isDark: boolean) => ({
    bg: isDark ? '#000000' : '#f8fafc',
    card: isDark ? '#111111' : '#ffffff',
    cardHover: isDark ? '#1a1a1a' : '#f1f5f9',
    border: isDark ? '#1c1c1c' : '#f1f5f9',
    teal: '#00D4AA',
    tealDim: '#00D4AA20',
    tealMed: '#00D4AA40',
    amber: '#F5A623',
    amberDim: '#F5A62320',
    red: '#FF4757',
    text: isDark ? '#FFFFFF' : '#0f172a',
    textSecondary: isDark ? '#a1a1aa' : '#64748b',
    textMuted: isDark ? '#52525b' : '#94a3b8',
    cardShadow: isDark ? 'none' : 'rgba(0, 0, 0, 0.05)',
});

// Cross-platform helpers
const showAlert = (title: string, msg: string) => {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${msg}`);
};
const showConfirm = (title: string, msg: string, onOk: () => void) => {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${msg}`)) onOk();
};

// ─── Week helpers ───
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_LABELS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function getMondayOfWeek(d: Date): string {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return date.toISOString().split('T')[0];
}
function getTodayDayIndex(): number {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
}
function getDateForDayIndex(weekStart: string, idx: number): string {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + idx);
    return d.toISOString().split('T')[0];
}

// ─── Macro helpers ───
function macroPct(g: number, calPerGram: number, totalCals: number): string {
    if (totalCals <= 0) return '0%';
    return Math.round((g * calPerGram / totalCals) * 100) + '%';
}

// ─── Macro Ring (Freeletics circular progress) ───
function MacroRing({ value, max, color, label, size = 56, theme }: {
    value: number; max: number; color: string; label: string; size?: number; theme: any;
}) {
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.min(value / (max || 1), 1);
    return (
        <View style={{ alignItems: 'center' }}>
            <Svg width={size} height={size}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.border} strokeWidth="4" fill="none" />
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="4" fill="none"
                    strokeDasharray={`${c}`} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
                    rotation="-90" origin={`${size / 2}, ${size / 2}`} />
            </Svg>
            <View style={{ position: 'absolute', width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontWeight: '900', fontSize: 11, color }}>{value}</Text>
            </View>
            <Text style={{ fontSize: 8, fontWeight: '700', color: theme.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
        </View>
    );
}

// ─── Meal Types with Freeletics-style visual ───
const MEAL_COLORS: Record<string, string> = {
    Desayuno: '#F5A623',
    'Media Mañana': '#00D4AA',
    Comida: '#3B82F6',
    Merienda: '#A855F7',
    Cena: '#6366F1',
    Snack: '#EC4899',
};
const MEAL_EMOJIS: Record<string, string> = {
    Desayuno: '🌅',
    'Media Mañana': '🍎',
    Comida: '🍽️',
    Merienda: '☕',
    Cena: '🌙',
    Snack: '🥜',
};
const MEAL_SIZE_LABELS: Record<string, string> = {
    Desayuno: 'SIZE S',
    'Media Mañana': 'SIZE XS',
    Comida: 'SIZE M',
    Merienda: 'SIZE XS',
    Cena: 'SIZE M',
    Snack: 'SIZE XS',
};

// ─── MealCard (Freeletics inspired) ───
function MealCard({ meal, onLockToggle, onCompleteToggle, onReroll, onOpenRecipe, onDuplicate, theme }: {
    meal: NutritionMeal;
    onLockToggle: (id: string, current: boolean) => void;
    onCompleteToggle: (id: string, current: boolean) => void;
    onReroll: (meal: NutritionMeal) => void;
    onOpenRecipe: (meal: NutritionMeal) => void;
    onDuplicate: (meal: NutritionMeal) => void;
    theme: any;
}) {
    const color = MEAL_COLORS[meal.meal_type] ?? theme.teal;
    const emoji = MEAL_EMOJIS[meal.meal_type] ?? '🍴';
    const sizeLabel = MEAL_SIZE_LABELS[meal.meal_type] ?? 'SIZE S';
    const totalCal = meal.calories || 1;

    return (
        <TouchableOpacity
            onPress={() => onOpenRecipe(meal)}
            activeOpacity={0.7}
            style={{
                marginBottom: 12, borderRadius: 16, overflow: 'hidden',
                backgroundColor: theme.card,
                borderWidth: 1, borderColor: theme.border,
                elevation: theme.cardShadow !== 'none' ? 2 : 0,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: theme.cardShadow !== 'none' ? 0.05 : 0,
                shadowRadius: 8,
                opacity: meal.is_completed ? 0.5 : 1,
            }}
        >
            {/* Card content */}
            <View style={{ padding: 16 }}>
                {/* Top row: emoji + type + actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 28, marginRight: 12 }}>{emoji}</Text>
                        <View>
                            <Text style={{ fontWeight: '800', fontSize: 14, color: theme.text, letterSpacing: -0.3 }}>
                                {meal.meal_type}
                            </Text>
                            <View style={{ 
                                marginTop: 3, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4,
                                backgroundColor: color, alignSelf: 'flex-start',
                            }}>
                                <Text style={{ fontSize: 8, fontWeight: '900', color: '#000', letterSpacing: 1 }}>{sizeLabel}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Actions: compact row */}
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); onDuplicate(meal); }}
                            style={{ padding: 8, borderRadius: 10, backgroundColor: theme.cardHover }}>
                            <Copy size={12} color={theme.textSecondary} />
                        </TouchableOpacity>
                        {!meal.is_locked && (
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); onReroll(meal); }}
                                style={{ padding: 8, borderRadius: 10, backgroundColor: theme.cardHover }}>
                                <RotateCcw size={12} color={theme.textSecondary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); onLockToggle(meal.id, meal.is_locked); }}
                            style={{ 
                                padding: 8, borderRadius: 10,
                                backgroundColor: meal.is_locked ? theme.amberDim : theme.cardHover,
                            }}>
                            {meal.is_locked ? <Lock size={12} color={theme.amber} /> : <Unlock size={12} color={theme.textMuted} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Meal name */}
                <Text style={{ 
                    fontWeight: '700', fontSize: 15, color: theme.text, marginBottom: 12,
                    textDecorationLine: meal.is_completed ? 'line-through' : 'none',
                }}>
                    {meal.meal_name}
                </Text>

                {/* Macros strip */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                    {[
                        { label: 'kcal', val: `${meal.calories}`, pct: '', cl: color },
                        { label: 'prot', val: `${meal.protein}g`, pct: macroPct(meal.protein, 4, totalCal), cl: '#60a5fa' },
                        { label: 'carbs', val: `${meal.carbs}g`, pct: macroPct(meal.carbs, 4, totalCal), cl: theme.amber },
                        { label: 'grasa', val: `${meal.fats}g`, pct: macroPct(meal.fats, 9, totalCal), cl: theme.red },
                    ].map(m => (
                        <View key={m.label} style={{ 
                            flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                            backgroundColor: theme.bg,
                            borderWidth: 1, borderColor: theme.border,
                        }}>
                            <Text style={{ fontSize: 7, fontWeight: '800', color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>{m.label}</Text>
                            <Text style={{ fontWeight: '900', fontSize: 13, color: m.cl, marginTop: 2 }}>{m.val}</Text>
                            {m.pct !== '' && <Text style={{ fontSize: 9, fontWeight: '600', color: m.cl, opacity: 0.6, marginTop: 1 }}>{m.pct}</Text>}
                        </View>
                    ))}
                </View>

                {/* Complete button */}
                <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); onCompleteToggle(meal.id, meal.is_completed); }}
                    style={{ 
                        paddingVertical: 11, borderRadius: 12, alignItems: 'center',
                        backgroundColor: meal.is_completed ? theme.teal : theme.cardHover,
                    }}>
                    <Text style={{ 
                        fontWeight: '700', fontSize: 12, letterSpacing: 0.5,
                        color: meal.is_completed ? '#000' : theme.textSecondary,
                    }}>
                        {meal.is_completed ? '✓ COMIDO' : 'MARCAR COMO COMIDO'}
                    </Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

// ─── Recipe Modal (Freeletics dark) ───
function RecipeModal({ meal, visible, onClose, theme }: {
    meal: NutritionMeal | null; visible: boolean; onClose: () => void; theme: any;
}) {
    if (!meal) return null;
    const color = MEAL_COLORS[meal.meal_type] ?? theme.teal;
    const emoji = MEAL_EMOJIS[meal.meal_type] ?? '🍴';
    const totalCal = meal.calories || 1;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
                {/* Top accent line */}
                <View style={{ height: 3, backgroundColor: color }} />

                {/* Header */}
                <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color, marginBottom: 4 }}>{emoji} {meal.meal_type}</Text>
                            <Text style={{ fontWeight: '900', fontSize: 22, color: theme.text }}>{meal.meal_name}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.card }}>
                            <Text style={{ fontWeight: '700', color: theme.text }}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={{ flex: 1, paddingHorizontal: 24 }}>
                    {/* Macros grid */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                        {[{ l: 'KCAL', v: meal.calories, p: '', c: color },
                          { l: 'PROT', v: `${meal.protein}g`, p: macroPct(meal.protein, 4, totalCal), c: '#60a5fa' },
                          { l: 'CARBS', v: `${meal.carbs}g`, p: macroPct(meal.carbs, 4, totalCal), c: theme.amber },
                          { l: 'GRAS', v: `${meal.fats}g`, p: macroPct(meal.fats, 9, totalCal), c: theme.red }
                        ].map(m => (
                            <View key={m.l} style={{ flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', backgroundColor: theme.card }}>
                                <Text style={{ fontSize: 8, fontWeight: '700', color: theme.textMuted, letterSpacing: 1 }}>{m.l}</Text>
                                <Text style={{ fontWeight: '900', fontSize: 20, marginTop: 4, color: m.c }}>{m.v}</Text>
                                {m.p !== '' && <Text style={{ fontSize: 10, fontWeight: '600', color: m.c, opacity: 0.7, marginTop: 2 }}>{m.p}</Text>}
                            </View>
                        ))}
                    </View>

                    {/* Recipe */}
                    <View style={{ padding: 20, borderRadius: 16, backgroundColor: theme.card }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Utensils size={16} color={color} />
                            <Text style={{ fontWeight: '800', fontSize: 14, marginLeft: 8, color: theme.text }}>Receta</Text>
                        </View>
                        <Text style={{ fontSize: 14, lineHeight: 24, color: theme.textSecondary }}>{meal.recipe_text || 'Sin receta disponible.'}</Text>
                    </View>
                    <View style={{ height: 80 }} />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

// ─── Day Picker Modal (for duplication) ───
function DayPickerModal({ visible, onClose, onSelect, currentDay, theme }: {
    visible: boolean; onClose: () => void; onSelect: (dayIdx: number) => void; currentDay: number; theme: any;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center' }}
                activeOpacity={1} onPress={onClose}>
                <View style={{ width: 320, borderRadius: 20, padding: 24, backgroundColor: theme.card }}>
                    <Text style={{ fontWeight: '900', fontSize: 17, textAlign: 'center', color: theme.text, marginBottom: 4 }}>
                        Copiar a otro día
                    </Text>
                    <Text style={{ fontSize: 12, textAlign: 'center', color: theme.textSecondary, marginBottom: 20 }}>
                        Sustituirá la comida del mismo tipo
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                        {DAY_LABELS_FULL.map((label, idx) => (
                            <TouchableOpacity key={idx}
                                disabled={idx === currentDay}
                                onPress={() => { onSelect(idx); onClose(); }}
                                style={{
                                    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
                                    backgroundColor: idx === currentDay ? theme.cardHover : theme.teal,
                                    opacity: idx === currentDay ? 0.3 : 1,
                                    minWidth: 90, alignItems: 'center',
                                }}>
                                <Text style={{
                                    fontWeight: '700', fontSize: 12,
                                    color: idx === currentDay ? theme.textMuted : '#000',
                                }}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
                        <Text style={{ fontWeight: '600', color: theme.textSecondary }}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
interface DailyTrackerProps {
    userId: string;
    profile: UserNutritionProfile;
    openScanner: () => void;
    onResetProfile: () => void;
}

export default function DailyTracker({ userId, profile, openScanner, onResetProfile }: DailyTrackerProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const T = getTheme(isDark);

    const weekStart = getMondayOfWeek(new Date());
    const todayDayIdx = getTodayDayIndex();

    const [selectedDay, setSelectedDay] = useState(todayDayIdx);
    const [weekPlans, setWeekPlans] = useState<any[]>([]);
    const [meals, setMeals] = useState<NutritionMeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generateProgress, setGenerateProgress] = useState(0);
    const [resetting, setResetting] = useState(false);
    const [rerollingId, setRerollingId] = useState<string | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<NutritionMeal | null>(null);
    const [recipeVisible, setRecipeVisible] = useState(false);
    const [shoppingVisible, setShoppingVisible] = useState(false);
    const [duplicateMealData, setDuplicateMealData] = useState<NutritionMeal | null>(null);
    const [dayPickerVisible, setDayPickerVisible] = useState(false);

    // ─── Data loading ───
    const loadWeek = useCallback(async () => {
        setLoading(true);
        try {
            const plans = await nutritionService.getWeeklyPlans(userId, weekStart);
            setWeekPlans(plans);
            const dayDate = getDateForDayIndex(weekStart, selectedDay);
            const dayPlan = plans.find((p: any) => p.date === dayDate);
            setMeals(dayPlan?.nutrition_meals ?? []);
        } catch (e) { console.error('loadWeek error:', e); }
        finally { setLoading(false); }
    }, [userId, weekStart, selectedDay]);

    useEffect(() => { loadWeek(); }, [loadWeek]);
    useEffect(() => {
        if (weekPlans.length === 0) return;
        const dayDate = getDateForDayIndex(weekStart, selectedDay);
        const dayPlan = weekPlans.find((p: any) => p.date === dayDate);
        setMeals(dayPlan?.nutrition_meals ?? []);
    }, [selectedDay, weekPlans, weekStart]);

    // Current day info
    const currentDayDate = getDateForDayIndex(weekStart, selectedDay);
    const currentDayPlan = weekPlans.find((p: any) => p.date === currentDayDate);
    const isTraining = currentDayPlan?.is_training_day ?? false;
    const dayTargetKcal = isTraining
        ? (profile.target_calories_training ?? profile.target_calories)
        : (profile.target_calories_rest ?? profile.target_calories);

    const completedMeals = meals.filter(m => m.is_completed).length;
    const totalMeals = meals.length;

    // Consumed macros
    const done = meals.filter(m => m.is_completed);
    const consumedCals = done.reduce((a, m) => a + m.calories, 0);
    const consumedProt = done.reduce((a, m) => a + m.protein, 0);
    const consumedCarbs = done.reduce((a, m) => a + m.carbs, 0);
    const consumedFats = done.reduce((a, m) => a + m.fats, 0);

    const hasWeekPlan = weekPlans.length > 0;

    // ─── Handlers ───
    const handleToggleTraining = async () => {
        if (!currentDayPlan) return;
        try {
            const updated = await nutritionService.toggleTrainingDay(currentDayPlan.id, !isTraining, profile);
            setWeekPlans(prev => prev.map(p => p.id === currentDayPlan.id ? { ...p, ...updated } : p));
        } catch (e: any) { showAlert('Error', e.message); }
    };

    const handleGenerateWeek = async () => {
        setGenerating(true);
        setGenerateProgress(0);
        const errors: string[] = [];
        const accNames: string[] = [];
        try {
            for (let idx = 0; idx < 7; idx++) {
                const label = DAY_LABELS_FULL[idx];
                try {
                    const mealsData = await nutritionService._generateOneDayMeals(profile, label, idx, accNames);
                    if (mealsData.length === 0) throw new Error('Array vacío');
                    accNames.push(...mealsData.map(m => m.meal_name));
                    const date = getDateForDayIndex(weekStart, idx);
                    const plan = await nutritionService.upsertDailyPlan(userId, date, profile);
                    await supabase.from('nutrition_meals').delete().eq('plan_id', plan.id);
                    await nutritionService.saveMeals(plan.id, mealsData);
                } catch (err: any) { errors.push(`${label}: ${err?.message || 'Error'}`); }
                setGenerateProgress(idx + 1);
                if (idx < 6) await new Promise(r => setTimeout(r, 3000));
            }
            await loadWeek();
            if (errors.length > 0) showAlert('⚠️', `${7 - errors.length}/7 días OK.\n${errors.join('\n')}`);
        } catch (e: any) { showAlert('Error', e.message); }
        finally { setGenerating(false); setGenerateProgress(0); }
    };

    const handleReroll = async (meal: NutritionMeal) => {
        setRerollingId(meal.id);
        try {
            const others = meals.filter(m => m.id !== meal.id);
            const newD = await nutritionService.rerollMeal(profile, meal.meal_type,
                Math.max(0, dayTargetKcal - others.reduce((a, m) => a + m.calories, 0)),
                Math.max(0, profile.target_protein - others.reduce((a, m) => a + m.protein, 0)),
                Math.max(0, profile.target_carbs - others.reduce((a, m) => a + m.carbs, 0)),
                Math.max(0, profile.target_fats - others.reduce((a, m) => a + m.fats, 0)),
            );
            if (newD) {
                const { data: u } = await supabase.from('nutrition_meals')
                    .update({ ...newD, plan_id: currentDayPlan?.id, meal_type: meal.meal_type })
                    .eq('id', meal.id).select().single();
                if (u) setMeals(prev => prev.map(m => m.id === meal.id ? u as NutritionMeal : m));
            }
        } catch (e: any) { showAlert('Error', e.message); }
        finally { setRerollingId(null); }
    };

    const handleDuplicate = async (targetIdx: number) => {
        if (!duplicateMealData) return;
        try {
            const date = getDateForDayIndex(weekStart, targetIdx);
            let tp = weekPlans.find((p: any) => p.date === date);
            if (!tp) tp = await nutritionService.upsertDailyPlan(userId, date, profile);
            await nutritionService.duplicateMeal(duplicateMealData, tp.id);
            showAlert('✅', `${duplicateMealData.meal_type} → ${DAY_LABELS_FULL[targetIdx]}`);
            await loadWeek();
        } catch (e: any) { showAlert('Error', e.message); }
        setDuplicateMealData(null);
    };

    const handleLockToggle = async (id: string, c: boolean) => {
        await nutritionService.toggleMealLock(id, !c);
        setMeals(prev => prev.map(m => m.id === id ? { ...m, is_locked: !m.is_locked } : m));
    };
    const handleCompleteToggle = async (id: string, c: boolean) => {
        await nutritionService.toggleMealComplete(id, !c);
        setMeals(prev => prev.map(m => m.id === id ? { ...m, is_completed: !m.is_completed } : m));
    };
    const handleResetProfile = () => {
        showConfirm('Reiniciar', 'Se borrarán tus preferencias y macros.',
            async () => {
                setResetting(true);
                try { await nutritionService.deleteNutritionProfile(userId); onResetProfile(); }
                catch (e: any) { showAlert('Error', e.message); }
                finally { setResetting(false); }
            });
    };

    // ═══════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
            {/* ── HEADER ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0, backgroundColor: T.bg }}>
                {/* Week selector row (Freeletics style) */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    {DAY_LABELS.map((label, idx) => {
                        const isSelected = idx === selectedDay;
                        const isToday = idx === todayDayIdx;
                        const hasData = weekPlans.some((p: any) => p.date === getDateForDayIndex(weekStart, idx));
                        const isDayTraining = weekPlans.find((p: any) => p.date === getDateForDayIndex(weekStart, idx))?.is_training_day;
                        return (
                            <TouchableOpacity key={idx} onPress={() => setSelectedDay(idx)}
                                style={{
                                    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: isSelected ? T.teal : 'transparent',
                                    borderWidth: isToday && !isSelected ? 1.5 : 0,
                                    borderColor: T.tealMed,
                                }}>
                                <Text style={{
                                    fontSize: 13, fontWeight: '800',
                                    color: isSelected ? '#000' : (hasData ? T.text : T.textMuted),
                                }}>
                                    {label}
                                </Text>
                                {isDayTraining && !isSelected && (
                                    <View style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: T.amber }} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Daily total + star counter */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Total del día
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontWeight: '900', fontSize: 28, color: T.text, marginTop: 2 }}>
                                {consumedCals}
                                <Text style={{ fontSize: 14, fontWeight: '600', color: T.textMuted }}> / {dayTargetKcal} kcal</Text>
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        <ThemeToggle />
                        {totalMeals > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: T.text }}>
                                    {completedMeals} de {totalMeals}
                                </Text>
                                <View style={{
                                    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: completedMeals === totalMeals ? T.teal : T.tealDim,
                                }}>
                                    <Award size={16} color={completedMeals === totalMeals ? '#000' : T.teal} />
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Training toggle */}
                {currentDayPlan && (
                    <TouchableOpacity onPress={handleToggleTraining}
                        style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                            paddingVertical: 10, borderRadius: 12, marginBottom: 12,
                            backgroundColor: isTraining ? T.amberDim : T.card,
                            borderWidth: isTraining ? 1 : 0, borderColor: T.amber + '40',
                        }}>
                        {isTraining ? <Dumbbell size={14} color={T.amber} /> : <Moon size={14} color={T.textSecondary} />}
                        <Text style={{ marginLeft: 8, fontWeight: '700', fontSize: 12, color: isTraining ? T.amber : T.textSecondary }}>
                            {isTraining ? 'DÍA DE ENTRENAMIENTO' : 'DÍA DE DESCANSO'}
                        </Text>
                        <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: isTraining ? T.amber + '30' : T.cardHover }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: isTraining ? T.amber : T.textMuted }}>{dayTargetKcal}</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Macro rings row */}
                <View style={{
                    flexDirection: 'row', justifyContent: 'space-around',
                    paddingVertical: 12, marginBottom: 8, borderRadius: 14, backgroundColor: T.card,
                }}>
                    <MacroRing value={consumedProt} max={profile.target_protein} color="#60a5fa" label="Prot" theme={T} />
                    <MacroRing value={consumedCarbs} max={profile.target_carbs} color={T.amber} label="Carbs" theme={T} />
                    <MacroRing value={consumedFats} max={profile.target_fats} color={T.red} label="Grasa" theme={T} />
                </View>
            </View>

            {/* ── CONTENT ── */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color={T.teal} size="large" />
                </View>
            ) : (
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    {meals.length === 0 ? (
                        !hasWeekPlan ? (
                            /* Empty state */
                            <View style={{ borderRadius: 20, padding: 40, alignItems: 'center', backgroundColor: T.card, marginTop: 20 }}>
                                <Text style={{ fontSize: 48, marginBottom: 16 }}>⚡</Text>
                                <Text style={{ fontWeight: '900', fontSize: 20, color: T.text, marginBottom: 6, textAlign: 'center' }}>
                                    Tu semana te espera
                                </Text>
                                <Text style={{ textAlign: 'center', fontSize: 13, color: T.textSecondary, marginBottom: 28, lineHeight: 20 }}>
                                    Genera tu plan nutricional de 7 días adaptado a tus macros y preferencias personales.
                                </Text>
                                <TouchableOpacity onPress={handleGenerateWeek} disabled={generating}
                                    style={{
                                        paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14,
                                        flexDirection: 'row', alignItems: 'center',
                                        backgroundColor: T.teal, opacity: generating ? 0.8 : 1,
                                    }}>
                                    {generating
                                        ? <><ActivityIndicator color="#000" size="small" /><Text style={{ color: '#000', fontWeight: '800', marginLeft: 8, fontSize: 14 }}>{generateProgress}/7 días...</Text></>
                                        : <><Zap size={18} color="#000" /><Text style={{ color: '#000', fontWeight: '900', fontSize: 14, marginLeft: 8, letterSpacing: 0.5 }}>GENERAR SEMANA</Text></>
                                    }
                                </TouchableOpacity>
                                {generating && (
                                    <View style={{ marginTop: 16, width: '80%' }}>
                                        <View style={{ height: 4, borderRadius: 2, backgroundColor: T.border }}>
                                            <View style={{ height: 4, borderRadius: 2, backgroundColor: T.teal, width: `${(generateProgress / 7) * 100}%` }} />
                                        </View>
                                        <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center', marginTop: 6 }}>
                                            Generando con variedad día a día...
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={{ borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: T.card, marginTop: 20 }}>
                                <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                                <Text style={{ fontWeight: '700', fontSize: 14, color: T.textSecondary }}>Sin comidas para este día</Text>
                            </View>
                        )
                    ) : (
                        <>
                            {meals.map(meal => (
                                <View key={meal.id} style={{ opacity: rerollingId === meal.id ? 0.4 : 1 }}>
                                    {rerollingId === meal.id && (
                                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: 'center', alignItems: 'center' }}>
                                            <ActivityIndicator color={T.teal} />
                                        </View>
                                    )}
                                    <MealCard
                                        meal={meal}
                                        onLockToggle={handleLockToggle}
                                        onCompleteToggle={handleCompleteToggle}
                                        onReroll={handleReroll}
                                        onOpenRecipe={m => { setSelectedMeal(m); setRecipeVisible(true); }}
                                        onDuplicate={m => { setDuplicateMealData(m); setDayPickerVisible(true); }}
                                        theme={T}
                                    />
                                </View>
                            ))}

                            {/* Bottom actions */}
                            <View style={{ gap: 8, marginTop: 4, marginBottom: 16 }}>
                                <TouchableOpacity onPress={() => setShoppingVisible(true)}
                                    style={{
                                        paddingVertical: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: T.card,
                                    }}>
                                    <ShoppingCart size={14} color={T.teal} />
                                    <Text style={{ fontWeight: '700', fontSize: 13, marginLeft: 8, color: T.teal }}>LISTA DE LA COMPRA</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={handleGenerateWeek} disabled={generating}
                                    style={{
                                        paddingVertical: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: T.card, opacity: generating ? 0.5 : 1,
                                    }}>
                                    {generating
                                        ? <><ActivityIndicator color={T.teal} size="small" /><Text style={{ color: T.teal, fontWeight: '700', marginLeft: 8, fontSize: 13 }}>REGENERANDO {generateProgress}/7...</Text></>
                                        : <><RotateCcw size={13} color={T.textSecondary} /><Text style={{ color: T.textSecondary, fontWeight: '700', marginLeft: 8, fontSize: 13 }}>REGENERAR SEMANA</Text></>
                                    }
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* Modals */}
            <RecipeModal meal={selectedMeal} visible={recipeVisible} onClose={() => setRecipeVisible(false)} theme={T} />
            <ShoppingList visible={shoppingVisible} onClose={() => setShoppingVisible(false)} weekPlans={weekPlans} isDark={isDark} />
            <DayPickerModal visible={dayPickerVisible} onClose={() => setDayPickerVisible(false)} onSelect={handleDuplicate} currentDay={selectedDay} theme={T} />
        </SafeAreaView>
    );
}
