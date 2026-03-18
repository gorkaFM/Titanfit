import { useColorScheme } from 'nativewind';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Dumbbell, User, UtensilsCrossed } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
  const schemeTools = useColorScheme();
  const colorScheme = typeof schemeTools === 'object' ? schemeTools.colorScheme : schemeTools;
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#3b82f6' : '#2563eb', // Azul titanio mas vibrante
        tabBarInactiveTintColor: isDark ? '#52525b' : '#94a3b8',
        tabBarStyle: {
          position: Platform.OS === 'ios' ? 'absolute' : 'relative',
          backgroundColor: isDark ? 'rgba(9, 9, 11, 0.9)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
        },
        tabBarBackground: Platform.OS === 'ios' ? () => (
          <BlurView
            intensity={isDark ? 50 : 80}
            tint={isDark ? 'dark' : 'light'}
            className="absolute inset-0"
          />
        ) : undefined,
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Entrenar',
          tabBarIcon: ({ color }) => <Dumbbell size={24} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrición',
          tabBarIcon: ({ color }) => <UtensilsCrossed size={24} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tú',
          tabBarIcon: ({ color }) => <User size={24} color={color} strokeWidth={2.5} />,
        }}
      />
    </Tabs>
  );
}
