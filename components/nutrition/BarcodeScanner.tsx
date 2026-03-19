import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform, Linking } from 'react-native';
import { useColorScheme } from 'nativewind';
import { X, ScanLine, AlertCircle } from 'lucide-react-native';
import { searchFoodByBarcode, FoodSearchResult } from '@/lib/foodSearchService';

interface BarcodeScannerProps {
    onResult: (food: FoodSearchResult) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [permission, setPermission] = useState<boolean | null>(null);
    const [scanning, setScanning] = useState(true);
    const [statusMsg, setStatusMsg] = useState('');
    const [error, setError] = useState('');
    const [CameraView, setCameraView] = useState<any>(null);
    const lastScan = useRef<string>('');

    useEffect(() => {
        if (Platform.OS === 'web') {
            setPermission(false);
            setError('El escáner de código de barras no está disponible en el navegador. Usa la búsqueda por texto.');
            return;
        }
        const loadCamera = async () => {
            try {
                const cameraModule = await import('expo-camera');
                setCameraView(() => cameraModule.CameraView);
            } catch {
                setError('Cámara no disponible en este dispositivo.');
            }
        };

        loadCamera();
        requestPermission();
    }, []);

    const requestPermission = async () => {
        try {
            const { Camera } = await import('expo-camera');
            const { status } = await Camera.requestCameraPermissionsAsync();
            setPermission(status === 'granted');
            if (status !== 'granted') {
                setError('TitanFit necesita acceso a tu cámara para escanear.');
            }
        } catch {
            setPermission(false);
            setError('Cámara no disponible en este dispositivo.');
        }
    };

    const handleBarcode = async ({ data }: { data: string }) => {
        if (!scanning || data === lastScan.current) return;
        lastScan.current = data;
        setScanning(false);
        setStatusMsg('Buscando producto…');

        const food = await searchFoodByBarcode(data);
        if (food) {
            onResult(food);
        } else {
            setError(`Producto (${data}) no encontrado en Open Food Facts.`);
            setStatusMsg('');
            // Permite reintentar tras 2s
            setTimeout(() => {
                lastScan.current = '';
                setScanning(true);
                setError('');
            }, 2500);
        }
    };

    // ─── Web fallback ────────────────────────────────────────────────────────
    if (Platform.OS === 'web' || permission === false) {
        return (
            <SafeAreaView className={`flex-1 items-center justify-center px-8 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                <AlertCircle size={48} color="#f59e0b" className="mb-4" />
                <Text className={`font-black text-lg text-center mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Escáner no disponible
                </Text>
                <Text className={`text-sm text-center leading-relaxed mb-8 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {error || 'La cámara no está disponible. Usa la búsqueda por texto.'}
                </Text>
                {permission === false && Platform.OS !== 'web' && (
                    <TouchableOpacity
                        onPress={() => Linking.openSettings()}
                        className="bg-blue-600 px-6 py-3 rounded-2xl mb-4"
                    >
                        <Text className="text-white font-bold">Abrir Ajustes</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={onClose}
                    className={`px-6 py-3 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}
                >
                    <Text className={`font-bold ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>Volver a búsqueda</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (permission === null) {
        return <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`} />;
    }

    // ─── Native camera ────────────────────────────────────────────────────────
    return (
        <View className="flex-1 bg-black">
            {CameraView ? (
                <CameraView
                    style={{ flex: 1 }}
                    barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
                    onBarcodeScanned={scanning ? handleBarcode : undefined}
                >
                    {/* Overlay UI */}
                    <SafeAreaView className="flex-1">
                        <View className="flex-row items-center justify-between px-6 pt-2">
                            <Text className="text-white font-black text-lg uppercase tracking-wide">Escanear</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
                            >
                                <X size={20} color="#ffffff" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-1 items-center justify-center">
                            {/* Marco de escaneo */}
                            <View className="w-64 h-64 relative">
                                {['tl','tr','bl','br'].map(corner => (
                                    <View key={corner} className={`absolute w-8 h-8 border-4 border-blue-400 ${
                                        corner === 'tl' ? 'top-0 left-0 rounded-tl-xl border-r-0 border-b-0' :
                                        corner === 'tr' ? 'top-0 right-0 rounded-tr-xl border-l-0 border-b-0' :
                                        corner === 'bl' ? 'bottom-0 left-0 rounded-bl-xl border-r-0 border-t-0' :
                                        'bottom-0 right-0 rounded-br-xl border-l-0 border-t-0'
                                    }`} />
                                ))}
                                <ScanLine size={32} color="rgba(59,130,246,0.6)" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -16, marginTop: -16 }} />
                            </View>

                            {statusMsg ? (
                                <Text className="text-white font-bold text-sm mt-6 bg-black/50 px-4 py-2 rounded-full">
                                    {statusMsg}
                                </Text>
                            ) : (
                                <Text className="text-white/60 font-medium text-sm mt-6">
                                    Apunta al código de barras del producto
                                </Text>
                            )}

                            {error ? (
                                <View className="mt-4 bg-red-500/80 px-6 py-3 rounded-2xl">
                                    <Text className="text-white font-bold text-sm text-center">{error}</Text>
                                </View>
                            ) : null}
                        </View>
                    </SafeAreaView>
                </CameraView>
            ) : (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-white">Cámara no disponible</Text>
                    <TouchableOpacity onPress={onClose} className="mt-4 bg-zinc-800 px-6 py-3 rounded-2xl">
                        <Text className="text-white font-bold">Volver</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
