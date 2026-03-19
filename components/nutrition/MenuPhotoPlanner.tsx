import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, ScrollView,
    ActivityIndicator, Platform, Alert
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Camera, ShoppingCart, RefreshCw, X, ChevronDown, ChevronUp, Image as ImageIcon, FileText } from 'lucide-react-native';
import { ACTIVE_GEMINI_MODELS, analyzeMenuAsset, DayPlan, generateShoppingListFromPlan, ShoppingItem } from '@/lib/menuPlannerService';

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

export default function MenuPhotoPlanner() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [phase, setPhase] = useState<'idle' | 'analyzing' | 'plan' | 'shopping'>('idle');
    const [plan, setPlan] = useState<DayPlan[]>([]);
    const [shopping, setShopping] = useState<ShoppingItem[]>([]);
    const [error, setError] = useState('');
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    const handlePick = async (mode: 'camera' | 'gallery' | 'pdf') => {
        setError('');
        const file = await pickFile(mode);
        if (!file) return;

        setPhase('analyzing');
        try {
            const result = await analyzeMenuAsset(file.base64, file.mimeType);
            if (!result.length) throw new Error('No se pudo generar el plan');
            setPlan(result);
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
            setShopping(list);
            setPhase('shopping');
        } catch {
            setError('Error generando la lista');
            setPhase('plan');
        }
    };

    const handleReset = () => {
        setPlan([]); setShopping([]); setError(''); setExpandedDay(null); setPhase('idle');
    };

    // ─── Render idle ──────────────────────────────────────────────────────────
    const renderIdle = () => (
        <View className="flex-1 items-center justify-center px-8">
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

            {/* 3 botones de acción */}
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
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center justify-between mb-5 pt-4">
                <View>
                    <Text className={`font-black text-2xl uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Plan Semanal</Text>
                    <Text className={`font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Generado por Gemini AI</Text>
                </View>
                <View className="flex-row gap-x-2">
                    <TouchableOpacity onPress={() => handlePick('gallery')} className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-slate-100'}`}>
                        <RefreshCw size={16} color={isDark ? '#e4e4e7' : '#475569'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleReset} className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-slate-100'}`}>
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
                            <View key={i} className={`px-5 py-3 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                <Text className="text-blue-500 font-black text-[10px] uppercase tracking-widest mb-1">{m.meal}</Text>
                                <Text className={`font-medium text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{m.foods}</Text>
                                <Text className={`font-bold text-[10px] mt-1 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>~{m.kcal_approx} kcal</Text>
                            </View>
                        ))}
                    </View>
                );
            })}

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
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center justify-between mb-5 pt-4">
                <View>
                    <Text className={`font-black text-2xl uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Lista de la Compra</Text>
                    <Text className={`font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Organizada por categorías</Text>
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
                        <View key={i} className={`flex-row items-center px-5 py-3 ${i < cat.items.length - 1 ? `border-b ${isDark ? 'border-zinc-800/50' : 'border-slate-50'}` : ''}`}>
                            <View className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
                            <Text className={`font-medium text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{item}</Text>
                        </View>
                    ))}
                </View>
            ))}

            <TouchableOpacity onPress={handleReset} className={`py-4 rounded-[28px] items-center border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <Text className={`font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Nuevo análisis</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
            {phase === 'idle' && renderIdle()}
            {phase === 'analyzing' && renderAnalyzing()}
            {phase === 'plan' && renderPlan()}
            {phase === 'shopping' && renderShopping()}
        </SafeAreaView>
    );
}
