import { nutritionService } from '@/lib/nutritionService';
import { NutritionMeal } from '@/types/nutrition';
import { Check, ShoppingCart, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface ShoppingListProps {
    visible: boolean;
    onClose: () => void;
    weekPlans: any[];
    isDark: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
    'Proteínas': '🥩',
    'Lácteos y Huevos': '🥚',
    'Frutas y Verduras': '🥬',
    'Cereales y Legumbres': '🌾',
    'Condimentos y Aceites': '🫒',
    'Otros': '🛒',
};

const CATEGORY_COLORS: Record<string, string> = {
    'Proteínas': '#ef4444',
    'Lácteos y Huevos': '#f59e0b',
    'Frutas y Verduras': '#22c55e',
    'Cereales y Legumbres': '#a855f7',
    'Condimentos y Aceites': '#f97316',
    'Otros': '#6b7280',
};

export default function ShoppingList({ visible, onClose, weekPlans, isDark }: ShoppingListProps) {
    const [loading, setLoading] = useState(false);
    const [list, setList] = useState<Array<{ category: string; items: string[] }>>([]);
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible && list.length === 0) {
            generateList();
        }
    }, [visible]);

    const generateList = async () => {
        setLoading(true);
        setError(null);
        try {
            const allMeals: Array<{ meal_name: string; recipe_text: string | null }> = [];
            for (const plan of weekPlans) {
                if (plan.nutrition_meals) {
                    for (const meal of plan.nutrition_meals) {
                        allMeals.push({ meal_name: meal.meal_name, recipe_text: meal.recipe_text });
                    }
                }
            }
            if (allMeals.length === 0) {
                setError('No hay comidas generadas esta semana');
                return;
            }
            const result = await nutritionService.generateShoppingList(allMeals);
            setList(result);
        } catch (e: any) {
            setError(e.message || 'Error generando la lista');
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (key: string) => {
        setCheckedItems(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const totalItems = list.reduce((a, c) => a + c.items.length, 0);
    const checkedCount = checkedItems.size;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                {/* Header */}
                <View style={{ 
                    backgroundColor: isDark ? '#09090b' : '#ffffff',
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#27272a' : '#f1f5f9',
                    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ 
                                width: 44, height: 44, borderRadius: 14, 
                                backgroundColor: '#22c55e20', justifyContent: 'center', alignItems: 'center', marginRight: 12
                            }}>
                                <ShoppingCart size={22} color="#22c55e" />
                            </View>
                            <View>
                                <Text style={{ fontWeight: '900', fontSize: 22, color: isDark ? '#ffffff' : '#0f172a' }}>
                                    Lista de la Compra
                                </Text>
                                {totalItems > 0 && (
                                    <Text style={{ fontSize: 12, color: isDark ? '#71717a' : '#94a3b8', marginTop: 2 }}>
                                        {checkedCount}/{totalItems} productos
                                    </Text>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose}
                            style={{ 
                                width: 36, height: 36, borderRadius: 18, 
                                backgroundColor: isDark ? '#27272a' : '#f1f5f9',
                                justifyContent: 'center', alignItems: 'center'
                            }}>
                            <X size={18} color={isDark ? '#a1a1aa' : '#64748b'} />
                        </TouchableOpacity>
                    </View>

                    {/* Progress bar */}
                    {totalItems > 0 && (
                        <View style={{ marginTop: 16 }}>
                            <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? '#27272a' : '#e2e8f0' }}>
                                <View style={{ 
                                    height: 6, borderRadius: 3, backgroundColor: '#22c55e',
                                    width: `${(checkedCount / totalItems) * 100}%`
                                }} />
                            </View>
                        </View>
                    )}
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                    {loading ? (
                        <View style={{ alignItems: 'center', paddingTop: 80 }}>
                            <ActivityIndicator size="large" color="#22c55e" />
                            <Text style={{ marginTop: 16, color: isDark ? '#71717a' : '#94a3b8', fontWeight: '600' }}>
                                Generando lista con IA...
                            </Text>
                        </View>
                    ) : error ? (
                        <View style={{ alignItems: 'center', paddingTop: 80 }}>
                            <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
                            <Text style={{ color: '#f87171', fontWeight: '700', textAlign: 'center' }}>{error}</Text>
                            <TouchableOpacity onPress={generateList} style={{ 
                                marginTop: 16, paddingHorizontal: 24, paddingVertical: 12,
                                borderRadius: 16, backgroundColor: '#22c55e'
                            }}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        list.map((category, ci) => {
                            const icon = CATEGORY_ICONS[category.category] || '🛒';
                            const color = CATEGORY_COLORS[category.category] || '#6b7280';
                            return (
                                <View key={ci} style={{ marginBottom: 20 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                        <Text style={{ fontSize: 18, marginRight: 8 }}>{icon}</Text>
                                        <Text style={{ fontWeight: '800', fontSize: 14, color, letterSpacing: 1, textTransform: 'uppercase' }}>
                                            {category.category}
                                        </Text>
                                        <View style={{ flex: 1, height: 1, backgroundColor: color + '30', marginLeft: 12 }} />
                                    </View>
                                    {category.items.map((item, ii) => {
                                        const key = `${ci}-${ii}`;
                                        const checked = checkedItems.has(key);
                                        return (
                                            <TouchableOpacity key={ii} onPress={() => toggleItem(key)}
                                                style={{
                                                    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16,
                                                    marginBottom: 4, borderRadius: 14,
                                                    backgroundColor: checked 
                                                        ? (isDark ? '#22c55e15' : '#f0fdf4') 
                                                        : (isDark ? '#18181b' : '#ffffff'),
                                                    borderWidth: 1,
                                                    borderColor: checked ? '#22c55e40' : (isDark ? '#27272a' : '#f1f5f9'),
                                                }}>
                                                <View style={{ 
                                                    width: 24, height: 24, borderRadius: 8, marginRight: 12,
                                                    backgroundColor: checked ? '#22c55e' : (isDark ? '#27272a' : '#e2e8f0'),
                                                    justifyContent: 'center', alignItems: 'center',
                                                    borderWidth: checked ? 0 : 2,
                                                    borderColor: isDark ? '#3f3f46' : '#cbd5e1',
                                                }}>
                                                    {checked && <Check size={14} color="#fff" />}
                                                </View>
                                                <Text style={{ 
                                                    flex: 1, fontSize: 15, fontWeight: '500',
                                                    color: checked ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#e4e4e7' : '#334155'),
                                                    textDecorationLine: checked ? 'line-through' : 'none',
                                                    opacity: checked ? 0.7 : 1,
                                                }}>
                                                    {item}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            );
                        })
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}
