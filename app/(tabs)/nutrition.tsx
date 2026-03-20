import React, { useState } from 'react';
import { Alert, View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'nativewind';
import { BookOpen, Camera } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import FoodDiary from '@/components/nutrition/FoodDiary';
import MenuPhotoPlanner from '@/components/nutrition/MenuPhotoPlanner';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ActiveTab = 'diary' | 'planner';

export default function NutritionScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { user } = useAuth();
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState<ActiveTab>('diary');
    const [plannerHasDraft, setPlannerHasDraft] = useState(false);
    const [plannerImportedToDiary, setPlannerImportedToDiary] = useState(false);
    const [plannerResetSignal, setPlannerResetSignal] = useState(0);
    const [plannerResetMode, setPlannerResetMode] = useState<'plan' | 'all'>('plan');
    const [diaryFocusDate, setDiaryFocusDate] = useState<string | null>(null);

    const confirmDiscardPlan = (onConfirm: () => void) => {
        Alert.alert(
            'Cancelar plan semanal',
            'Tienes un plan semanal sin trasladar al diario. Si sales ahora, se cancelará. ¿Quieres continuar?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: () => {
                        setPlannerResetMode('all');
                        setPlannerResetSignal((current) => current + 1);
                        setPlannerHasDraft(false);
                        setPlannerImportedToDiary(false);
                        onConfirm();
                    },
                },
            ]
        );
    };

    usePreventRemove(activeTab === 'planner' && plannerHasDraft && !plannerImportedToDiary, ({ data }) => {
        confirmDiscardPlan(() => {
            navigation.dispatch(data.action);
        });
    });

    const handleTabChange = (nextTab: ActiveTab) => {
        if (nextTab === activeTab) return;

        if (activeTab === 'planner' && nextTab !== 'planner' && plannerHasDraft && !plannerImportedToDiary) {
            confirmDiscardPlan(() => setActiveTab(nextTab));
            return;
        }

        setActiveTab(nextTab);
    };

    if (!user) {
        return (
            <View className={`flex-1 items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                <Text className={`font-bold ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>Inicia sesión para acceder a nutrición</Text>
            </View>
        );
    }

    return (
        <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
            {/* Tab selector */}
            <SafeAreaView edges={['top']}>
                <View className={`flex-row mx-6 mt-2 p-1.5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    {([
                        { id: 'diary', label: 'Diario', Icon: BookOpen },
                        { id: 'planner', label: 'Planificador', Icon: Camera },
                    ] as const).map(({ id, label, Icon }) => (
                        <TouchableOpacity
                            key={id}
                            onPress={() => handleTabChange(id)}
                            className={`flex-1 flex-row items-center justify-center gap-x-2 py-3 rounded-2xl ${activeTab === id ? 'bg-blue-600 shadow-lg' : ''}`}
                        >
                            <Icon size={15} color={activeTab === id ? '#ffffff' : (isDark ? '#52525b' : '#94a3b8')} />
                            <Text className={`font-black text-[11px] uppercase tracking-widest ${activeTab === id ? 'text-white' : (isDark ? 'text-zinc-500' : 'text-slate-400')}`}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </SafeAreaView>

            {/* Contenido */}
            <View className="flex-1">
                {activeTab === 'diary' ? (
                    <FoodDiary userId={user.id} focusDate={diaryFocusDate} />
                ) : (
                    <MenuPhotoPlanner
                        userId={user.id}
                        resetSignal={plannerResetSignal}
                        resetMode={plannerResetMode}
                        onDraftStateChange={({ hasDraft, importedToDiary }) => {
                            setPlannerHasDraft(hasDraft);
                            setPlannerImportedToDiary(importedToDiary);
                        }}
                        onTransferToDiary={(focusDate) => {
                            setDiaryFocusDate(focusDate);
                            setActiveTab('diary');
                        }}
                    />
                )}
            </View>
        </View>
    );
}
