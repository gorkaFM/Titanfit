import { WorkoutExercise } from '../types/workout';

export interface HomeWorkoutTemplate {
    id: string;
    name: string;
    description: string;
    exercises: WorkoutExercise[];
}

// Helper para crear sets estándar de 3 rondas
const createStandardSets = (reps: number, rest: number = 0) => Array(3).fill(null).map(() => ({
    reps,
    weight: 0,
    is_completed: false,
    rest_seconds: rest
}));

export const RUTINA_A_EMPUJE: HomeWorkoutTemplate = {
    id: 'routine-a-push',
    name: 'Rutina A (Empuje)',
    description: 'Foco en pecho, cuádriceps, hombros y tríceps. Estructura de triseries.',
    exercises: [
        // BLOQUE 1: PECHO
        {
            id: 'b1-e1',
            exercise_id: 'fbf8b1f3-15b7-4771-b684-a01c168ab59f',
            exercise: { id: 'fbf8b1f3-15b7-4771-b684-a01c168ab59f', name: 'Press de Banca con Barra', target_muscle_group: 'Pecho' },
            sets: createStandardSets(10),
            supersets_with: null
        },
        {
            id: 'b1-e2',
            exercise_id: '03fc05e3-8bd0-40b2-b5df-5beb4fe0788b',
            exercise: { id: '03fc05e3-8bd0-40b2-b5df-5beb4fe0788b', name: 'Aperturas con Mancuernas', target_muscle_group: 'Pecho' },
            sets: createStandardSets(12),
            supersets_with: 'b1-e1'
        },
        {
            id: 'b1-e3',
            exercise_id: 'a43094c6-143d-4618-b868-682727da04f4',
            exercise: { id: 'a43094c6-143d-4618-b868-682727da04f4', name: 'Flexiones', target_muscle_group: 'Pecho' },
            sets: createStandardSets(15, 90), // Descanso al final de la triserie
            supersets_with: 'b1-e1'
        },

        // BLOQUE 2: CUÁDRICEPS
        {
            id: 'b2-e1',
            exercise_id: 'ce6df703-0bee-4248-a174-68839806da67',
            exercise: { id: 'ce6df703-0bee-4248-a174-68839806da67', name: 'Sentadilla Goblet', target_muscle_group: 'Piernas' },
            sets: createStandardSets(12),
            supersets_with: null
        },
        {
            id: 'b2-e2',
            exercise_id: '3e973aaf-9543-4429-ab56-06603d2b01bb',
            exercise: { id: '3e973aaf-9543-4429-ab56-06603d2b01bb', name: 'Zancadas', target_muscle_group: 'Piernas' },
            sets: createStandardSets(10),
            supersets_with: 'b2-e1'
        },
        {
            id: 'b2-e3',
            exercise_id: 'f1decac8-d8b2-4858-913a-aecc435648be',
            exercise: { id: 'f1decac8-d8b2-4858-913a-aecc435648be', name: 'Sentadilla', target_muscle_group: 'Piernas' },
            sets: createStandardSets(60, 90),
            supersets_with: 'b2-e1'
        },

        // BLOQUE 3: HOMBRO
        {
            id: 'b3-e1',
            exercise_id: 'dbe187a8-9705-4cf0-b126-144d318437cc',
            exercise: { id: 'dbe187a8-9705-4cf0-b126-144d318437cc', name: 'Press Militar', target_muscle_group: 'Hombros' },
            sets: createStandardSets(12),
            supersets_with: null
        },
        {
            id: 'b3-e2',
            exercise_id: '31093ba0-4638-40e4-9570-aff1708df6d4',
            exercise: { id: '31093ba0-4638-40e4-9570-aff1708df6d4', name: 'Elevaciones Laterales', target_muscle_group: 'Hombros' },
            sets: createStandardSets(15),
            supersets_with: 'b3-e1'
        },
        {
            id: 'b3-e3',
            exercise_id: '7f0fab1e-0845-4b9b-a754-3465265296c9',
            exercise: { id: '7f0fab1e-0845-4b9b-a754-3465265296c9', name: 'Elevaciones Frontales', target_muscle_group: 'Hombros' },
            sets: createStandardSets(15, 90),
            supersets_with: 'b3-e1'
        },

        // BLOQUE 4: TRÍCEPS
        {
            id: 'b4-e1',
            exercise_id: 'f1af7deb-a6ad-40a0-b67a-1677571efb79',
            exercise: { id: 'f1af7deb-a6ad-40a0-b67a-1677571efb79', name: 'Press Francés', target_muscle_group: 'Brazos' },
            sets: createStandardSets(12),
            supersets_with: null
        },
        {
            id: 'b4-e2',
            exercise_id: 'ebdf858f-08ca-4dbf-b0e3-d46016b46f97',
            exercise: { id: 'ebdf858f-08ca-4dbf-b0e3-d46016b46f97', name: 'Extensión de Tríceps tras Nuca', target_muscle_group: 'Brazos' },
            sets: createStandardSets(12),
            supersets_with: 'b4-e1'
        },
        {
            id: 'b4-e3',
            exercise_id: '985a6d70-d714-4b71-b69b-86e351629161',
            exercise: { id: '985a6d70-d714-4b71-b69b-86e351629161', name: 'Fondos de Tríceps', target_muscle_group: 'Brazos' },
            sets: createStandardSets(15, 90),
            supersets_with: 'b4-e1'
        },

        // BLOQUE 5: CORE (EXTRA/FINISHER)
        {
            id: 'b5-e1',
            exercise_id: 'a58145f3-c0ac-4bdb-a7fc-2e328fe10fe7',
            exercise: { id: 'a58145f3-c0ac-4bdb-a7fc-2e328fe10fe7', name: 'Crunch', target_muscle_group: 'Core' },
            sets: createStandardSets(20),
            supersets_with: null,
            // @ts-ignore - Metadato personalizado para identificar el bloque extra
            is_extra_block: true 
        },
        {
            id: 'b5-e2',
            exercise_id: 'f09f90fe-fbd8-44cf-a5e5-3cf899773a9f',
            exercise: { id: 'f09f90fe-fbd8-44cf-a5e5-3cf899773a9f', name: 'Plancha Abdominal', target_muscle_group: 'Core' },
            sets: createStandardSets(60),
            supersets_with: 'b5-e1',
            // @ts-ignore
            is_extra_block: true
        },
        {
            id: 'b5-e3',
            exercise_id: '04bdb80b-4fd8-4b42-9dac-8f654dbce92a',
            exercise: { id: '04bdb80b-4fd8-4b42-9dac-8f654dbce92a', name: 'Crunch de Bicicleta', target_muscle_group: 'Core' },
            sets: createStandardSets(10, 90),
            supersets_with: 'b5-e1',
            // @ts-ignore
            is_extra_block: true
        }
    ]
};

