import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { ArrowRight, KeyRound, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMSG, setErrorMSG] = useState('');
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleLogin = async () => {
        if (!email || !password) {
            setErrorMSG('Completa todos los campos');
            return;
        }
        setLoading(true);
        setErrorMSG('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErrorMSG(error.message);
        }
        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}
        >
            <View className="flex-1 justify-center px-6">

                {/* Header / Logo Area */}
                <View className="items-center mb-12">
                    <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 shadow-xl ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}`}>
                        <Lock size={36} color={isDark ? '#e4e4e7' : '#18181b'} strokeWidth={1.5} />
                    </View>
                    <Text className={`text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        TitanFit
                    </Text>
                    <Text className={`text-sm mt-2 font-medium tracking-widest uppercase ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                        VIP Access
                    </Text>
                </View>

                {/* Auth Card */}
                <View className={`rounded-3xl p-6 shadow-2xl overflow-hidden ${isDark ? 'bg-zinc-900/50 border border-zinc-800/50' : 'bg-white/70 border border-white'}`}>
                    <BlurView intensity={isDark ? 20 : 60} tint={isDark ? 'dark' : 'light'} className="absolute inset-0" />

                    <View className="relative z-10 gap-y-4">

                        {/* Email Input */}
                        <View>
                            <Text className={`text-xs ml-1 mb-1.5 font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Correo Electrónico</Text>
                            <View className={`flex-row items-center px-4 h-14 rounded-2xl ${isDark ? 'bg-zinc-800/60' : 'bg-slate-100/80'}`}>
                                <Mail size={20} color={isDark ? '#a1a1aa' : '#64748b'} />
                                <TextInput
                                    placeholder="usuario@ejemplo.com"
                                    placeholderTextColor={isDark ? '#52525b' : '#94a3b8'}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    className={`flex-1 h-full ml-3 text-base ${isDark ? 'text-white' : 'text-slate-900'}`}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View>
                            <Text className={`text-xs ml-1 mb-1.5 font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Contraseña</Text>
                            <View className={`flex-row items-center px-4 h-14 rounded-2xl ${isDark ? 'bg-zinc-800/60' : 'bg-slate-100/80'}`}>
                                <KeyRound size={20} color={isDark ? '#a1a1aa' : '#64748b'} />
                                <TextInput
                                    placeholder="••••••••"
                                    placeholderTextColor={isDark ? '#52525b' : '#94a3b8'}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    className={`flex-1 h-full ml-3 text-base ${isDark ? 'text-white' : 'text-slate-900'}`}
                                />
                            </View>
                        </View>

                        {/* Error Message */}
                        {errorMSG ? (
                            <Text className="text-red-500 text-sm text-center mt-2">{errorMSG}</Text>
                        ) : null}

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.8}
                            className={`mt-4 h-14 rounded-2xl flex-row items-center justify-center shadow-lg ${isDark ? 'bg-white' : 'bg-slate-900'}`}
                        >
                            {loading ? (
                                <ActivityIndicator color={isDark ? '#000' : '#fff'} />
                            ) : (
                                <>
                                    <Text className={`text-base font-semibold mr-2 ${isDark ? 'text-zinc-900' : 'text-white'}`}>
                                        Entrar
                                    </Text>
                                    <ArrowRight size={20} color={isDark ? '#18181b' : '#ffffff'} />
                                </>
                            )}
                        </TouchableOpacity>

                    </View>
                </View>

                <View className="mt-10 items-center">
                    <Text className={`text-xs ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                        Acceso exclusivo. Contacta con el administrador.
                    </Text>
                </View>

            </View>
        </KeyboardAvoidingView>
    );
}
