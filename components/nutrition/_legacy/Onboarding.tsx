import { useColorScheme } from '@/hooks/use-color-scheme';
import { nutritionService } from '@/lib/nutritionService';
import { ActivityLevel, NutritionGoal, Sex, UserNutritionProfile } from '@/types/nutrition';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Keyboard, KeyboardAvoidingView, Platform,
    SafeAreaView, ScrollView, Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native';

interface OnboardingProps {
    userId: string;
    onComplete: (profile: UserNutritionProfile) => void;
}

// ─── Constants ───────────────────────────────────
const GOALS: { key: NutritionGoal; emoji: string; title: string; desc: string }[] = [
    { key: 'Pérdida de Peso', emoji: '🔥', title: 'Perder peso', desc: 'Déficit de 500 kcal/día · ISSN' },
    { key: 'Mantenimiento / Recomposición', emoji: '⚖️', title: 'Recomposición', desc: 'Mantener peso · mejorar composición corporal' },
    { key: 'Ganancia Muscular', emoji: '💪', title: 'Ganar músculo', desc: 'Superávit de 300 kcal/día · ISSN' },
];

const ACTIVITY_LEVELS: { key: ActivityLevel; emoji: string; title: string; desc: string }[] = [
    { key: 'sedentary', emoji: '🛋️', title: 'Sedentario', desc: 'Trabajo de oficina, sin ejercicio' },
    { key: 'light', emoji: '🚶', title: 'Ligero', desc: '1–3 días de ejercicio a la semana' },
    { key: 'moderate', emoji: '🏃', title: 'Moderado', desc: '3–5 días de ejercicio a la semana' },
    { key: 'active', emoji: '🏋️', title: 'Activo', desc: '6–7 días de ejercicio intenso' },
    { key: 'very_active', emoji: '⚡', title: 'Muy activo', desc: 'Atleta profesional o trabajo físico' },
];

const MEALS_OPTIONS = [2, 3, 4, 5];

