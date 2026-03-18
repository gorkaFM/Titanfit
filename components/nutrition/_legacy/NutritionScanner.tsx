import { useColorScheme } from '@/hooks/use-color-scheme';
import { NutritionAdvice, nutritionService, ProductScanResult } from '@/lib/nutritionService';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { AlertCircle, CheckCircle2, Focus, ScanLine, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NutritionScanner({ onClose }: { onClose: () => void }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [permission, requestPermission] = useCameraPermissions();

    const [scanning, setScanning] = useState(true);
    const [loadingCode, setLoadingCode] = useState<string | null>(null);
    const [product, setProduct] = useState<ProductScanResult | null>(null);
    const [advice, setAdvice] = useState<NutritionAdvice | null>(null);

    // Animation for scanner line
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (scanning) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                    Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
                ])
            ).start();
        } else {
            scanLineAnim.stopAnimation();
        }
    }, [scanning, scanLineAnim]);

    if (!permission) {
        return <View className="flex-1 bg-black justify-center items-center"><ActivityIndicator color="#fff" /></View>;
    }

    if (!permission.granted) {
        return (
            <SafeAreaView className={`flex-1 justify-center items-center px-6 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                <Text className={`text-center font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Necesitamos acceso a la cámara para escanear alimentos
                </Text>
                <TouchableOpacity
                    onPress={requestPermission}
                    className={`px-6 py-3 rounded-full ${isDark ? 'bg-blue-600' : 'bg-slate-900'}`}
                >
                    <Text className="text-white font-bold">Conceder Permiso</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} className="mt-4 p-4">
                    <Text className={`font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Cancelar</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
        if (!scanning || loadingCode === data) return;
        setScanning(false);
        setLoadingCode(data);

        // 1. Fetch OFF
        const productData = await nutritionService.scanBarcode(data);

        if (productData) {
            setProduct(productData);

            // 2. Fetch IA
            const analysis = await nutritionService.analyzeWithISSN(productData, 'mantenimiento');
            setAdvice(analysis);
        } else {
            // Product not found
            setProduct(null);
            setAdvice(null);
            alert('Producto no encontrado en la base de datos OpenFoodFacts');
            setScanning(true);
        }
        setLoadingCode(null);
    };

    const resetScanner = () => {
        setProduct(null);
        setAdvice(null);
        setScanning(true);
    };

    return (
        <View className="flex-1 bg-black">
            {scanning ? (
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={loadingCode ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["ean13", "ean8", "upc_e", "upc_a", "qr"],
                    }}
                >
                    <SafeAreaView className="flex-1">
                        <View className="p-6 flex-row justify-between items-center">
                            <View>
                                <Text className="text-white font-bold text-2xl drop-shadow-md">Escáner Nutricional</Text>
                                <Text className="text-white/80 font-medium text-sm drop-shadow-md">Apunta al código de barras</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-black/50 items-center justify-center">
                                <X size={20} color="#ffffff" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-1 items-center justify-center">
                            <View className="w-64 h-48 border-2 border-white/50 rounded-3xl overflow-hidden relative bg-black/20">
                                <View className="absolute top-4 left-4"><Focus color="rgba(255,255,255,0.8)" size={24} /></View>
                                <View className="absolute bottom-4 right-4 rotate-180"><Focus color="rgba(255,255,255,0.8)" size={24} /></View>

                                <Animated.View
                                    style={{
                                        height: 2,
                                        backgroundColor: '#3b82f6',
                                        width: '100%',
                                        shadowColor: '#3b82f6',
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 1,
                                        shadowRadius: 10,
                                        elevation: 5,
                                        transform: [{
                                            translateY: scanLineAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [10, 180]
                                            })
                                        }]
                                    }}
                                />
                            </View>
                            {loadingCode && (
                                <View className="mt-8 items-center bg-black/60 px-6 py-3 rounded-full flex-row">
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text className="text-white font-bold ml-3">Analizando producto...</Text>
                                </View>
                            )}
                        </View>
                    </SafeAreaView>
                </CameraView>
            ) : (
                <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                    <ScrollView className="flex-1 p-6">

                        {/* Cabecera Resultados */}
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className={`font-extrabold text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Resultados
                            </Text>
                            <TouchableOpacity onPress={resetScanner} className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200 shadow-sm'}`}>
                                <X size={20} color={isDark ? '#e4e4e7' : '#18181b'} />
                            </TouchableOpacity>
                        </View>

                        {product && (
                            <View className={`rounded-3xl p-5 mb-6 overflow-hidden ${isDark ? 'bg-zinc-900/40 border border-zinc-800/50' : 'bg-white shadow-xl shadow-slate-200/50 border border-white'}`}>
                                <BlurView intensity={isDark ? 20 : 80} tint={isDark ? 'dark' : 'light'} className="absolute inset-0" />
                                <View className="relative z-10 flex-row">
                                    {product.image_url ? (
                                        <Image source={product.image_url} contentFit="cover" style={{ width: 80, height: 100, borderRadius: 16 }} />
                                    ) : (
                                        <View className={`w-20 h-28 rounded-2xl items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                            <ScanLine size={32} color={isDark ? '#52525b' : '#94a3b8'} />
                                        </View>
                                    )}
                                    <View className="flex-1 ml-4 justify-center">
                                        <Text className={`font-bold text-xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{product.name}</Text>
                                        <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} numberOfLines={3}>
                                            {product.ingredients}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {advice ? (
                            <View className={`rounded-3xl p-6 overflow-hidden border ${advice.suitable ? (isDark ? 'bg-emerald-950/30 border-emerald-900' : 'bg-emerald-50 border-emerald-100') : (isDark ? 'bg-red-950/30 border-red-900' : 'bg-red-50 border-red-100')}`}>
                                <View className="flex-row items-center mb-4">
                                    {advice.suitable ? <CheckCircle2 color="#10b981" size={28} /> : <AlertCircle color="#ef4444" size={28} />}
                                    <Text className={`font-bold text-xl ml-2 ${advice.suitable ? 'text-emerald-500' : 'text-red-500'}`}>
                                        Score ISSN: {advice.score}/10
                                    </Text>
                                </View>

                                <Text className={`text-base font-medium leading-relaxed mb-6 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                                    {advice.explanation}
                                </Text>

                                {/* Macros Row */}
                                <View className="flex-row gap-x-2">
                                    <View className={`flex-1 p-3 rounded-xl items-center ${isDark ? 'bg-black/20' : 'bg-white/60'}`}>
                                        <Text className={`text-[10px] font-bold uppercase ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Kcal</Text>
                                        <Text className={`text-lg font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{advice.macros_per_100g.kcal}</Text>
                                    </View>
                                    <View className={`flex-1 p-3 rounded-xl items-center ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                        <Text className="text-[10px] font-bold uppercase text-blue-500">PRO</Text>
                                        <Text className={`text-lg font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{advice.macros_per_100g.protein}g</Text>
                                    </View>
                                    <View className={`flex-1 p-3 rounded-xl items-center ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                                        <Text className="text-[10px] font-bold uppercase text-amber-500">CAR</Text>
                                        <Text className={`text-lg font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{advice.macros_per_100g.carbs}g</Text>
                                    </View>
                                    <View className={`flex-1 p-3 rounded-xl items-center ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                                        <Text className="text-[10px] font-bold uppercase text-red-500">FAT</Text>
                                        <Text className={`text-lg font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{advice.macros_per_100g.fat}g</Text>
                                    </View>
                                </View>

                            </View>
                        ) : (
                            <View className="py-20 items-center justify-center">
                                <ActivityIndicator color={isDark ? '#e4e4e7' : '#18181b'} size="large" />
                                <Text className={`mt-4 font-bold text-lg ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                    Consiguiendo dictamen ISSN...
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={resetScanner}
                            className={`mt-6 w-full py-4 rounded-2xl items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}
                        >
                            <Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Escanear Otro Producto
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            className={`mt-4 w-full py-4 rounded-2xl items-center justify-center`}
                        >
                            <Text className={`font-bold text-base ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                Volver al Tracker
                            </Text>
                        </TouchableOpacity>

                        <View className="h-10" />
                    </ScrollView>
                </SafeAreaView>
            )}
        </View>
    );
}
