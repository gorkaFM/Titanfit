# Changelog

All notable changes to **TitanFit** will be documented in this file (format: `[version] - fecha`).

---

## [1.4.0] - 2026-03-18
### Changed
- **Preparación para GitHub**: Eliminados todos los archivos boilerplate de create-expo-app (`hello-wave.tsx`, `parallax-scroll-view.tsx`, `themed-text.tsx`, `themed-view.tsx`, `external-link.tsx`, `modal.tsx`, carpeta `ui/`).
- **README**: Reescrito completamente con descripción real, stack, setup y estructura del proyecto.
- **CHANGELOG**: Actualizado con historial completo.

### Added
- `.env.example`: Plantilla de variables de entorno para facilitar la configuración.
- `docs/web_app_transition_plan.md`: Plan detallado para el despliegue en Vercel.

### Fixed
- `.gitignore`: Añadido `.env` y `.env.production` para proteger claves de API.

---

## [1.3.0] - 2026-03-14
### Added
- **Consistencia Global de Temas**: Sistema "Zero Hardcoding" — todos los colores adaptan automáticamente el tema claro/oscuro en Dashboard, Entrenar, Nutrición, Historial y todos los modales.
- **Icono Sol Premium**: El selector de tema (ThemeToggle) cambia el color del sol de amarillo a blanco elegante para armonía visual.
- **Documentación Técnica**: `docs/` actualizado con reglas de "Zero Hardcoding", arquitectura NativeWind y lecciones aprendidas sobre sincronización de temas.

### Fixed
- **Desincronización de Temas**: Estandarizado `useColorScheme` de `nativewind` en todos los componentes (eliminado import de `react-native`).
- **Estilos Hardcodeados**: Más de 50 instancias de `bg-zinc-950` fijas reemplazadas por clases condicionales `isDark ? ... : ...`.

---

## [1.2.0] - 2026-03-13
### Added
- **STOP Button**: Added to rest timers in active workouts for manual termination.
- **Motivational Empty State**: New "VAMOS A DARLE DURO" UI with Zap icon when no recent workouts exist.
- **Boxing Bell Sounds**: Realistic sounds (1 ding at 20s, 2 dings at end of rest).
- **Body Fat Tracking**: New biometric field in Profile and database.
- **Pro Weight Chart**: New "Evolución Pro" weight chart in Profile.
- **Pantalla Entrenar**: Icono Zap grande con efecto glow azul y frases motivacionales antes de iniciar sesión.

### Changed
- **Workout Button**: "Iniciar Entrenamiento" is now centered and more prominent.
- **Auto-Collapse Logic**: Workout blocks no longer collapse while a rest timer is active.
- **Stats Realignment**: Progression charts now show "Mejor Peso" (Best Weight) instead of estimated 1RM.

### Fixed
- Audio settings to allow sounds even in silent mode (iOS).
- Theme toggle switch persistence across screen navigation.
- Exercise mapping inconsistences in Dashboard stats.

---

## [1.1.0] - 2026-03-12
### Added
- **Superseries (Supersets)**: Sistema de bloques multi-ejercicio para entrenamientos avanzados.
- **Historial de Entrenamientos**: Pantalla `/workouts/history` con estadísticas por sesión.
- **Rutinas Fijas en Casa**: Rutinas A (Empuje), B (Tirón) y C (Unilateral) en la pantalla de Entrenar.
- **Selector de Temas**: Toggle claro/oscuro en header de todas las pantallas principales.
- **Gráficas de Progresión**: LineChart de evolución de pesos y 1RM en modal de detalles de ejercicio.

### Changed
- **Dashboard**: Mapa de calor muscular mejorado con datos reales de Supabase.
- **Nutrición**: Optimización de costes API — `temperature: 0.9`, entropía cross-day, batch de prompts.

---

## [1.0.0] - 2026-03-10
### Added
- Setup inicial del proyecto con Expo Router, NativeWind y Supabase.
- Autenticación con Supabase Auth.
- Módulo de Nutrición con generación de planes semanales via Gemini AI.
- Sistema base de entrenamientos con registro de series y pesos.
- Escáner de alimentos con cámara (expo-camera + lectura de código de barras).
- Perfil de usuario con métricas corporales (peso, altura, edad, actividad).
- PWA configurada con manifest para instalación en iOS/Android.
