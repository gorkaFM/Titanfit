export interface Exercise {
    id: string;
    name: string;
    target_muscle_group: string;
    animation_url?: string;
}

export interface WorkoutSet {
    id?: string;
    reps: number;
    weight: number;
    rpe?: number; // Rate of Perceived Exertion
    rest_seconds?: number; // Tiempo de descanso en segundos
    is_completed: boolean;
    duration_seconds?: number;
}

export interface WorkoutExercise {
    id: string;
    exercise_id: string;
    exercise?: Exercise;
    supersets_with?: string | null; // ID of another WorkoutExercise to link as superset
    sets: WorkoutSet[];
}

export interface Workout {
    id: string;
    user_id: string;
    name: string;
    date: string;
    is_completed: boolean;
    duration_seconds?: number;
    exercises: WorkoutExercise[];
}
