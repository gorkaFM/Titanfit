# Reglas Estrictas de Desarrollo

Este documento define las reglas obligatorias a seguir durante el desarrollo de la aplicación TitanFit.

## 1. Stack Tecnológico
- **Framework**: Expo Router.
- **Lenguaje**: TypeScript obligatorio en todo el proyecto.
- **Estilos**: NativeWind. Es estrictamente obligatorio soportar y diseñar para modo claro y modo oscuro.
- **Backend/Base de Datos**: Supabase.

## 2. Arquitectura y Código
- **Modularidad**: El código debe estar estrictamente modularizado. Extraer componentes, hooks y utilidades en sus respectivos archivos y carpetas separadas. No crear archivos monolíticos gigantes.
- **Tipado**: Uso estricto de TypeScript. Evitar `any`. Definir interfaces y tipos de forma explícita.
- **Sincronización de Temas**: PROHIBIDO usar `useColorScheme` de `react-native`. Usar EXCLUSIVAMENTE el import de `nativewind`.
- **Zero Hardcoding**: No escribir colores fijos (ej. `bg-zinc-950`) para componentes que deben ser coherentes en ambos temas. Usar siempre clases condicionales `isDark ? 'bg-zinc-950' : 'bg-slate-50'`.

## 3. Diseño y UI/UX
- **Estética premium iOS**: La aplicación debe tener un estilo nativo de iOS premium. Esto incluye el uso de desenfoques (blur), animaciones fluidas, paletas de colores sofisticadas y excelente uso del espacio y tipografía. Las interfaces deben sentirse responsivas, elegantes y muy pulidas.
- **Iconografía Coherente**: Los iconos deben adaptar su color al tema. Evitar colores chillones (como amarillo puro) en elementos de control. Priorizar blancos, azules titanio y escalas de grises sofisticadas.
- **Micro-interacciones**: Cada acción (completar serie, iniciar entrenamiento) debe tener feedback visual y, en lo posible, sonoro (ej. Boxing Bell).
