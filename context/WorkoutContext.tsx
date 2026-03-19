import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { WorkoutExercise } from '@/types/workout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkoutContextType {
    // Is a workout session currently active?
    isActive: boolean;
    // All exercises in the current workout
    workoutExercises: WorkoutExercise[];
    setWorkoutExercises: React.Dispatch<React.SetStateAction<WorkoutExercise[]>>;
    // Timer control
    workoutStarted: boolean;
    setWorkoutStarted: (v: boolean) => void;
    elapsedSeconds: number;
    setElapsedSeconds: React.Dispatch<React.SetStateAction<number>>;
    // Start / clear session
    startSession: () => void;
    clearSession: () => void;
    // Extra blocks available for home workouts
    availableExtraBlocks: WorkoutExercise[];
    setAvailableExtraBlocks: React.Dispatch<React.SetStateAction<WorkoutExercise[]>>;
    isHomeWorkoutPlan: boolean;
    setIsHomeWorkoutPlan: (v: boolean) => void;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
    const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
    const [workoutStarted, setWorkoutStartedState] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [availableExtraBlocks, setAvailableExtraBlocks] = useState<WorkoutExercise[]>([]);
    const [isHomeWorkoutPlan, setIsHomeWorkoutPlan] = useState(false);

    const isActive = workoutExercises.length > 0 || workoutStarted;

    const setWorkoutStarted = useCallback((v: boolean) => {
        setWorkoutStartedState(v);
    }, []);

    const startSession = useCallback(() => {
        setWorkoutStartedState(true);
        setElapsedSeconds(0);
    }, []);

    const clearSession = useCallback(() => {
        setWorkoutExercises([]);
        setWorkoutStartedState(false);
        setElapsedSeconds(0);
        setAvailableExtraBlocks([]);
        setIsHomeWorkoutPlan(false);
    }, []);

    return (
        <WorkoutContext.Provider value={{
            isActive,
            workoutExercises, setWorkoutExercises,
            workoutStarted, setWorkoutStarted,
            elapsedSeconds, setElapsedSeconds,
            startSession, clearSession,
            availableExtraBlocks, setAvailableExtraBlocks,
            isHomeWorkoutPlan, setIsHomeWorkoutPlan,
        }}>
            {children}
        </WorkoutContext.Provider>
    );
}

export function useWorkout(): WorkoutContextType {
    const ctx = useContext(WorkoutContext);
    if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider');
    return ctx;
}
