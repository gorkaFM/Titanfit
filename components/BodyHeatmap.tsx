import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Body from 'react-native-body-highlighter';

// Definimos los tipos de las props que recibe el componente
interface BodyStats {
  chest: number;
  back: number;
  legs: number;
  shoulders: number;
  arms: number;
  core: number;
}

interface BodyHeatmapProps {
  stats: BodyStats;
}

// Mapeo detallado de nuestros grupos a los slugs técnicos de la librería
const MUSCLE_MAP: Record<string, string[]> = {
  chest: ['chest'],
  back: ['trapezius', 'upper-back', 'lower-back'],
  legs: ['quadriceps', 'hamstring', 'gluteal', 'calves'],
  shoulders: ['deltoids'],
  arms: ['biceps', 'triceps', 'forearm'],
  core: ['abs', 'obliques']
};

export const BodyHeatmap: React.FC<BodyHeatmapProps> = ({ stats }) => {
  // Calculamos el total para los porcentajes
  const totalWeight = useMemo(() => 
    Object.values(stats).reduce((acc, val) => acc + val, 0)
  , [stats]);

  // Generamos el array de datos para la librería
  const bodyData = useMemo(() => {
    const data: any[] = [];
    
    Object.entries(stats).forEach(([key, value]) => {
      if (value <= 0) return;
      
      const percentage = totalWeight > 0 ? (value / totalWeight) * 100 : 0;
      
      // Lógica de Intensidad Térmica (1-4) solicitada
      // Basado en el peso relativo respecto al total entrenado
      let intensity = 1; // Azul
      if (percentage > 40) intensity = 4;      // Rojo (Foco Principal)
      else if (percentage > 25) intensity = 3; // Naranja
      else if (percentage > 10) intensity = 2; // Verde
      
      const slugs = MUSCLE_MAP[key] || [];
      slugs.forEach(slug => {
        data.push({ slug, intensity });
      });
    });
    
    return data;
  }, [stats, totalWeight]);

  return (
    <View className="items-center justify-center py-6">
      <View className="flex-row justify-center items-center w-full gap-x-12 mb-10">
        <View className="items-center">
            <Text className="text-zinc-700 font-bold text-[9px] uppercase tracking-[4px] mb-6">Frontal</Text>
            <Body 
                data={bodyData} 
                side="front" 
                scale={0.9}
                colors={['#1e40af', '#10b981', '#f97316', '#ef4444']} // Azul, Verde, Naranja, Rojo
            />
        </View>
        <View className="items-center">
            <Text className="text-zinc-700 font-bold text-[9px] uppercase tracking-[4px] mb-6">Posterior</Text>
            <Body 
                data={bodyData} 
                side="back" 
                scale={0.9}
                colors={['#1e40af', '#10b981', '#f97316', '#ef4444']}
            />
        </View>
      </View>

      {/* Leyenda de Porcentajes de Carga */}
      <View className="flex-row flex-wrap justify-center gap-3 px-4">
        {[
            { label: 'Pecho', key: 'chest' },
            { label: 'Espalda', key: 'back' },
            { label: 'Piernas', key: 'legs' },
            { label: 'Hombros', key: 'shoulders' },
            { label: 'Brazos', key: 'arms' },
            { label: 'Core', key: 'core' }
        ].map(({ label, key }) => {
            const val = stats[key as keyof BodyStats] || 0;
            const pct = totalWeight > 0 ? Math.round((val / totalWeight) * 100) : 0;
            const isActive = pct > 0;
            
            return (
                <View key={label} className={`px-4 py-2.5 rounded-2xl border ${isActive ? 'bg-zinc-900 border-zinc-800 shadow-xl' : 'bg-transparent border-zinc-900/50 opacity-20'}`}>
                    <Text className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-zinc-100' : 'text-zinc-600'}`}>
                        {label} <Text className="text-blue-500">{isActive ? `${pct}%` : ''}</Text>
                    </Text>
                </View>
            );
        })}
      </View>
    </View>
  );
};