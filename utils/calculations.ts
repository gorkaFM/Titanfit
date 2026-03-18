/**
 * Utilidades de cálculo para entrenamiento y rendimiento
 */

/**
 * Calcula el 1RM (Una Repetición Máxima) estimada usando la fórmula de Epley.
 * Fórmula: peso * (1 + (reps / 30))
 */
export const calculateEpley1RM = (weight: number, reps: number): number => {
    if (reps === 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
};

/**
 * Formatea una serie histórica para visualización
 * Ej: "80kg x 10"
 */
export const formatSetPerformance = (weight: number, reps: number): string => {
    return `${weight}kg x ${reps}`;
};
