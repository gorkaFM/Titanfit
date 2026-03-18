# TitanFit — Aplicación de Entrenamiento y Nutrición

> **TitanFit** es una PWA (Progressive Web App) de fitness premium construida con Expo Router y Supabase. Diseñada para funcionar como una app nativa en iOS/Android a través del navegador, sin necesidad de publicación en tiendas de aplicaciones.

---

## ✨ Características Principales

- **Dashboard de Rendimiento** — Visualización de estadísticas, mapa de calor muscular y KPIs de entrenamiento.
- **Registrador de Entrenamientos** — Sistema de series, repeticiones y peso con temporizador de sesión, bloques normales y superseries.
- **Biblioteca de Ejercicios** — Catálogo filtrable con animaciones, gráficas de progresión de pesos y cálculo de 1RM.
- **Plan Nutricional con IA** — Generación automática de planes semanales mediante Gemini AI, con calorie cycling y recomposición corporal (ISSN 2024).
- **Escáner de Alimentos** — Cámara para lectura de códigos de barras.
- **Tema Claro/Oscuro** — Sistema global sincronizado en todas las pantallas.
- **Perfil de Usuario y Biometría** — Gestión de métricas corporales, objetivos y preferencias alimentarias.

---

## 🛠 Stack Tecnológico

| Categoría | Tecnología |
|-----------|-----------|
| Framework | Expo SDK 54+ con Expo Router |
| Lenguaje | TypeScript |
| Estilos | NativeWind (Tailwind CSS para React Native) |
| Base de datos | Supabase (PostgreSQL + Auth + Storage) |
| IA | Google Gemini 2.0 Flash |
| Iconos | lucide-react-native |
| Gráficas | react-native-chart-kit |
| Audio | expo-av (campana de inicio de entrenamiento) |

---

## 🚀 Setup Local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-usuario/titanfit.git
cd titanfit
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y rellena tus valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anon de Supabase |
| `EXPO_PUBLIC_GEMINI_API_KEY` | API Key de Google Gemini |

### 3. Iniciar el servidor de desarrollo

```bash
# Web (PWA en navegador)
npm run web

# Con limpieza de caché
npm run web -- -c
```

La app estará disponible en `http://localhost:8081`

---

## 📁 Estructura del Proyecto

```
titanfit/
├── app/
│   ├── (auth)/          # Pantallas de login y autenticación
│   ├── (tabs)/          # Pantallas principales (Dashboard, Entrenar, Nutrición, Perfil)
│   │   └── workouts/    # Pantallas del sistema de entrenamientos
│   └── stats/           # Pantallas de estadísticas avanzadas
├── components/
│   ├── nutrition/       # Componentes del módulo nutricional
│   ├── BodyHeatmap.tsx  # Mapa de calor muscular (SVG)
│   └── ThemeToggle.tsx  # Selector de tema global
├── lib/
│   ├── supabase.ts          # Cliente de Supabase
│   ├── workoutService.ts    # Lógica de entrenamientos
│   └── nutritionService.ts  # IA y lógica nutricional
├── data/
│   └── homeWorkoutsTemplates.ts  # Rutinas de ejercicio en casa
├── context/
│   └── AuthContext.tsx  # Contexto de autenticación global
├── docs/                # Documentación técnica
│   ├── architecture.md
│   ├── rules.md
│   ├── lessons_learned.md
│   └── science_guidelines.md
└── utils/
    └── calculations.ts  # Cálculos nutricionales (TDEE, macros)
```

---

## 📦 Despliegue en Vercel (PWA)

```bash
# Exportar la aplicación para web
npx expo export --platform web

# El resultado estará en dist/
# Conectar el repositorio a Vercel y configurar las mismas variables de entorno
```

> ⚠️ Configura en Vercel las mismas variables de entorno que tienes en `.env`.

---

## 📚 Documentación

- [`docs/architecture.md`](docs/architecture.md) — Arquitectura técnica y base de datos
- [`docs/rules.md`](docs/rules.md) — Reglas estrictas de desarrollo
- [`docs/lessons_learned.md`](docs/lessons_learned.md) — Bugs resueltos y lecciones aprendidas
- [`docs/science_guidelines.md`](docs/science_guidelines.md) — Pautas científicas nutricionales (ISSN)

---

## 📄 Licencia

Proyecto privado — Todos los derechos reservados.