// ─── Component ───────────────────────────────────
export default function NutritionOnboarding({ userId, onComplete }: OnboardingProps) {
    const isDark = useColorScheme() === 'dark';
    const totalSteps = 7;
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form state
    const [goal, setGoal] = useState<NutritionGoal | null>(null);
    const [sex, setSex] = useState<Sex>('male');
    const [age, setAge] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [weight, setWeight] = useState('');
    const [mealsPerDay, setMealsPerDay] = useState(3);
    const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
    const [trainingDays, setTrainingDays] = useState(3);
    const [intermittentFasting, setIntermittentFasting] = useState(false);
    const [habits, setHabits] = useState('');
    const [lovedFoods, setLovedFoods] = useState('');
    const [dislikedFoods, setDislikedFoods] = useState('');

    const canProceed = (): boolean => {
        if (step === 1) return goal !== null;
        if (step === 2) return age.trim() !== '' && heightCm.trim() !== '' && parseInt(age) > 0;
        if (step === 3) return weight.trim() !== '' && parseFloat(weight) > 0;
        if (step === 4) return activityLevel !== null;
        return true;
    };

    const handleNext = () => {
        if (!canProceed()) return;
        Keyboard.dismiss();
        if (step < totalSteps) setStep(s => s + 1);
        else handleSave();
    };
    const handleBack = () => { if (step > 1) setStep(s => s - 1); };

    const handleSave = async () => {
        if (!goal || !weight || !activityLevel) return;
        setLoading(true);
        try {
            const w = parseFloat(weight);
            const a = parseInt(age);
            const h = parseInt(heightCm);
            if (isNaN(w) || w <= 0) throw new Error('Peso inválido');
            if (isNaN(a) || a < 10 || a > 100) throw new Error('Edad inválida');
            if (isNaN(h) || h < 100 || h > 250) throw new Error('Altura inválida');

            const macros = nutritionService.calculateMacros(w, goal, sex, a, h, activityLevel);

            const profileData: UserNutritionProfile = {
                id: userId,
                goal,
                sex,
                age: a,
                height_cm: h,
                weight_kg: w,
                body_fat_pct: null,
                meals_per_day: mealsPerDay,
                intermittent_fasting: intermittentFasting,
                activity_level: activityLevel,
                training_days: trainingDays,
                habits: habits.trim() || null,
                loved_foods: lovedFoods.trim() || null,
                disliked_foods: dislikedFoods.trim() || null,
                ...macros,
            };

            const saved = await nutritionService.saveNutritionProfile(profileData);
            onComplete(saved);
        } catch (e: any) {
            if (typeof window !== 'undefined') window.alert('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const progressPct = ((step - 1) / (totalSteps - 1)) * 100;

    // ─── Helpers de diseño ───
    const cardBase = isDark
        ? 'bg-zinc-900 border-zinc-800'
        : 'bg-white border-slate-200 shadow-sm shadow-slate-100';

    const pill = (active: boolean) => active
        ? 'border-2 border-blue-500 bg-blue-500/10'
        : `border-2 ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white'}`;

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
            <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

                {/* ── Top bar ── */}
                <View className="px-5 pt-4 pb-2">
                    <View className="flex-row items-center justify-between mb-3">
                        <TouchableOpacity onPress={handleBack} disabled={step === 1}
                            className={`w-9 h-9 rounded-full items-center justify-center ${step > 1 ? (isDark ? 'bg-zinc-800' : 'bg-white border border-slate-200') : 'opacity-0'}`}>
                            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>‹</Text>
                        </TouchableOpacity>
                        <Text className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {step} / {totalSteps}
                        </Text>
                        <View className="w-9" />
                    </View>
                    {/* Progress bar animada */}
                    <View className={`h-1 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                        <View className="h-1 rounded-full bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
                    </View>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">

                    {/* ══ STEP 1: Objetivo ══ */}
                    {step === 1 && (
                        <View className="pt-6">
                            <Text className={`font-black text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>¿Cuál es tu objetivo?</Text>
                            <Text className={`text-sm mb-7 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>La IA calculará tus macros exactos con la fórmula ISSN.</Text>
                            {GOALS.map(g => (
                                <TouchableOpacity key={g.key} onPress={() => setGoal(g.key)}
                                    className={`mb-3 p-5 rounded-2xl border-2 flex-row items-center ${goal === g.key ? 'border-blue-500 bg-blue-500/10' : `${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-100 bg-white'}`}`}>
                                    <Text className="text-3xl mr-4">{g.emoji}</Text>
                                    <View className="flex-1">
                                        <Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{g.title}</Text>
                                        <Text className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>{g.desc}</Text>
                                    </View>
                                    {goal === g.key && <View className="w-5 h-5 rounded-full bg-blue-500 items-center justify-center"><Text className="text-white text-[10px] font-bold">✓</Text></View>}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* ══ STEP 2: Sexo + Edad + Altura ══ */}
                    {step === 2 && (
                        <View className="pt-6">
                            <Text className={`font-black text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Sobre ti</Text>
                            <Text className={`text-sm mb-7 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Datos para calcular tu metabolismo basal real (Mifflin-St Jeor).</Text>

                            {/* Sexo */}
                            <Text className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Sexo biológico</Text>
                            <View className="flex-row gap-x-3 mb-6">
                                {([{ k: 'male' as Sex, l: '♂ Hombre' }, { k: 'female' as Sex, l: '♀ Mujer' }]).map(({ k, l }) => (
                                    <TouchableOpacity key={k} onPress={() => setSex(k)}
                                        className={`flex-1 py-4 rounded-2xl items-center border-2 ${sex === k ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white')}`}>
                                        <Text className={`font-bold text-base ${sex === k ? 'text-blue-500' : (isDark ? 'text-white' : 'text-slate-800')}`}>{l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Edad y Altura */}
                            <View className="flex-row gap-x-3">
                                <View className="flex-1">
                                    <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Edad</Text>
                                    <TextInput value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="28"
                                        placeholderTextColor={isDark ? '#52525b' : '#94a3b8'}
                                        className={`text-2xl font-black text-center py-4 px-4 rounded-2xl ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-slate-900 border border-slate-200'}`} />
                                    <Text className={`text-xs text-center mt-1 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>años</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Altura</Text>
                                    <TextInput value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" placeholder="175"
                                        placeholderTextColor={isDark ? '#52525b' : '#94a3b8'}
                                        className={`text-2xl font-black text-center py-4 px-4 rounded-2xl ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-slate-900 border border-slate-200'}`} />
                                    <Text className={`text-xs text-center mt-1 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>cm</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ══ STEP 3: Peso + Comidas/día ══ */}
                    {step === 3 && (
                        <View className="pt-6">
                            <Text className={`font-black text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Peso y comidas</Text>
                            <Text className={`text-sm mb-7 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>El peso determina las proteínas y grasas mínimas según la ISSN.</Text>

                            <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Peso actual</Text>
                            <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="75"
                                placeholderTextColor={isDark ? '#52525b' : '#94a3b8'}
                                className={`text-4xl font-black text-center py-5 px-6 rounded-2xl mb-1 ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-slate-900 border border-slate-200'}`} />
                            <Text className={`text-xs text-center mb-8 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>kilogramos</Text>

                            <Text className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Comidas por día</Text>
                            <View className="flex-row gap-x-2">
                                {MEALS_OPTIONS.map(n => (
                                    <TouchableOpacity key={n} onPress={() => setMealsPerDay(n)}
                                        className={`flex-1 py-5 rounded-2xl items-center border-2 ${mealsPerDay === n ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white')}`}>
                                        <Text className={`font-black text-3xl ${mealsPerDay === n ? 'text-blue-500' : (isDark ? 'text-white' : 'text-slate-900')}`}>{n}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ══ STEP 4: Actividad + Entrenamiento ══ */}
                    {step === 4 && (
                        <View className="pt-6">
                            <Text className={`font-black text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Tu actividad</Text>
                            <Text className={`text-sm mb-7 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Define el multiplicador de actividad para tu TDEE.</Text>

                            {ACTIVITY_LEVELS.map(a => (
                                <TouchableOpacity key={a.key} onPress={() => setActivityLevel(a.key)}
                                    className={`mb-2 p-4 rounded-2xl border-2 flex-row items-center ${activityLevel === a.key ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-100 bg-white')}`}>
                                    <Text className="text-2xl mr-3">{a.emoji}</Text>
                                    <View className="flex-1">
                                        <Text className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{a.title}</Text>
                                        <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{a.desc}</Text>
                                    </View>
                                    {activityLevel === a.key && <View className="w-5 h-5 rounded-full bg-blue-500 items-center justify-center"><Text className="text-white text-[10px] font-bold">✓</Text></View>}
                                </TouchableOpacity>
                            ))}

                            <Text className={`text-xs font-bold uppercase tracking-widest mt-6 mb-3 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                Días de entrenamiento por semana: <Text className="text-blue-500">{trainingDays}</Text>
                            </Text>
                            <View className="flex-row gap-x-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7].map(d => (
                                    <TouchableOpacity key={d} onPress={() => setTrainingDays(d)}
                                        className={`flex-1 py-3 rounded-xl items-center ${trainingDays === d ? 'bg-blue-600' : (isDark ? 'bg-zinc-800' : 'bg-slate-100')}`}>
                                        <Text className={`font-bold text-sm ${trainingDays === d ? 'text-white' : (isDark ? 'text-zinc-300' : 'text-slate-600')}`}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ══ STEP 5: Ayuno + Hábitos ══ */}
                    {step === 5 && (
                        <View className="pt-6">
                            <Text className={`font-black text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Tu rutina</Text>
                            <Text className={`text-sm mb-7 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>El horario y los hábitos me ayudan a hacerte los menús prácticos.</Text>

                            <View className={`p-5 rounded-2xl border mb-4 flex-row items-center justify-between ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                                <View className="flex-1 mr-4">
                                    <Text className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>⏱ Ayuno intermitente (16:8)</Text>
                                    <Text className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Primera comida a mediodía. No cambia las kcal totales.</Text>
                                </View>
                                <Switch value={intermittentFasting} onValueChange={setIntermittentFasting}
                                    trackColor={{ false: isDark ? '#27272a' : '#e2e8f0', true: '#3b82f6' }} thumbColor="#fff" />
                            </View>

                            {intermittentFasting && (
                                <View className="mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <Text className="text-blue-400 text-xs font-semibold leading-5">
                                        📊 Impacto en adherencia: +15-25%{'\n'}
                                        📊 Impacto metabólico: 0% (la ciencia dice que lo que importa son las kcal totales)
                                    </Text>
                                </View>
                            )}

                            <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Hábitos o circunstancias (opcional)</Text>
                            <TextInput value={habits} onChangeText={setHabits} multiline numberOfLines={3}
                                placeholder="Ej: Los martes como fuera de casa, no tengo tiempo de cocinar entre semana..."
                                placeholderTextColor={isDark ? '#52525b' : '#94a3b8'}
                                className={`p-4 rounded-2xl text-sm ${isDark ? 'bg-zinc-900 text-white border border-zinc-800' : 'bg-white text-slate-900 border border-slate-200'}`}
                                style={{ textAlignVertical: 'top', minHeight: 90 }} />
                        </View>
                    )}

                    {/* ══ STEP 6: Alimentos favoritos ══ */}
                    {step === 6 && (
                        <View className="pt-6">
                            <Text className="text-5xl mb-4">😍</Text>
                            <Text className={`font-black text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>¿Qué te encanta comer?</Text>
                            <Text className={`text-sm mb-7 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>La IA los priorizará siempre que sea posible. Separa por comas.</Text>
                            <TextInput value={lovedFoods} onChangeText={setLovedFoods} multiline numberOfLines={5}
                                placeholder="pollo, arroz, huevos, fruta, queso, pasta, tortillas, lentejas..."
                                placeholderTextColor={isDark ? '#52525b' : '#94a3b8'}
                                className={`p-5 rounded-2xl text-base ${isDark ? 'bg-zinc-900 text-white border border-zinc-800' : 'bg-white text-slate-900 border border-slate-200'}`}
                                style={{ textAlignVertical: 'top', minHeight: 150 }} />
                        </View>
                    )}

                    {/* ══ STEP 7: Alimentos odiados ══ */}
                    {step === 7 && (
                        <View className="pt-6">
                            <Text className="text-5xl mb-4">🙅</Text>
                            <Text className={`font-black text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>¿Qué no puedes ver?</Text>
                            <Text className={`text-sm mb-7 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Estos alimentos NUNCA aparecerán en tus menús. Separa por comas.</Text>
                            <TextInput value={dislikedFoods} onChangeText={setDislikedFoods} multiline numberOfLines={5}
                                placeholder="brócoli, hígado, pescado azul, coliflor, setas..."
                                placeholderTextColor={isDark ? '#52525b' : '#94a3b8'}
                                className={`p-5 rounded-2xl text-base ${isDark ? 'bg-zinc-900 text-white border border-zinc-800' : 'bg-white text-slate-900 border border-slate-200'}`}
                                style={{ textAlignVertical: 'top', minHeight: 150 }} />
                        </View>
                    )}
                </ScrollView>

                {/* ── CTA ── */}
                <View className="px-5 pb-5 pt-2">
                    {loading ? (
                        <View className="py-4 items-center">
                            <ActivityIndicator color="#3b82f6" />
                            <Text className={`text-xs mt-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Guardando tu perfil nutricional...</Text>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={handleNext} disabled={!canProceed()}
                            className={`py-4 rounded-3xl items-center flex-row justify-center ${canProceed() ? 'bg-blue-600' : (isDark ? 'bg-zinc-800' : 'bg-slate-200')}`}
                            style={canProceed() ? { shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 } : {}}>
                            <Text className={`font-black text-lg ${canProceed() ? 'text-white' : (isDark ? 'text-zinc-600' : 'text-slate-400')}`}>
                                {step === totalSteps ? '🚀 Crear mi plan nutricional' : 'Continuar →'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
