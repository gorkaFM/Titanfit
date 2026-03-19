import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { WorkoutProvider } from '@/context/WorkoutContext';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';



export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Forzar modo oscuro al inicio de la aplicación solo una vez
    if (setColorScheme) {
      setColorScheme('dark');
    }
  }, []); // Solo al montar el componente raíz

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to the login page.
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect away from the login page.
      router.replace('/(tabs)');
    }
  }, [session, initialized, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WorkoutProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </WorkoutProvider>
    </SafeAreaProvider>
  );
}

