import { useColorScheme } from 'nativewind';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Dumbbell, User, UtensilsCrossed } from 'lucide-react-native';
import { Platform, StyleSheet, ViewStyle } from 'react-native';

export default function TabLayout() {
  const schemeTools = useColorScheme();
  const colorScheme = typeof schemeTools === 'object' ? schemeTools.colorScheme : schemeTools;
  const isDark = colorScheme === 'dark';
  const isWeb = Platform.OS === 'web';

  const tabBarStyle: ViewStyle = {
    backgroundColor: isDark ? 'rgba(9, 9, 11, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: 8,
  };

  const webSafeAreaTabBar = isWeb ? ({
    paddingBottom: 'env(safe-area-inset-bottom, 16px)',
  } as unknown as ViewStyle) : {};

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#3b82f6' : '#2563eb',
        tabBarInactiveTintColor: isDark ? '#52525b' : '#94a3b8',
        tabBarStyle: { ...tabBarStyle, ...webSafeAreaTabBar },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingBottom: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={isDark ? 60 : 90}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ),
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
