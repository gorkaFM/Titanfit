import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ThemeToggle() {
  const schemeTools = useColorScheme();
  const colorScheme = typeof schemeTools === 'object' ? schemeTools.colorScheme : schemeTools;
  const setColorScheme = typeof schemeTools === 'object' ? schemeTools.setColorScheme : null;
  const isDark = colorScheme === 'dark';

  const toggleTheme = () => {
    if (setColorScheme) {
      setColorScheme(isDark ? 'light' : 'dark');
    }
  };

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      activeOpacity={0.7}
      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
        isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-sm border border-slate-100'
      }`}
    >
      {isDark ? (
        <Sun size={18} color="#ffffff" fill="#ffffff" opacity={0.9} />
      ) : (
        <Moon size={18} color="#6366f1" fill="#6366f1" opacity={0.8} />
      )}
    </TouchableOpacity>
  );
}
