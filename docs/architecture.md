# Arquitectura del Proyecto

## Visión General
Esta aplicación está planteada bajo la estructura de una **PWA (Progressive Web App)**, exportada para comportarse como una Web App en iOS a través del despliegue en Vercel.

## Stack Tecnológico y UI
- **Framework**: Expo Router (File-based routing).
- **Estilos**: NativeWind (Tailwind CSS para React Native).
- **Gestión de Temas**: Uso centralizado de `useColorScheme` de `nativewind`. Se ha implementado un sistema de "Zero Hardcoding" donde todos los colores de fondo, texto y bordes responden dinámicamente al estado global del `ThemeContext`.
- **Componentes Elite**: Uso de `lucide-react-native` para iconografía sincronizada cromáticamente con el tema.

## Funcionalidades de Hardware
- **Cámara**: Se hace uso intensivo de la cámara del dispositivo móvil mediante el paquete `expo-camera`.

## Base de Datos (Supabase)
La base de datos se gestiona mediante Supabase y se compone de las siguientes tablas principales:

1. `users`: Centraliza la información del usuario, autenticación, métricas corporales y configuraciones o preferencias.
2. `exercises_library`: Catálogo global de ejercicios disponibles.
3. `workouts`: Registros generales de entrenamientos o rutinas creadas.
4. `workout_exercises`: Establece la relación y orden de los ejercicios correspondientes a un entrenamiento determinado.
5. `workout_sets`: Registro detallado por cada serie (sets), guardando repeticiones, peso y esfuerzo por cada ejercicio en una sesión.
6. `pantry`: Inventario físico o virtual (despensa) de alimentos/productos para integrar con la lógica del plan nutricional.

## Flujo de Trabajo (Workouts)
El sistema de entrenamientos (`app/(tabs)/workouts/active.tsx`) utiliza un estado complejo para gestionar:
- Temporizadores de sesión.
- Selección dinámica de bloques (Normal o Superserie).
- Integración de biblioteca de ejercicios con búsqueda y filtrado.
- Gráficas de progresión (LineChart) integradas en tiempo real.
