# Lecciones Aprendidas

> **REGLA ESTRICTA:** CADA VEZ que se resuelva un bug, un error de compilación o un problema de UI, el agente DEBE anotar aquí el problema y la solución para no repetirlo.

## Registro de Problemas y Soluciones

**[2026-03-19] - Contrato roto del hook de tema bloqueaba el typecheck**
- **Problema**: `hooks/use-color-scheme.ts` reexportaba el hook de `nativewind`, que devuelve un objeto con `colorScheme` y `setColorScheme`, pero algunos consumidores antiguos como `app/(auth)/login.tsx` y `hooks/use-theme-color.ts` seguían tratándolo como si devolviera un string. Resultado: `npx tsc --noEmit` fallaba y el proyecto no tenía una base estable de compilación.
- **Solución**: Se unificó el contrato del hook en `hooks/use-color-scheme.ts` y `hooks/use-color-scheme.web.ts`, y se ajustaron los consumidores para leer `colorScheme` explícitamente. Con esto el typecheck vuelve a pasar y se evita que web y native diverjan otra vez en la API del tema.

**[2026-03-19] - Planificador V2 dependía de un único camino multimodal con Gemini**
- **Problema**: `components/nutrition/MenuPhotoPlanner.tsx` enviaba la imagen o PDF directamente a Gemini y no tenía fallback real. Si el modelo multimodal fallaba con una foto, una imagen o un PDF, el flujo completo de planificación quedaba inutilizado aunque el archivo sí contuviera texto legible.
- **Solución**: Se extrajo la lógica a `lib/menuPlannerService.ts` y se añadió una estrategia escalonada: primero análisis directo con Gemini, y si falla, extracción local de texto en web/PWA usando `tesseract.js` para imágenes y `pdfjs-dist` para PDF. Luego Gemini genera el plan y la lista de compra a partir del texto extraído. Esto mantiene la V2, conserva el legacy archivado y reduce la dependencia de un único punto frágil.

**[2026-03-19] - Modelo Gemini obsoleto devolvía 404 en el planificador V2**
- **Problema**: El servicio del planificador seguía apuntando a `gemini-2.0-flash`. Para usuarios nuevos, la API devuelve `404` indicando que ese modelo ya no está disponible, bloqueando incluso el análisis de una simple imagen PNG.
- **Solución**: Se actualizó `lib/menuPlannerService.ts` para priorizar `gemini-2.5-flash`, añadir fallback a `gemini-2.5-flash-lite` y permitir override con `EXPO_PUBLIC_GEMINI_MODEL`. Además, si la API devuelve `404` para un modelo, el servicio prueba automáticamente el siguiente en vez de romper el flujo al primer intento.

**[2026-03-19] - La PWA podia seguir ejecutando un bundle viejo tras cambiar Gemini**
- **Problema**: Aunque el código fuente y el `dist` ya apuntaban a `gemini-2.5-*`, el usuario seguía viendo el error viejo de `gemini-2.0-flash`. La causa más probable era caché de HTML/manifest o una shell PWA antigua que seguía referenciando bundles anteriores.
- **Solución**: Se añadieron cabeceras de `Cache-Control` en `vercel.json` para evitar cachear HTML y `manifest.json`, se versionó el enlace al manifest en `app/+html.tsx` y se fijó `EXPO_PUBLIC_GEMINI_MODEL=gemini-2.5-flash` en entorno. Además, la UI del planificador muestra ahora qué cadena de modelos está activa para verificar rápidamente que el bundle cargado es el nuevo.

**[2026-03-10] - Error de enrutamiento por pantallas faltantes en Tabs (Fase 3)**
- **Problema**: En `app/(tabs)/_layout.tsx` se han definido tres pestañas (`workouts`, `nutrition`, `profile`), pero en el sistema de archivos solo existe la carpeta `workouts`. Expo Router requiere que los archivos o carpetas (ej. `nutrition.tsx` / `profile.tsx`) existan físicamente para renderizar las rutas de los Tabs, o de lo contrario la aplicación fallará al intentar inicializar el enrutador.
- **Solución**: El Builder debe crear al menos pantallas de placeholder o en construcción (ej. `nutrition.tsx` y `profile.tsx` en `app/(tabs)/`) para las pestañas definidas en el layout antes de dar la fase por completada, garantizando así que la navegación principal no colapse.

