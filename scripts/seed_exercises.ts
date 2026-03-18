import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const EXERCISE_SOURCE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

const top100Exercises = [
    // PECHO
    { id: "barbell_bench_press", name: "Press de Banca con Barra", muscle: "Pecho" },
    { id: "dumbbell_bench_press", name: "Press de Banca con Mancuernas", muscle: "Pecho" },
    { id: "incline_barbell_bench_press", name: "Press Inclinado con Barra", muscle: "Pecho" },
    { id: "incline_dumbbell_bench_press", name: "Press Inclinado con Mancuernas", muscle: "Pecho" },
    { id: "decline_barbell_bench_press", name: "Press Declinado con Barra", muscle: "Pecho" },
    { id: "dumbbell_flys", name: "Aperturas con Mancuernas", muscle: "Pecho" },
    { id: "cable_crossover", name: "Cruce de Poleas", muscle: "Pecho" },
    { id: "push_up", name: "Flexiones de Brazos", muscle: "Pecho" },
    { id: "chest_dip", name: "Fondos de Pecho", muscle: "Pecho" },
    { id: "diamond_push_up", name: "Flexiones Diamante", muscle: "Pecho" },
    { id: "pec_deck", name: "Pec Deck (Contractora)", muscle: "Pecho" },
    { id: "low_to_high_cable_fly", name: "Aperturas en Polea Baja", muscle: "Pecho" },
    { id: "smith_machine_bench_press", name: "Press de Banca en Multipower", muscle: "Pecho" },
    { id: "weighted_push_up", name: "Flexiones Lastradas", muscle: "Pecho" },
    { id: "floor_press", name: "Floor Press", muscle: "Pecho" },
    
    // ESPALDA
    { id: "deadlift", name: "Peso Muerto Convencional", muscle: "Espalda" },
    { id: "pull_up", name: "Dominadas", muscle: "Espalda" },
    { id: "chin_up", name: "Dominadas Supinas", muscle: "Espalda" },
    { id: "barbell_row", name: "Remo con Barra", muscle: "Espalda" },
    { id: "one_arm_dumbbell_row", name: "Remo con Mancuerna", muscle: "Espalda" },
    { id: "lat_pulldown", name: "Jalón al Pecho", muscle: "Espalda" },
    { id: "seated_cable_row", name: "Remo en Polea Baja", muscle: "Espalda" },
    { id: "t_bar_row", name: "Remo en T", muscle: "Espalda" },
    { id: "face_pull", name: "Face Pull", muscle: "Espalda" },
    { id: "shrug", name: "Encogimientos de Hombros", muscle: "Espalda" },
    { id: "back_extension", name: "Hiperextensiones", muscle: "Espalda" },
    { id: "straight_arm_pulldown", name: "Jalón con Brazos Rectos", muscle: "Espalda" },
    { id: "sumo_deadlift", name: "Peso Muerto Sumo", muscle: "Espalda" },
    { id: "rack_pull", name: "Rack Pull", muscle: "Espalda" },
    { id: "inverted_row", name: "Remo Invertido", muscle: "Espalda" },
    { id: "pullover", name: "Pull-over con Mancuerna", muscle: "Espalda" },

    // PIERNAS
    { id: "barbell_squat", name: "Sentadilla Trasera", muscle: "Piernas" },
    { id: "front_squat", name: "Sentadilla Frontal", muscle: "Piernas" },
    { id: "leg_press", name: "Prensa de Piernas", muscle: "Piernas" },
    { id: "dumbbell_lunge", name: "Zancadas", muscle: "Piernas" },
    { id: "bulgarian_split_squat", name: "Sentadilla Búlgara", muscle: "Piernas" },
    { id: "leg_extension", name: "Extensión de Cuádriceps", muscle: "Piernas" },
    { id: "leg_curl", name: "Curl Femoral", muscle: "Piernas" },
    { id: "romanian_deadlift", name: "Peso Muerto Rumano", muscle: "Piernas" },
    { id: "goblet_squat", name: "Sentadilla Goblet", muscle: "Piernas" },
    { id: "hack_squat", name: "Sentadilla Hack", muscle: "Piernas" },
    { id: "hip_thrust", name: "Hip Thrust", muscle: "Piernas" },
    { id: "standing_calf_raise", name: "Elevación de Gemelos de pie", muscle: "Piernas" },
    { id: "seated_calf_raise", name: "Elevación de Gemelos sentado", muscle: "Piernas" },
    { id: "step_up", name: "Subida al Cajón", muscle: "Piernas" },
    { id: "glute_bridge", name: "Puente de Glúteo", muscle: "Piernas" },
    { id: "stiff_leg_deadlift", name: "Peso Muerto Piernas Rígidas", muscle: "Piernas" },
    { id: "abductor_machine", name: "Máquina de Aductores", muscle: "Piernas" },

    // HOMBROS
    { id: "overhead_press", name: "Press Militar", muscle: "Hombros" },
    { id: "dumbbell_shoulder_press", name: "Press de Hombros Mancuernas", muscle: "Hombros" },
    { id: "dumbbell_lateral_raise", name: "Elevaciones Laterales", muscle: "Hombros" },
    { id: "dumbbell_rear_delt_fly", name: "Pájaros con Mancuernas", muscle: "Hombros" },
    { id: "arnold_press", name: "Press Arnold", muscle: "Hombros" },
    { id: "front_raise", name: "Elevaciones Frontales", muscle: "Hombros" },
    { id: "upright_row", name: "Remo al mentón", muscle: "Hombros" },
    { id: "cable_lateral_raise", name: "Elevaciones Laterales Polea", muscle: "Hombros" },
    { id: "reverse_pec_deck", name: "Pec Deck Inverso", muscle: "Hombros" },
    { id: "push_press", name: "Push Press", muscle: "Hombros" },

    // BRAZOS
    { id: "barbell_curl", name: "Curl de Bíceps con Barra", muscle: "Brazos" },
    { id: "dumbbell_curl", name: "Curl de Bíceps Mancuernas", muscle: "Brazos" },
    { id: "hammer_curl", name: "Curl Martillo", muscle: "Brazos" },
    { id: "preacher_curl", name: "Curl Predicador", muscle: "Brazos" },
    { id: "ez_bar_curl", name: "Curl con Barra Z", muscle: "Brazos" },
    { id: "triceps_pushdown", name: "Extensión de Tríceps Polea", muscle: "Brazos" },
    { id: "skull_crusher", name: "Press Francés", muscle: "Brazos" },
    { id: "bench_dip", name: "Fondos de Tríceps", muscle: "Brazos" },
    { id: "overhead_dumbbell_extension", name: "Extensión Tríceps tras nuca", muscle: "Brazos" },
    { id: "cable_curl", name: "Curl en Polea", muscle: "Brazos" },
    { id: "kickback", name: "Patada de Tríceps", muscle: "Brazos" },
    { id: "weighted_dips", name: "Fondos Lastrados", muscle: "Brazos" },

    // CORE
    { id: "plank", name: "Plancha Abdominal", muscle: "Core" },
    { id: "crunch", name: "Crunch Abdominal", muscle: "Core" },
    { id: "leg_raise", name: "Elevación de Piernas", muscle: "Core" },
    { id: "russian_twist", name: "Giro Ruso", muscle: "Core" },
    { id: "mountain_climber", name: "Escaladores", muscle: "Core" },
    { id: "hanging_leg_raise", name: "Elevación de Piernas Colgado", muscle: "Core" },
    { id: "ab_wheel", name: "Rueda Abdominal", muscle: "Core" },
    { id: "bicycle_crunch", name: "Crunch de Bicicleta", muscle: "Core" },
    { id: "side_plank", name: "Plancha Lateral", muscle: "Core" },
    { id: "hollow_hold", name: "Hollow Hold", muscle: "Core" },
];

