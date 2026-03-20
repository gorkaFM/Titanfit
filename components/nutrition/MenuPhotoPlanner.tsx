import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, ScrollView, Modal,
    ActivityIndicator, Platform, Alert
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Camera, ShoppingCart, RefreshCw, X, ChevronDown, ChevronUp, Image as ImageIcon, FileText, CheckSquare, Square, ClipboardList, Utensils } from 'lucide-react-native';
import { ACTIVE_GEMINI_MODELS, analyzeMenuAsset, DayPlan, generateRecipeForMeal, generateShoppingListFromPlan, importPlanToDiary, MealRecipe, ShoppingItem } from '@/lib/menuPlannerService';
import { clearPlannerState, loadPlannerState, PersistedShoppingCategory, savePlannerState } from '@/lib/nutritionPlannerStorage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

// ─── Helpers de selección de imagen / PDF ─────────────────────────────────────

/** Devuelve { base64, mimeType } o null */
async function pickFile(mode: 'camera' | 'gallery' | 'pdf'): Promise<{ base64: string; mimeType: string } | null> {
    if (Platform.OS === 'web') {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            if (mode === 'camera') {
                input.accept = 'image/*';
                (input as any).capture = 'environment';
            } else if (mode === 'gallery') {
                input.accept = 'image/*';
            } else {
                // PDF + images
                input.accept = 'application/pdf,image/*';
            }
            input.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (!file) { resolve(null); return; }
                const mimeType = file.type || 'image/jpeg';
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result as string;
                    const base64 = dataUrl.split(',')[1];
                    resolve({ base64, mimeType });
                };
                reader.readAsDataURL(file);
            };
            input.click();
        });
    }

    // Native
    try {
        if (mode === 'camera') {
            const { launchCameraAsync, MediaTypeOptions, requestCameraPermissionsAsync } = await import('expo-image-picker');
            const { status } = await requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permiso requerido', 'TitanFit necesita acceso a la cámara.'); return null; }
            const result = await launchCameraAsync({ mediaTypes: MediaTypeOptions.Images, base64: true, quality: 0.7 });
            if (result.canceled) return null;
            return { base64: result.assets[0].base64 ?? '', mimeType: 'image/jpeg' };
        } else if (mode === 'gallery') {
            const { launchImageLibraryAsync, MediaTypeOptions, requestMediaLibraryPermissionsAsync } = await import('expo-image-picker');
            const { status } = await requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permiso requerido', 'TitanFit necesita acceso a tu galería.'); return null; }
            const result = await launchImageLibraryAsync({ mediaTypes: MediaTypeOptions.Images, base64: true, quality: 0.7 });
            if (result.canceled) return null;
            return { base64: result.assets[0].base64 ?? '', mimeType: 'image/jpeg' };
        } else {
            // PDF — use expo-document-picker
            const { getDocumentAsync } = await import('expo-document-picker');
            const result = await getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
            if (result.canceled) return null;
            const asset = result.assets[0];
            // Read file as base64
            const { readAsStringAsync } = await import('expo-file-system');
            const base64 = await readAsStringAsync(asset.uri, { encoding: 'base64' as any });
            return { base64, mimeType: asset.mimeType ?? 'application/pdf' };
        }
    } catch (err: any) {
        Alert.alert('Error', err.message ?? 'No se pudo cargar el archivo.');
        return null;
    }
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface MenuPhotoPlannerProps {
    userId: string;
    resetSignal: number;
    resetMode: 'plan' | 'all';
    onTransferToDiary: (focusDate: string) => void;
    onDraftStateChange: (state: { hasDraft: boolean; importedToDiary: boolean }) => void;
}

function toPersistedShopping(shoppingList: ShoppingItem[]): PersistedShoppingCategory[] {
    return shoppingList.map((category, categoryIndex) => ({
        category: category.category,
        items: category.items.map((item, itemIndex) => ({
            id: `${categoryIndex}-${itemIndex}-${item}`,
            label: item,
            checked: false,
        })),
    }));
}

function getMealRecipeKey(day: string, meal: DayPlan['meals'][number]) {
    return `${day}::${meal.meal}::${meal.foods}`;
}

