import DailyTracker from '@/components/nutrition/DailyTracker';
import NutritionScanner from '@/components/nutrition/NutritionScanner';
import NutritionOnboarding from '@/components/nutrition/Onboarding';
import { useAuth } from '@/context/AuthContext';
import { nutritionService } from '@/lib/nutritionService';
import { UserNutritionProfile } from '@/types/nutrition';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';

export default function NutritionScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        nutritionService.getNutritionProfile(user.id)
            .then(data => {
                setProfile(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [user]);

    if (loading) {
        return (
            <View className={`flex-1 justify-center items-center ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                <ActivityIndicator color={isDark ? '#fff' : '#000'} size="large" />
            </View>
        );
    }

    // Flujo 1: No hay perfil => Onboarding
    if (!profile && user) {
        return (
            <NutritionOnboarding
                userId={user.id}
                onComplete={(p) => setProfile(p)}
            />
        );
    }

    // Flujo 2: Hay perfil => Tracker Diario (con modal de escáner)
    return (
        <View className="flex-1">
            <DailyTracker
                userId={user!.id}
                profile={profile!}
                openScanner={() => setIsScannerOpen(true)}
                onResetProfile={() => setProfile(null)}
            />

            <Modal
                visible={isScannerOpen}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <NutritionScanner onClose={() => setIsScannerOpen(false)} />
            </Modal>
        </View>
    );
}