**[2026-03-10] - Falta instanciación del cliente de Supabase (Fase 1)**
- **Problema**: El paquete `@supabase/supabase-js` se encuentra instalado en el `package.json`, pero no existe ningún archivo de configuración en el proyecto (ej: `lib/supabase.ts`) que exporte el cliente de Supabase instanciado, lo cual es imprescindible para que las futuras fases se conecten a la base de datos PWA.
- **Solución**: El Builder debe crear un directorio `lib` o equivalente, y añadir un archivo `supabase.ts` (u otro nombre coherente con la modularización exigida) exportando el objeto cliente configurado con URL y Anon Key (idealmente preparándolo para usar variables de entorno `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

**[2026-03-10] - Error de enrutamiento por pantallas faltantes en Tabs (Fase 3)**
- **Problema**: En `app/(tabs)/_layout.tsx` se han definido tres pestañas (`workouts`, `nutrition`, `profile`), pero en el sistema de archivos solo existe la carpeta `workouts`. Expo Router requiere que los archivos o carpetas (ej. `nutrition.tsx` / `profile.tsx`) existan físicamente para renderizar las rutas de los Tabs, o de lo contrario la aplicación fallará al intentar inicializar el enrutador.
- **Solución**: El Builder debe crear al menos pantallas de placeholder o en construcción (ej. `nutrition.tsx` y `profile.tsx` en `app/(tabs)/`) para las pestañas definidas en el layout antes de dar la fase por completada, garantizando así que la navegación principal no colapse.

---
### Plantilla para nuevos registros:
**[Fecha] - [Breve descripción del problema]**
- **Problema**: [Descripción clara de lo que fallaba]
- **Solución**: [Explicación detallada de cómo se solucionó y por qué]

**[2026-03-10] - Repetición de Platos en Generación AI (Gemini JSON Mode)**
- **Problema**: La IA generaba exactamente la misma combinación de platos una y otra vez (cero variedad). La causa raíz no era un error lógico en la arquitectura, sino que Gemini, cuando se usa con `responseMimeType: 'application/json'`, desactiva por defecto la entropía y funciona de manera casi determinista si no se le especifica temperatura explícitamente.
- **Solución**: Se actualizó `generationConfig` en el servicio de nutrición (helper genérico `geminiCall`) para forzar `temperature: 0.9` y `topP: 0.95`. Además, se inyectó una semilla de aleatoriedad basada en tiempo (`Date.now() % 99999`) dentro de los prompts y variables para obligar a la IA a procesar un bloque de texto distinto en cada llamada y forzar diversidad culinaria, priorizando también los alimentos favoritos.

**[2026-03-10] - Audit completa: Repetición cross-day y falta de variedad semanal**
- **Problema**: Aunque se había añadido `temperature: 0.9`, las 7 llamadas a Gemini (una por día) eran **completamente independientes**. Cada prompt decía "no repitas" pero el modelo no tenía memoria de qué generó para otros días. Resultado: los mismos platos aparecían en Lunes, Martes, etc. La seed `Date.now() % 99999` era casi idéntica entre llamadas consecutivas.
- **Solución**: Se refactorizó `_generateOneDayMeals` para aceptar un parámetro `previousMeals: string[]` con los nombres de platos ya generados. El prompt ahora incluye un bloque "⛔ PLATOS YA GENERADOS — PROHIBIDO REPETIRLOS". La seed ahora combina `Date.now() + dayIndex * 17389 + Math.random()` para máxima entropía. En `DailyTracker.tsx`, `handleGenerateWeek` acumula los nombres y los pasa al siguiente día.

**[2026-03-10] - Modelo Gemini incorrecto (gemini-2.5-flash)**
- **Problema**: La URL de la API apuntaba a `gemini-2.5-flash` que puede no estar disponible o responder de forma inesperada (respuestas vacías/errores silenciosos que hacían fallar la generación de días).
- **Solución**: Cambiado a `gemini-2.0-flash` que es el modelo estable y rápido de la API.

**[2026-03-10] - Reroll calcula macros restantes incorrectamente**
- **Problema**: Al hacer reroll de un plato, el presupuesto de macros se calculaba restando **solo** los platos bloqueados/completados, en vez de **todos** los demás platos del día. Resultado: el plato nuevo recibía un presupuesto de macros inflado (ej: 2000 kcal para una sola comida en un plan de 2500).
- **Solución**: Cambiado `meals.filter(m => m.id !== meal.id && (m.is_locked || m.is_completed))` → `meals.filter(m => m.id !== meal.id)` para considerar todos los demás platos al calcular el presupuesto restante.

**[2026-03-10] - Schema SQL desincronizado con el código**
- **Problema**: El archivo `database_schema_nutrition.sql` no incluía columnas que el código TypeScript usa (`sex`, `age`, `height_cm`, `meals_per_day`, `activity_level`, `training_days`, `loved_foods`, `disliked_foods`). Si estas columnas no existen en Supabase, el upsert del perfil las ignora silenciosamente → el prompt de la IA recibe `undefined` en campos críticos.
- **Solución**: Actualizado el schema SQL documentado. Incluidos ALTER TABLE que el usuario debe ejecutar si las columnas no existen en la DB real.

**[2026-03-11] - Timeout insuficiente para gemini-2.5-flash (thinking model)**
- **Problema**: El timeout estaba en 45s, pero `gemini-2.5-flash` es un "thinking model" que necesita ~30-60s por respuesta de nutrición. 5/7 días fallaban por timeout en el test en vivo.
- **Solución**: Timeout aumentado a **90s**. Añadida lógica de **retry** con 3 intentos y backoff exponencial (3s, 6s, 9s) para errores 429/5xx y timeouts. Delay entre días aumentado a 3s.

**[2026-03-11] - Gemini devuelve decimales en campos INT → Supabase los rechaza**
- **Problema**: Gemini a veces devuelve valores como `"124.2"` o `"33.5"` para calorías/proteínas/etc. PostgreSQL rechaza estos en columnas `INT` con error `invalid input syntax for type integer`.
- **Solución**: Añadido `Math.round(Number(value) || 0)` a todos los campos numéricos en `_generateOneDayMeals()` y `rerollMeal()` antes de guardar en Supabase. Verificado en test live: todos los valores son enteros correctos.

**[2026-03-14] - Desincronización de Temas entre Pantallas (Tabs)**
- **Problema**: Al usar `useColorScheme` de `react-native`, el estado del tema no siempre se sincronizaba correctamente entre pestañas (ej: Dashboard en oscuro, Nutrición en claro). Esto ocurría porque NativeWind a veces requiere su propio hook para forzar la reactividad en el árbol de componentes de Expo Router.
- **Solución**: Se estandarizó el uso de `import { useColorScheme } from 'nativewind'` en todas las pantallas. Esto asegura que un cambio en el `ThemeToggle` se propague instantáneamente a todas las pestañas abiertas.
 
**[2026-03-14] - Estilos Oscuros "Pegados" (Hardcoding en PWA)**
- **Problema**: Muchas pantallas (especialmente `active.tsx` e `index.tsx` de workouts) tenían fondos `bg-zinc-950` fijos. Al cambiar a modo claro, el fondo seguía siendo negro, haciendo el texto ilegible o rompiendo la estética.
- **Solución**: Se implementó una auditoría total eliminando todos los fondos fijos por condicionales basados en `isDark`. Se estableció la regla de "Zero Hardcoding" en `rules.md`.
 
**[2026-03-14] - Iconografía Jarring (Sol Amarillo vs Estética Premium)**
- **Problema**: El icono del sol en el selector de temas usaba un amarillo chillón que desentonaba con la paleta de colores "Elite" (Titanium/Blue/Dark).
- **Solución**: Se cambió el color del icono a blanco (`#ffffff`) con ajustes de opacidad. Esto mantiene la claridad funcional (sol = día) pero eleva la percepción de calidad de la UI, integrándose mejor con el resto de la interfaz.
 
**[2026-03-14] - Jerarquía Visual en Pantalla de Entrenamiento (Motivación)**
- **Problema**: Al restaurar la frase motivadora, se perdía el impacto visual si no se acompañaba de un elemento gráfico potente.
- **Solución**: Se implementó un componente de "Motivación Central" con un icono `Zap` (rayo) con efecto *glow* azul y tipografía *black uppercase* para crear un punto focal "wow" antes de iniciar la sesión, reforzando la psicología del entrenamiento.