export default function MenuPhotoPlanner({ userId, resetSignal, resetMode, onTransferToDiary, onDraftStateChange }: MenuPhotoPlannerProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const tabBarHeight = useBottomTabBarHeight();

    const [phase, setPhase] = useState<'idle' | 'analyzing' | 'plan' | 'shopping'>('idle');
    const [plan, setPlan] = useState<DayPlan[]>([]);
    const [shopping, setShopping] = useState<PersistedShoppingCategory[]>([]);
    const [recipes, setRecipes] = useState<Record<string, MealRecipe>>({});
    const [error, setError] = useState('');
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const [recipeLoading, setRecipeLoading] = useState(false);
    const [recipeTarget, setRecipeTarget] = useState<{ day: string; meal: DayPlan['meals'][number] } | null>(null);
    const [importedToDiary, setImportedToDiary] = useState(false);
    const [importedDiaryStartDate, setImportedDiaryStartDate] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        let mounted = true;
        loadPlannerState(userId).then((storedState) => {
            if (!mounted || !storedState) return;

            setPlan(storedState.plan);
            setShopping(storedState.shopping);
            setRecipes(storedState.recipes ?? {});
            setExpandedDay(storedState.expandedDay);
            setImportedToDiary(storedState.importedToDiary);
            setImportedDiaryStartDate(storedState.importedDiaryStartDate ?? null);

            if (storedState.shopping.length > 0) {
                setPhase('shopping');
            } else if (storedState.plan.length > 0) {
                setPhase('plan');
            }
        }).finally(() => {
            if (mounted) setHydrated(true);
        });

        return () => {
            mounted = false;
        };
    }, [userId]);

    useEffect(() => {
        if (!hydrated) return;

        const hasPlan = plan.length > 0;
        onDraftStateChange({ hasDraft: hasPlan, importedToDiary });

        if (!hasPlan && shopping.length === 0) {
            return;
        }

        void savePlannerState(userId, {
            plan,
            shopping,
            recipes,
            expandedDay,
            importedToDiary,
            importedDiaryStartDate,
            updatedAt: new Date().toISOString(),
        });
    }, [expandedDay, hydrated, importedDiaryStartDate, importedToDiary, onDraftStateChange, plan, recipes, shopping, userId]);

    const handlePick = async (mode: 'camera' | 'gallery' | 'pdf') => {
        setError('');
        const file = await pickFile(mode);
        if (!file) return;

        setPhase('analyzing');
        try {
            const result = await analyzeMenuAsset(file.base64, file.mimeType);
            if (!result.length) throw new Error('No se pudo generar el plan');
            setPlan(result);
            setShopping([]);
            setRecipes({});
            setRecipeTarget(null);
            setImportedToDiary(false);
            setImportedDiaryStartDate(null);
            setPhase('plan');
            setExpandedDay(result[0]?.day ?? null);
        } catch (e: any) {
            setError(e.message ?? 'Error analizando el archivo');
            setPhase('idle');
        }
    };

    const handleGenerateShopping = async () => {
        setPhase('analyzing');
        try {
            const list = await generateShoppingListFromPlan(plan);
            setShopping(toPersistedShopping(list));
            setPhase('shopping');
        } catch (e: any) {
            setError(e.message ?? 'Error generando la lista');
            setPhase('plan');
        }
    };

    const handleReset = useCallback(({ clearShopping = false }: { clearShopping?: boolean } = {}) => {
        const shouldClearStorage = clearShopping || shopping.length === 0;
        setPlan([]);
        setError('');
        setRecipes({});
        setRecipeTarget(null);
        setExpandedDay(null);
        setImportedToDiary(false);
        setImportedDiaryStartDate(null);
        if (clearShopping) {
            setShopping([]);
        }
        if (shouldClearStorage) {
            void clearPlannerState(userId);
        }
        setPhase(clearShopping || shopping.length === 0 ? 'idle' : 'shopping');
    }, [shopping.length, userId]);

    useEffect(() => {
        if (resetSignal > 0) {
            handleReset({ clearShopping: resetMode === 'all' });
        }
    }, [handleReset, resetMode, resetSignal]);

    const handleImportToDiary = async () => {
        if (importedToDiary) {
            onTransferToDiary(importedDiaryStartDate ?? new Date().toISOString().slice(0, 10));
            return;
        }
        if (plan.length === 0) return;
        setImporting(true);
        setError('');

        try {
            const imported = await importPlanToDiary(userId, plan);
            setImportedToDiary(true);
            setImportedDiaryStartDate(imported.firstDate);
            Alert.alert(
                'Plan trasladado al diario',
                `Se ha guardado desde ${imported.firstDate} hasta ${imported.lastDate}.`
            );
            onTransferToDiary(imported.firstDate);
        } catch (e: any) {
            setError(e.message ?? 'No se pudo trasladar el plan al diario');
        } finally {
            setImporting(false);
        }
    };

    const toggleShoppingItem = (categoryName: string, itemId: string) => {
        setShopping((current) =>
            current.map((category) =>
                category.category === categoryName
                    ? {
                          ...category,
                          items: category.items.map((item) =>
                              item.id === itemId ? { ...item, checked: !item.checked } : item
                          ),
                      }
                    : category
            )
        );
    };

    const handleOpenRecipe = async (day: string, meal: DayPlan['meals'][number]) => {
        const recipeKey = getMealRecipeKey(day, meal);
        setRecipeTarget({ day, meal });

        if (recipes[recipeKey]) {
            return;
        }

        setRecipeLoading(true);
        try {
            const recipe = await generateRecipeForMeal(day, meal);
            setRecipes((current) => ({
                ...current,
                [recipeKey]: recipe,
            }));
        } catch (e: any) {
            setError(e.message ?? 'No se pudo generar la receta');
        } finally {
            setRecipeLoading(false);
        }
    };

    const completedShoppingItems = useMemo(
        () => shopping.reduce((total, category) => total + category.items.filter((item) => item.checked).length, 0),
        [shopping]
    );
    const totalShoppingItems = useMemo(
        () => shopping.reduce((total, category) => total + category.items.length, 0),
        [shopping]
    );
    const activeRecipe = recipeTarget ? recipes[getMealRecipeKey(recipeTarget.day, recipeTarget.meal)] : null;

    // ─── Render idle ──────────────────────────────────────────────────────────
    const renderIdle = () => (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: 32,
                paddingTop: 24,
                paddingBottom: tabBarHeight + 32,
                justifyContent: 'center',
            }}
            showsVerticalScrollIndicator={false}
        >
            <View className="items-center">
                <View className={`w-24 h-24 rounded-full items-center justify-center mb-8 ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-lg border border-slate-100'}`}>
                    <Camera size={40} color="#3b82f6" />
                </View>
                <Text className={`font-black text-2xl text-center uppercase tracking-tighter mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Planifica con IA
                </Text>
                <Text className={`text-center font-medium text-sm leading-relaxed mb-10 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Haz una foto o sube una imagen/PDF de tu menú, receta o lista de alimentos. TitanFit intentará primero el análisis directo y, si falla, activará extracción local de texto para seguir generando el plan.
                </Text>
                <Text className={`text-center font-bold text-[10px] uppercase tracking-widest mb-6 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                    IA activa: {ACTIVE_GEMINI_MODELS.join(' -> ')}
                </Text>

                {shopping.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setPhase('shopping')}
                        className={`w-full px-8 py-4 rounded-[24px] mb-4 flex-row items-center justify-center gap-x-3 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}
                    >
                        <ClipboardList size={18} color="#10b981" />
                        <Text className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Ver lista guardada</Text>
                    </TouchableOpacity>
                )}

                <View className="w-full gap-y-3">
                    <TouchableOpacity
                        onPress={() => handlePick('camera')}
                        className="bg-blue-600 px-8 py-5 rounded-[28px] flex-row items-center justify-center gap-x-3 shadow-xl shadow-blue-500/30"
                        activeOpacity={0.8}
                    >
                        <Camera size={20} color="#ffffff" />
                        <Text className="text-white font-black text-sm uppercase tracking-wider">Hacer Foto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handlePick('gallery')}
                        className={`px-8 py-5 rounded-[28px] flex-row items-center justify-center gap-x-3 border ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200 shadow-sm'}`}
                        activeOpacity={0.8}
                    >
                        <ImageIcon size={20} color="#3b82f6" />
                        <Text className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Cargar Imagen</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handlePick('pdf')}
                        className={`px-8 py-5 rounded-[28px] flex-row items-center justify-center gap-x-3 border ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200 shadow-sm'}`}
                        activeOpacity={0.8}
                    >
                        <FileText size={20} color="#10b981" />
                        <Text className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Adjuntar PDF</Text>
                    </TouchableOpacity>
                </View>

                {error ? (
                    <View className="mt-6 w-full bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
                        <Text className="text-red-500 font-bold text-sm text-center">{error}</Text>
                    </View>
                ) : null}
            </View>
        </ScrollView>
    );

    // ─── Render analyzing ─────────────────────────────────────────────────────
    const renderAnalyzing = () => (
        <View className="flex-1 items-center justify-center px-8">
            <ActivityIndicator color="#3b82f6" size="large" />
            <Text className={`font-black text-lg text-center mt-6 uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Analizando…
            </Text>
            <Text className={`font-medium text-sm text-center mt-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                TitanFit está leyendo el archivo y generando tu plan semanal
            </Text>
        </View>
    );

    // ─── Render plan ──────────────────────────────────────────────────────────
    const renderPlan = () => (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarHeight + 32 }} showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center justify-between mb-5 pt-4">
                <View>
                    <Text className={`font-black text-2xl uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Plan Semanal</Text>
                    <Text className={`font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Generado por Gemini AI</Text>
                </View>
                <View className="flex-row gap-x-2">
                    <TouchableOpacity onPress={() => handlePick('gallery')} className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-slate-100'}`}>
                        <RefreshCw size={16} color={isDark ? '#e4e4e7' : '#475569'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleReset()} className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-slate-100'}`}>
                        <X size={16} color={isDark ? '#e4e4e7' : '#475569'} />
                    </TouchableOpacity>
                </View>
            </View>

            {plan.map(dayPlan => {
                const expanded = expandedDay === dayPlan.day;
                const dayKcal = dayPlan.meals.reduce((s, m) => s + m.kcal_approx, 0);
                return (
                    <View key={dayPlan.day} className={`rounded-[28px] mb-3 border overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <TouchableOpacity
                            onPress={() => setExpandedDay(expanded ? null : dayPlan.day)}
                            className="flex-row items-center justify-between px-5 py-4"
                        >
                            <View>
                                <Text className={`font-black text-base uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>{dayPlan.day}</Text>
                                <Text className={`font-bold text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>~{dayKcal} kcal</Text>
                            </View>
                            {expanded ? <ChevronUp size={18} color={isDark ? '#52525b' : '#94a3b8'} /> : <ChevronDown size={18} color={isDark ? '#52525b' : '#94a3b8'} />}
                        </TouchableOpacity>
                        {expanded && dayPlan.meals.map((m, i) => (
                            <View
                                key={i}
                                className={`px-5 py-3 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}
                            >
                                <View className="flex-row items-start justify-between gap-x-3">
                                    <View className="flex-1">
                                        <Text className="text-blue-500 font-black text-[10px] uppercase tracking-widest mb-1">{m.meal}</Text>
                                        <Text className={`font-medium text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{m.foods}</Text>
                                        <Text className={`font-bold text-[10px] mt-1 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>~{m.kcal_approx} kcal</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleOpenRecipe(dayPlan.day, m)}
                                        className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-950 border border-zinc-800' : 'bg-slate-50 border border-slate-200'}`}
                                    >
                                        <FileText size={16} color="#3b82f6" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                );
            })}

            {error ? (
                <View className="mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
                    <Text className="text-red-500 font-bold text-sm text-center">{error}</Text>
                </View>
            ) : null}

            <TouchableOpacity
                onPress={handleImportToDiary}
                disabled={importing}
                className="bg-blue-600 mb-3 py-5 rounded-[32px] flex-row items-center justify-center gap-x-3 shadow-xl shadow-blue-500/20"
                activeOpacity={0.85}
            >
                {importing ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <>
                        <ClipboardList size={22} color="#ffffff" />
                        <Text className="text-white font-black text-base uppercase tracking-wider">
                            {importedToDiary ? 'Abrir en Diario' : 'Llevar al Diario'}
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleGenerateShopping}
                className="bg-emerald-600 mt-2 py-5 rounded-[32px] flex-row items-center justify-center gap-x-3 shadow-xl shadow-emerald-500/20"
                activeOpacity={0.85}
            >
                <ShoppingCart size={22} color="#ffffff" />
                <Text className="text-white font-black text-base uppercase tracking-wider">Generar Lista de la Compra</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    // ─── Render shopping list ─────────────────────────────────────────────────
    const renderShopping = () => (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarHeight + 32 }} showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center justify-between mb-5 pt-4">
                <View>
                    <Text className={`font-black text-2xl uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Lista de la Compra</Text>
                    <Text className={`font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Organizada por categorías · {completedShoppingItems}/{totalShoppingItems}</Text>
                </View>
                <TouchableOpacity onPress={() => setPhase('plan')} className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-slate-100'}`}>
                    <X size={16} color={isDark ? '#e4e4e7' : '#475569'} />
                </TouchableOpacity>
            </View>

            {shopping.map(cat => (
                <View key={cat.category} className={`rounded-[28px] mb-4 border overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <View className={`px-5 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                        <Text className={`font-black text-sm uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>{cat.category}</Text>
                    </View>
                    {cat.items.map((item, i) => (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => toggleShoppingItem(cat.category, item.id)}
                            className={`flex-row items-center px-5 py-3 ${i < cat.items.length - 1 ? `border-b ${isDark ? 'border-zinc-800/50' : 'border-slate-50'}` : ''}`}
                            activeOpacity={0.8}
                        >
                            {item.checked ? (
                                <CheckSquare size={18} color="#10b981" />
                            ) : (
                                <Square size={18} color={isDark ? '#71717a' : '#94a3b8'} />
                            )}
                            <Text className={`font-medium text-sm ml-3 ${item.checked ? 'line-through text-zinc-500' : (isDark ? 'text-zinc-300' : 'text-slate-700')}`}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ))}

            {error ? (
                <View className="mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
                    <Text className="text-red-500 font-bold text-sm text-center">{error}</Text>
                </View>
            ) : null}

            <TouchableOpacity onPress={() => handleReset({ clearShopping: true })} className={`py-4 rounded-[28px] items-center border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <Text className={`font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Borrar lista guardada</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
            {phase === 'idle' && renderIdle()}
            {phase === 'analyzing' && renderAnalyzing()}
            {phase === 'plan' && renderPlan()}
            {phase === 'shopping' && renderShopping()}
            <Modal visible={!!recipeTarget} animationType="slide" transparent onRequestClose={() => setRecipeTarget(null)}>
                <View className="flex-1 bg-black/70 justify-end">
                    <View className={`rounded-t-[32px] px-6 pt-6 pb-10 max-h-[85%] ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                        <View className="flex-row items-start justify-between mb-5 gap-x-4">
                            <View className="flex-1">
                                <Text className={`font-bold text-[10px] uppercase tracking-[3px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                    {recipeTarget?.day} · {recipeTarget?.meal.meal}
                                </Text>
                                <Text className={`font-black text-2xl mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {activeRecipe?.title ?? recipeTarget?.meal.meal}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setRecipeTarget(null)}
                                className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-white border border-slate-200'}`}
                            >
                                <X size={16} color={isDark ? '#e4e4e7' : '#475569'} />
                            </TouchableOpacity>
                        </View>

                        {recipeLoading && !activeRecipe ? (
                            <View className="py-16 items-center justify-center">
                                <ActivityIndicator color="#3b82f6" />
                                <Text className={`mt-4 font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                    Generando receta paso a paso...
                                </Text>
                            </View>
                        ) : activeRecipe ? (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View className={`rounded-[28px] border p-5 mb-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <View className="flex-row items-center mb-4">
                                        <Utensils size={16} color="#3b82f6" />
                                        <Text className={`font-black text-sm uppercase tracking-widest ml-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            Ingredientes
                                        </Text>
                                    </View>
                                    {activeRecipe.ingredients.map((ingredient, index) => (
                                        <Text key={`${ingredient}-${index}`} className={`font-medium text-sm mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                                            • {ingredient}
                                        </Text>
                                    ))}
                                </View>

                                <View className={`rounded-[28px] border p-5 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <Text className={`font-black text-sm uppercase tracking-widest mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        Preparación
                                    </Text>
                                    {activeRecipe.steps.map((step, index) => (
                                        <View key={`${step}-${index}`} className="flex-row items-start mb-4">
                                            <View className="w-7 h-7 rounded-full bg-blue-600 items-center justify-center mt-0.5">
                                                <Text className="text-white font-black text-[11px]">{index + 1}</Text>
                                            </View>
                                            <Text className={`flex-1 ml-3 font-medium text-sm leading-6 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                                                {step}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