const seedExercises = async () => {
    console.log('🚀 Reiniciando catálogo a Élite Clásicos (Español)...');
    
    try {
        // 1. Limpiar catálogo actual
        await supabase.from('exercises_library').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        const response = await fetch(EXERCISE_SOURCE_URL);
        const sourceData = await response.json();
        
        const finalToInsert = top100Exercises.map(target => {
            // Intentar encontrar el match en el JSON original para pillar la URL de animación
            const match = sourceData.find((ex: any) => 
                ex.id === target.id.replace(/_/g, '-') ||
                ex.name.toLowerCase() === target.id.replace(/_/g, ' ').toLowerCase()
            );

            const ani_id = match ? match.id : target.id.replace(/_/g, '-');
            const animation_url = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${ani_id}/0.jpg`;

            return {
                name: target.name,
                target_muscle_group: target.muscle,
                animation_url: animation_url
            };
        });

        // Filtrar duplicados por nombre para evitar errores en la lógica interna del script
        const uniqueExercises = Array.from(new Map(finalToInsert.map(item => [item.name, item])).values());

        const { error } = await supabase.from('exercises_library').upsert(uniqueExercises, { onConflict: 'name' });
        if (error) throw error;

        console.log(`✅ ¡Éxito! ${finalToInsert.length} ejercicios de élite insertados.`);
    } catch (err) {
        console.error('💥 Error durante el seed:', err);
    }
};

seedExercises();
