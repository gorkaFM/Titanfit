import React, { useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, ScrollView,
    ActivityIndicator, Platform, Image, Alert
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Camera, Sparkles, ShoppingCart, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react-native';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DayPlan {
    day: string;
    meals: { meal: string; foods: string; kcal_approx: number }[];
}

interface ShoppingItem {
    category: string;
    items: string[];
}

// ─── Helper: captura foto (web vs native) ─────────────────────────────────────

async function pickImageOrPhoto(): Promise<string | null> {
    if (Platform.OS === 'web') {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            input.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (!file) { resolve(null); return; }
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(file);
            };
            input.click();
        });
    } else {
        try {
            const { launchCameraAsync, MediaTypeOptions, requestCameraPermissionsAsync } = require('expo-image-picker');
            const { status } = await requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permiso requerido', 'TitanFit necesita acceso a la cámara.'); return null; }
            const result = await launchCameraAsync({ mediaTypes: MediaTypeOptions.Images, base64: true, quality: 0.7 });
            if (result.canceled) return null;
            return result.assets[0].base64 ?? null;
        } catch {
            Alert.alert('Error', 'expo-image-picker no está disponible.'); return null;
        }
    }
}

// ─── Llamada a Gemini Vision ──────────────────────────────────────────────────

async function analyzeMenuImage(base64Image: string): Promise<DayPlan[]> {
    const prompt = `Eres un nutricionista experto. Analiza la imagen de este menú y genera un plan semanal de 7 días siguiendo los mismos alimentos y estilo de cocina que se ven en la imagen.
    
Responde SOLO con un JSON válido con esta estructura exacta:
{
  "plan": [
    {
      "day": "Lunes",
      "meals": [
        { "meal": "Desayuno", "foods": "descripción de alimentos", "kcal_approx": 350 },
        { "meal": "Comida", "foods": "descripción de alimentos", "kcal_approx": 600 },
        { "meal": "Merienda", "foods": "descripción de alimentos", "kcal_approx": 200 },
        { "meal": "Cena", "foods": "descripción de alimentos", "kcal_approx": 500 }
      ]
    }
    // ... 7 días
  ]
}`;

    const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
                ]
            }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 3000 }
        })
    });

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini no devolvió JSON válido');
    const parsed = JSON.parse(match[0]);
    return parsed.plan ?? [];
}

async function generateShoppingList(plan: DayPlan[]): Promise<ShoppingItem[]> {
    const planText = plan.map(d =>
        `${d.day}:\n${d.meals.map(m => `  ${m.meal}: ${m.foods}`).join('\n')}`
    ).join('\n\n');

    const prompt = `Dado este plan semanal de comidas, genera una lista de la compra organizada por categorías (Carnes y Pescados, Frutas y Verduras, Lácteos, Cereales y Legumbres, Otros). Responde SOLO con JSON:
{"categories": [{"category": "nombre", "items": ["item1", "item2"]}]}

Plan:
${planText}`;

    const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1500 }
        })
    });
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    return JSON.parse(match[0]).categories ?? [];
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
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleTakePhoto = async () => {
        setError('');
        const base64 = await pickImageOrPhoto();
        if (!base64) return;

        setImagePreview(`data:image/jpeg;base64,${base64.slice(0, 20)}…`);
        setPhase('analyzing');

        try {
            const result = await analyzeMenuImage(base64);
            if (!result.length) throw new Error('No se pudo generar el plan');
            setPlan(result);
            setPhase('plan');
            setExpandedDay(result[0]?.day ?? null);
        } catch (e: any) {
            setError(e.message ?? 'Error analizando la imagen');
            setPhase('idle');
        }
    };

    const handleGenerateShopping = async () => {
        setPhase('analyzing');
        try {
            const list = await generateShoppingList(plan);
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
                Planifica con una Foto
            </Text>
            <Text className={`text-center font-medium text-sm leading-relaxed mb-10 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Haz una foto al menú de tu nutricionista, a una receta, o a cualquier lista de alimentos. La IA generará un plan semanal completo.
            </Text>
            <TouchableOpacity
                onPress={handleTakePhoto}
                className="bg-blue-600 px-10 py-5 rounded-[32px] flex-row items-center gap-x-3 shadow-xl shadow-blue-500/30"
                activeOpacity={0.8}
            >
                <Camera size={22} color="#ffffff" />
                <Text className="text-white font-black text-base uppercase tracking-wider">Hacer Foto al Menú</Text>
            </TouchableOpacity>
            {error ? (
                <View className="mt-6 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
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
                Analizando menú…
            </Text>
            <Text className={`font-medium text-sm text-center mt-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                Gemini AI está generando tu plan
            </Text>
        </View>
    );

    // ─── Render plan ──────────────────────────────────────────────────────────
    const renderPlan = () => (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center justify-between mb-5 pt-4">
                <View>
                    <Text className={`font-black text-2xl uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Plan Semanal</Text>
                    <Text className={`font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Generado por IA</Text>
                </View>
                <View className="flex-row gap-x-2">
                    <TouchableOpacity onPress={handleTakePhoto} className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-slate-100'}`}>
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