export const RUTINA_B_TIRON: HomeWorkoutTemplate = {
    id: 'routine-b-pull',
    name: 'Rutina B (Tirón)',
    description: 'Foco en espalda, bíceps e isquios. Estructura de triseries.',
    exercises: [
        // BLOQUE 1: ESPALDA
        {
            id: 'b1-e1',
            exercise_id: 'a449cbca-c0e1-49ef-ba98-f0e4db635540',
            exercise: { id: 'a449cbca-c0e1-49ef-ba98-f0e4db635540', name: 'Remo con Barra', target_muscle_group: 'Espalda' },
            sets: createStandardSets(10),
            supersets_with: null
        },
        {
            id: 'b1-e2',
            exercise_id: '165ca91d-4767-4360-8783-5f07f231774f',
            exercise: { id: '165ca91d-4767-4360-8783-5f07f231774f', name: 'Remo con Mancuerna', target_muscle_group: 'Espalda' },
            sets: createStandardSets(12),
            supersets_with: 'b1-e1'
        },
        {
            id: 'b1-e3',
            exercise_id: '1da27d07-ef8f-4ddb-a1d7-21d1570a4a60',
            exercise: { id: '1da27d07-ef8f-4ddb-a1d7-21d1570a4a60', name: 'Pull-over con Mancuerna', target_muscle_group: 'Espalda' },
            sets: createStandardSets(15, 90),
            supersets_with: 'b1-e1'
        },

        // BLOQUE 2: ISQUIOS/GLÚTEO
        {
            id: 'b2-e1',
            exercise_id: 'a6038cfa-e5b1-4b18-a177-0972edb4dc64',
            exercise: { id: 'a6038cfa-e5b1-4b18-a177-0972edb4dc64', name: 'Peso Muerto Rumano', target_muscle_group: 'Piernas' },
            sets: createStandardSets(12),
            supersets_with: null
        },
        {
            id: 'b2-e2',
            exercise_id: 'a07c292f-5485-4c6c-a175-aa71ac9e1127',
            exercise: { id: 'a07c292f-5485-4c6c-a175-aa71ac9e1127', name: 'Puente de Glúteo', target_muscle_group: 'Piernas' },
            sets: createStandardSets(15),
            supersets_with: 'b2-e1'
        },
        {
            id: 'b2-e3',
            exercise_id: '8391cb57-8dc0-4bfc-9c70-68590f051652',
            exercise: { id: '8391cb57-8dc0-4bfc-9c70-68590f051652', name: 'Curl Isquios con Banda', target_muscle_group: 'Piernas' },
            sets: createStandardSets(15, 90),
            supersets_with: 'b2-e1'
        },

        // BLOQUE 3: BÍCEPS
        {
            id: 'b3-e1',
            exercise_id: '33078ffd-a340-4901-a3c8-dd7250a8d7da',
            exercise: { id: '33078ffd-a340-4901-a3c8-dd7250a8d7da', name: 'Curl de Bíceps con Barra', target_muscle_group: 'Brazos' },
            sets: createStandardSets(12),
            supersets_with: null
        },
        {
            id: 'b3-e2',
            exercise_id: 'a604f74c-a336-486f-8f39-1daa9bfe6025',
            exercise: { id: 'a604f74c-a336-486f-8f39-1daa9bfe6025', name: 'Curl Martillo', target_muscle_group: 'Brazos' },
            sets: createStandardSets(12),
            supersets_with: 'b3-e1'
        },
        {
            id: 'b3-e3',
            exercise_id: '7d9a3c1a-7a0d-4e5e-9820-f7f17e72689b',
            exercise: { id: '7d9a3c1a-7a0d-4e5e-9820-f7f17e72689b', name: 'Curl Bíceps con Banda', target_muscle_group: 'Brazos' },
            sets: createStandardSets(15, 90),
            supersets_with: 'b3-e1'
        },

        // BLOQUE 4: HOMBRO POST/TRAPECIO
        {
            id: 'b4-e1',
            exercise_id: '1b1c8e38-a6ea-4143-8485-e4815bfeef4a',
            exercise: { id: '1b1c8e38-a6ea-4143-8485-e4815bfeef4a', name: 'Pájaros con Mancuernas', target_muscle_group: 'Hombros' },
            sets: createStandardSets(15),
            supersets_with: null
        },
        {
            id: 'b4-e2',
            exercise_id: '8db6bd3f-d35a-444a-9d6c-f7fa901410b2',
            exercise: { id: '8db6bd3f-d35a-444a-9d6c-f7fa901410b2', name: 'Remo al mentón', target_muscle_group: 'Hombros' },
            sets: createStandardSets(12),
            supersets_with: 'b4-e1'
        },
        {
            id: 'b4-e3',
            exercise_id: '9077ff9d-4447-477c-8ea8-0e1bc74bf012',
            exercise: { id: '9077ff9d-4447-477c-8ea8-0e1bc74bf012', name: 'Encogimientos de Hombros', target_muscle_group: 'Hombros' },
            sets: createStandardSets(15, 90),
            supersets_with: 'b4-e1'
        },

        // BLOQUE 5: OBLICUOS (EXTRA)
        {
            id: 'b5-e1',
            exercise_id: '3b25d785-9fa3-44fe-bcc1-8c3e6527927b',
            exercise: { id: '3b25d785-9fa3-44fe-bcc1-8c3e6527927b', name: 'Press Pallof con Banda', target_muscle_group: 'Core' },
            sets: createStandardSets(10),
            supersets_with: null,
            // @ts-ignore
            is_extra_block: true
        },
        {
            id: 'b5-e2',
            exercise_id: '13ba9654-ea76-44c6-ba36-ad097bd71523',
            exercise: { id: '13ba9654-ea76-44c6-ba36-ad097bd71523', name: 'Giro Ruso', target_muscle_group: 'Core' },
            sets: createStandardSets(15),
            supersets_with: 'b5-e1',
            // @ts-ignore
            is_extra_block: true
        },
        {
            id: 'b5-e3',
            exercise_id: '1a33a80d-8e20-46f0-b7ee-a4bbb9c9b339',
            exercise: { id: '1a33a80d-8e20-46f0-b7ee-a4bbb9c9b339', name: 'Plancha Lateral', target_muscle_group: 'Core' },
            sets: createStandardSets(30, 90),
            supersets_with: 'b5-e1',
            // @ts-ignore
            is_extra_block: true
        }
    ]
};

