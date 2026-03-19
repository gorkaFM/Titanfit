import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    ActivityIndicator, Modal, SafeAreaView, Keyboard
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Search, X, Scan, Check, ChevronRight, Minus, Plus } from 'lucide-react-native';
import {
    searchFood, FoodSearchResult, calculateMacros,
    NUTRI_SCORE_COLORS, MealLogItem
} from '@/lib/foodSearchService';
import BarcodeScanner from './BarcodeScanner';

interface FoodSearchModalProps {
    visible: boolean;
    mealLabel: string;
    onClose: () => void;
    onAddItem: (item: MealLogItem) => void;
}

type Phase = 'search' | 'detail' | 'barcode';

export default function FoodSearchModal({ visible, mealLabel, onClose, onAddItem }: FoodSearchModalProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [phase, setPhase] = useState<Phase>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FoodSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<FoodSearchResult | null>(null);
    const [quantity, setQuantity] = useState('100');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const searchIdRef = useRef(0); // race condition guard

    const handleSearch = useCallback((text: string) => {
        setQuery(text);
        clearTimeout(searchTimer.current);
        if (text.length < 2) { setResults([]); setLoading(false); return; }
        setLoading(true);
        const currentId = ++searchIdRef.current;
        searchTimer.current = setTimeout(async () => {
            const res = await searchFood(text);
            // Discard stale responses
            if (currentId !== searchIdRef.current) return;
            setResults(res);
            setLoading(false);
        }, 700);
    }, []);

    const handleSelect = (food: FoodSearchResult) => {
        setSelected(food);
        setQuantity('100');
        setPhase('detail');
        Keyboard.dismiss();
    };

    const handleBarcodeResult = (food: FoodSearchResult) => {
        setSelected(food);
        setQuantity('100');
        setPhase('detail');
    };

    const handleAdd = () => {
        if (!selected) return;
        const qty = parseFloat(quantity) || 100;
        onAddItem(calculateMacros(selected, qty));
        // Reset
        setPhase('search');
        setQuery('');
        setResults([]);
        setSelected(null);
        onClose();
    };

    const handleClose = () => {
        setPhase('search');
        setQuery('');
        setResults([]);
        setSelected(null);
        onClose();
    };

    const macros = selected ? (() => {
        const qty = parseFloat(quantity) || 100;
        const r = qty / 100;
        return {
            kcal: Math.round(selected.per100g.kcal * r),
            p: Math.round(selected.per100g.protein * r * 10) / 10,
            c: Math.round(selected.per100g.carbs * r * 10) / 10,
            f: Math.round(selected.per100g.fat * r * 10) / 10,
        };
    })() : null;

    const scoreStyle = selected?.nutriScore ? NUTRI_SCORE_COLORS[selected.nutriScore] : null;

    // ─── Barcode scanner phase ────────────────────────────────────────────────
    if (phase === 'barcode') {
        return (
            <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
                <BarcodeScanner
                    onResult={handleBarcodeResult}
                    onClose={() => setPhase('search')}
                />
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>

                {/* Header */}
                <View className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${isDark ? 'border-zinc-900' : 'border-slate-200'}`}>
                    <View className="flex-1">
                        <Text className={`font-black text-xl uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {phase === 'detail' ? selected?.name.split(' ').slice(0, 3).join(' ') : 'Añadir Alimento'}
                        </Text>
                        <Text className="text-blue-500 font-bold text-[10px] uppercase tracking-widest">{mealLabel}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={phase === 'detail' ? () => { setPhase('search'); setSelected(null); } : handleClose}
                        className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-slate-200'}`}
                    >
                        <X size={18} color={isDark ? '#ffffff' : '#0f172a'} />
                    </TouchableOpacity>
                </View>

                {/* ── FASE BÚSQUEDA ── */}
                {phase === 'search' && (
                    <View className="flex-1 px-6 pt-5">
                        {/* Input búsqueda */}
                        <View className={`flex-row items-center px-4 h-14 rounded-2xl border mb-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                            <Search size={18} color={isDark ? '#52525b' : '#94a3b8'} />
                            <TextInput
                                className={`flex-1 ml-3 font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}
                                placeholder="Buscar alimento…"
                                placeholderTextColor={isDark ? '#52525b' : '#cbd5e1'}
                                value={query}
                                onChangeText={handleSearch}
                                autoFocus
                                returnKeyType="search"
                            />
                            {query.length > 0 && (
                                <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                                    <X size={16} color={isDark ? '#52525b' : '#94a3b8'} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Botón escáner */}
                        <TouchableOpacity
                            onPress={() => setPhase('barcode')}
                            className={`flex-row items-center justify-center gap-x-3 py-3.5 rounded-2xl mb-6 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}
                        >
                            <Scan size={18} color="#3b82f6" />
                            <Text className={`font-bold text-sm ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                                Escanear código de barras
                            </Text>
                        </TouchableOpacity>

                        {/* Resultados */}
                        {loading ? (
                            <View className="flex-1 items-center justify-center">
                                <ActivityIndicator color="#3b82f6" />
                                <Text className={`mt-3 font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                    Buscando…
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={results}
                                keyExtractor={item => item.id}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                ItemSeparatorComponent={() => (
                                    <View className={`h-[1px] ${isDark ? 'bg-zinc-900' : 'bg-slate-100'}`} />
                                )}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelect(item)}
                                        className={`flex-row items-center justify-between py-4`}
                                        activeOpacity={0.7}
                                    >
                                        <View className="flex-1 mr-3">
                                            <Text className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            {item.brand && (
                                                <Text className={`text-[10px] font-medium mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                    {item.brand}
                                                </Text>
                                            )}
                                            <Text className={`text-[10px] font-bold mt-0.5 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                                                {item.per100g.kcal} kcal · P {item.per100g.protein}g · C {item.per100g.carbs}g · G {item.per100g.fat}g &nbsp;(por 100g)
                                            </Text>
                                        </View>
                                        {item.nutriScore ? (
                                            <View className="rounded-lg px-2 py-1 mr-2" style={{ backgroundColor: NUTRI_SCORE_COLORS[item.nutriScore].bg }}>
                                                <Text className="font-black text-xs" style={{ color: NUTRI_SCORE_COLORS[item.nutriScore].text }}>
                                                    {item.nutriScore}
                                                </Text>
                                            </View>
                                        ) : null}
                                        <ChevronRight size={16} color={isDark ? '#3f3f46' : '#94a3b8'} />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={query.length >= 2 && !loading ? (
                                    <View className="items-center py-16">
                                        <Text className={`font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                                            Sin resultados para {query}
                                        </Text>
                                    </View>
                                ) : null}
                            />
                        )}
                    </View>
                )}

                {/* ── FASE DETALLE / CANTIDAD ── */}
                {phase === 'detail' && selected && macros && (
                    <View className="flex-1 px-6 pt-6">

                        {/* Nutri-Score badge (si existe) */}
                        {scoreStyle && (
                            <View className="flex-row items-center mb-6 gap-x-3">
                                <View className="rounded-xl px-4 py-2" style={{ backgroundColor: scoreStyle.bg }}>
                                    <Text className="font-black text-2xl" style={{ color: scoreStyle.text }}>
                                        {selected.nutriScore}
                                    </Text>
                                </View>
                                <View>
                                    <Text className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Nutri-Score</Text>
                                    <Text className={`text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Valoración nutricional</Text>
                                </View>
                            </View>
                        )}

                        {/* Selector de cantidad */}
                        <Text className={`font-bold text-[10px] uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            Cantidad (gramos / ml)
                        </Text>
                        <View className="flex-row items-center gap-x-4 mb-8">
                            <TouchableOpacity
                                onPress={() => setQuantity(q => String(Math.max(1, (parseFloat(q) || 100) - 10)))}
                                className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}
                            >
                                <Minus size={20} color={isDark ? '#e4e4e7' : '#475569'} />
                            </TouchableOpacity>
                            <View className="flex-1">
                                <TextInput
                                    className={`text-center font-black text-3xl ${isDark ? 'text-white' : 'text-slate-900'}`}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="numeric"
                                    selectTextOnFocus
                                />
                                <Text className={`text-center text-[10px] font-bold ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>gramos</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setQuantity(q => String((parseFloat(q) || 100) + 10))}
                                className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}
                            >
                                <Plus size={20} color={isDark ? '#e4e4e7' : '#475569'} />
                            </TouchableOpacity>
                        </View>

                        {/* Resumen de macros calculados */}
                        <View className={`rounded-[28px] p-6 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <Text className={`font-black text-center text-4xl ${isDark ? 'text-white' : 'text-slate-900'} mb-1`}>
                                {macros.kcal}
                            </Text>
                            <Text className={`text-center font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'} mb-6`}>
                                kcal · {parseFloat(quantity) || 100}g
                            </Text>
                            <View className="flex-row justify-around">
                                {[
                                    { label: 'Proteína', value: macros.p, unit: 'g', color: '#3b82f6' },
                                    { label: 'Carbos', value: macros.c, unit: 'g', color: '#10b981' },
                                    { label: 'Grasas', value: macros.f, unit: 'g', color: '#f59e0b' },
                                ].map(m => (
                                    <View key={m.label} className="items-center">
                                        <Text className="font-black text-xl" style={{ color: m.color }}>{m.value}{m.unit}</Text>
                                        <Text className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{m.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View className="flex-1" />

                        {/* Botón Añadir */}
                        <TouchableOpacity
                            onPress={handleAdd}
                            className="bg-blue-600 py-5 rounded-[28px] items-center flex-row justify-center gap-x-3 shadow-xl shadow-blue-500/30 mb-4"
                        >
                            <Check size={22} color="#ffffff" strokeWidth={3} />
                            <Text className="text-white font-black text-base uppercase tracking-wider">Añadir a {mealLabel}</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </SafeAreaView>
        </Modal>
    );
}
