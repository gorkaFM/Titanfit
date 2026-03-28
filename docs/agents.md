# Sistema de Enjambre de Agentes (Agent Swarm)

## Arquitectura y Orquestación

Este documento define la estructura del enjambre de agentes (Agent Swarm) que trabajará en el desarrollo de TitanFit. El objetivo de esta arquitectura es **maximizar la eficiencia**, asegurar la máxima calidad técnica y de experiencia, y **minimizar drásticamente el consumo de tokens** seleccionando el modelo de IA preciso para la tarea precisa.

### 1. El Orquestador (System)
- **Rol**: Líder técnico y de producto. Coordina el proyecto, recibe requerimientos del usuario y toma decisiones estratégicas.
- **Responsabilidades**: Desglosar tareas, asignar el trabajo al especialista adecuado proporcionando *exclusivamente* el contexto necesario (cero relleno de tokens). Debe revisar el trabajo de los agentes de forma implacablemente crítica y cuestionar cualquier enfoque subóptimo o inseguro antes de integrarlo.
- **Modelo**: **Gemini 3.1 Pro HIGH** o **Claude Opus 4.6** (máxima capacidad de razonamiento lógico, memoria a largo plazo y comprensión del ciclo de vida global del software).

### 2. Agente Frontend (UI/UX Engineering)
- **Rol**: Constructor de interfaces y lógica de cliente.
- **Responsabilidades**: Desarrollo de componentes Expo/React Native, control de estado local, estilización con NativeWind y Responsive Design para PWA.
- **Modelo**: **Claude Sonnet 4.6** (destaca en la escritura rápida de código limpio, refactorizaciones y generación de componentes sin perder el contexto; excelente balance coste/rendimiento).

### 3. Agente Backend & Data (Supabase & APIs)
- **Rol**: Arquitecto de datos y lógica de servidor.
- **Responsabilidades**: Definición rigurosa de SQL schemas, políticas de seguridad RLS, y gestión de llamadas y procesado de APIs externas (Gemini, USDA, Open Food Facts).
- **Modelo**: **Gemini 3.1 Pro HIGH / LOW** (su enorme ventana de contexto le permite procesar el schema completo de la base de datos sin fragmentarlo, asegurando cero discrepancias de tipos).

### 4. Agente de Revisión UX/UI (Crítico de Producto)
- **Rol**: Auditor de usabilidad y estética.
- **Responsabilidades**: Antes de aceptar la interfaz finalizada, este agente evalúa el contraste, la jerarquía visual, la coherencia del "Zero Hardcoding" y recomienda micro-animaciones o mejoras de flujo.
- **Modelo**: **Gemini 3 Flash** (instantáneo, excelente para análisis iterativo rápido y muy bajo coste de tokens. Ideal para preguntas rápidas de validación).

### 5. Agente de Seguridad & QA (Auditor)
- **Rol**: Inspector implacable de código y procesos.
- **Responsabilidades**: Detectar fallos lógicos ocultos, fugas de API Keys, problemas de autenticación o ineficiencias de rendimiento (loops infinitos, re-renders innecesarios).
- **Modelo**: **Claude Opus 4.6** o **Gemini 3.1 Pro LOW** (se le invoca solo en PRs críticos o en fases finales de cierre de features para una revisión minuciosa e independiente).

---

## Protocolo de Eficiencia (Token-Saving) y Comunicación

1. **Aislamiento de Contexto**: El Orquestador nunca enviará el repositorio entero a un agente. Extraerá las 100-200 líneas relevantes, explicará el objetivo y solicitará el parche exacto.
2. **Revisión Cruzada**: Un agente implementa y el Orquestador revisa. Si la decisión genera dudas, el Orquestador interrogará al Agente de UX o al de QA (usando modelos flash para consultas ligeras).
3. **Persistencia del Conocimiento**: Cada decisión arquitectónica clave descubierta por el enjambre se documentará inmediatamente en `docs/lessons_learned.md` o en este archivo, para evitar ciclos de ensayo/error repetidos.
4. **Adaptabilidad**: El Orquestador tiene autonomía para ascender (escalar) al modelo Opus/Pro-HIGH si el modelo Sonnet/Flash se topa con un roadblock complejo.