export const RUTINA_C_UNILATERAL: HomeWorkoutTemplate = {
    id: 'routine-c-unilateral',
    name: 'Rutina C (Unilateral/Propina)',
    description: 'Foco en trabajo unilateral para corregir asimetrías.',
    exercises: [
        // BLOQUE 1: PECHO
        {
            id: 'b1-e1',
            exercise_id: '91c2b01c-36cf-4d42-87b6-56d5076c2890',
            exercise: { id: '91c2b01c-36cf-4d42-87b6-56d5076c2890', name: 'Press cerrado mancuernas', target_muscle_group: 'Pecho' },
            sets: createStandardSets(12),
            supersets_with: null
        },
        {
            id: 'b1-e2',
            exercise_id: 'fa002b1c-5260-40b4-ae9f-350fa82b7568',
            exercise: { id: 'fa002b1c-5260-40b4-ae9f-350fa82b7568', name: 'Flexiones Diamante', target_muscle_group: 'Pecho' },
            sets: createStandardSets(15),
            supersets_with: 'b1-e1'
        },
        {
            id: 'b1-e3',
            exercise_id: '2d94ab9d-1fa9-498e-85fa-cd25fdd4ce8a',
            exercise: { id: '2d94ab9d-1fa9-498e-85fa-cd25fdd4ce8a', name: 'Cruces con Banda', target_muscle_group: 'Pecho' },
            sets: createStandardSets(15, 90),
            supersets_with: 'b1-e1'
        },

        // BLOQUE 2: PIERNA
        {
            id: 'b2-e1',
            exercise_id: '832404f0-1a30-4411-b81d-d1c4e4edf5fa',
            exercise: { id: '832404f0-1a30-4411-b81d-d1c4e4edf5fa', name: 'Sentadilla Búlgara', target_muscle_group: 'Piernas' },
            sets: createStandardSets(10),
            supersets_with: null
        },
        {
            id: 'b2-e2',
            exercise_id: '50bab6ec-776f-4f7d-9e09-69f9c4f97471',
            exercise: { id: '50bab6ec-776f-4f7d-9e09-69f9c4f97471', name: 'Peso Muerto 1 pierna', target_muscle_group: 'Piernas' },
            sets: createStandardSets(10),
            supersets_with: 'b2-e1'
        },
        {
            id: 'b2-e3',
            exercise_id: '63ea04fc-1ebd-46ea-9f87-9d4383def69c',
            exercise: { id: '63ea04fc-1ebd-46ea-9f87-9d4383def69c', name: 'Elevación de Gemelos de pie', target_muscle_group: 'Piernas' },
            sets: createStandardSets(20, 90),
            supersets_with: 'b2-e1'
        },

        // BLOQUE 3: HOMBROS
        {
            id: 'b3-e1',
            exercise_id: 'c85c9fa5-36a3-4282-b3f3-ded53bc955f5',
            exercise: { id: 'c85c9fa5-36a3-4282-b3f3-ded53bc955f5', name: 'Press Arnold', target_muscle_group: 'Hombros' },
            sets: createStandardSets(12),
            supersets_with: null
        },
        {
            id: 'b3-e2',
            exercise_id: 'ef226eb3-d668-46ff-8e3d-aafb114beb8a',
            exercise: { id: 'ef226eb3-d668-46ff-8e3d-aafb114beb8a', name: 'Elevación lateral banda', target_muscle_group: 'Hombros' },
            sets: createStandardSets(15),
            supersets_with: 'b3-e1'
        },
        {
            id: 'b3-e3',
            exercise_id: '72e7d8dd-4963-4b50-8e78-a0449b04b531',
            exercise: { id: '72e7d8dd-4963-4b50-8e78-a0449b04b531', name: 'Face Pull', target_muscle_group: 'Hombros' },
            sets: createStandardSets(15, 90),
            supersets_with: 'b3-e1'
        },

        // BLOQUE 4: BRAZOS
        {
            id: 'b4-e1',
            exercise_id: 'e8dae0a7-5747-411a-8b9a-cabff5ef9f1b',
            exercise: { id: 'e8dae0a7-5747-411a-8b9a-cabff5ef9f1b', name: 'Curl Concentrado', target_muscle_group: 'Brazos' },
            sets: createStandardSets(12),
            supersets_with: null
        },
        {
            id: 'b4-e2',
            exercise_id: '9f245a62-32d0-4d56-adf9-34437a73243f',
            exercise: { id: '9f245a62-32d0-4d56-adf9-34437a73243f', name: 'Patada tríceps', target_muscle_group: 'Brazos' },
            sets: createStandardSets(12),
            supersets_with: 'b4-e1'
        },
        {
            id: 'b4-e3',
            exercise_id: '5573024c-f23b-4b11-be61-2be10176c3ff',
            exercise: { id: '5573024c-f23b-4b11-be61-2be10176c3ff', name: 'Curl inverso barra', target_muscle_group: 'Brazos' },
            sets: createStandardSets(15, 90),
            supersets_with: 'b4-e1'
        },

        // BLOQUE 5: LUMBAR (EXTRA)
        {
            id: 'b5-e1',
            exercise_id: '4a9cffb4-1227-4f67-84a4-c9cc694c9072',
            exercise: { id: '4a9cffb4-1227-4f67-84a4-c9cc694c9072', name: 'Superman (Lumbares)', target_muscle_group: 'Espalda' },
            sets: createStandardSets(15),
            supersets_with: null,
            // @ts-ignore
            is_extra_block: true
        },
        {
            id: 'b5-e2',
            exercise_id: 'a4203b68-7744-4c76-ac1c-03f47610d5c5',
            exercise: { id: 'a4203b68-7744-4c76-ac1c-03f47610d5c5', name: 'Buenos días banda elástica', target_muscle_group: 'Espalda' },
            sets: createStandardSets(15),
            supersets_with: 'b5-e1',
            // @ts-ignore
            is_extra_block: true
        },
        {
            id: 'b5-e3',
            exercise_id: 'ca0486b7-f924-44b0-81a6-0b67e7f3c855',
            exercise: { id: 'ca0486b7-f924-44b0-81a6-0b67e7f3c855', name: 'Plancha del oso', target_muscle_group: 'Core' },
            sets: createStandardSets(40, 90),
            supersets_with: 'b5-e1',
            // @ts-ignore
            is_extra_block: true
        }
    ]
};

export const HOME_WORKOUTS = [RUTINA_A_EMPUJE, RUTINA_B_TIRON, RUTINA_C_UNILATERAL];
