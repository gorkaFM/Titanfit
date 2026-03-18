import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from 'nativewind';
import { workoutService } from '@/lib/workoutService';
import { Exercise, Workout, WorkoutExercise, WorkoutSet } from '@/types/workout';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarClock, ChevronLeft, Copy, Dumbbell, History, Layers, Link, Play, Plus, Search, Square, Timer, Trash2, Trophy, X, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LineChart } from 'react-native-chart-kit';
import { RUTINA_A_EMPUJE, RUTINA_B_TIRON, RUTINA_C_UNILATERAL, HOME_WORKOUTS, HomeWorkoutTemplate } from '@/data/homeWorkoutsTemplates';
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

// Componente extraído para evitar la pérdida de foco en los TextInput por re-renderizado
const ExerciseRow = React.memo(({ we, index, isDark, user, activeRestTimer, onToggleSuperset, onDuplicateBlock, onRemoveExercise, onUpdateSet, onAddSet, onDismissTimer, blockIndex, totalBlocks }: { 
    we: WorkoutExercise, 
    index: number, 
    isDark: boolean, 
    user: any, 
    activeRestTimer: { exerciseId: string, remainingSeconds: number } | null, 
    onToggleSuperset: (idx: number) => void, 
    onDuplicateBlock: (id: string) => void, 
    onRemoveExercise: (id: string) => void, 
    onUpdateSet: (id: string, sIndex: number, field: keyof WorkoutSet, val: any, restSeconds?: number) => void, 
    onAddSet: (id: string) => void,
    onDismissTimer: () => void,
    blockIndex?: number,
    totalBlocks?: number
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    
    // Auto-colapsar si todas las series están completadas
    useEffect(() => {
        const allDone = we.sets.length > 0 && we.sets.every(s => s.is_completed);
        const timerRunning = activeRestTimer?.exerciseId === we.id && activeRestTimer.remainingSeconds > 0;
        
        if (allDone && !timerRunning) {
            setIsCollapsed(true);
        } else if (!allDone) {
            setIsCollapsed(false);
        }
    }, [we.sets.map(s => s.is_completed).join(','), activeRestTimer?.remainingSeconds]);
    const isSupersetChild = we.supersets_with !== null;
    const [lastSets, setLastSets] = useState<WorkoutSet[]>([]);
    const [oneRM, setOneRM] = useState<number | null>(null);
    const [maxWeight, setMaxWeight] = useState<number>(0);
    const [runningSetIndex, setRunningSetIndex] = useState<number | null>(null);
    const [setSeconds, setSetSeconds] = useState(0);

    useEffect(() => {
        if (user && we.exercise_id) {
            // Cargar histórico de la última vez
            workoutService.getLastPerformance(user.id, we.exercise_id).then(sets => {
                if (sets) setLastSets(sets);
            });
            // Cargar 1RM histórico
            workoutService.getHistorical1RM(user.id, we.exercise_id).then(val => {
                if (val > 0) setOneRM(val);
            });
            // Cargar Mejor Peso histórico
            workoutService.getHistoricalMaxWeight(user.id, we.exercise_id).then(val => {
                if (val > 0) setMaxWeight(val);
            });
        }
    }, [user, we.exercise_id]);

    // Timer para la serie activa
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (runningSetIndex !== null) {
            timer = setInterval(() => {
                setSetSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [runningSetIndex]);

    const handleToggleSet = (sIndex: number) => {
        const set = we.sets[sIndex];
        if (set.is_completed) {
            onUpdateSet(we.id, sIndex, 'is_completed', false);
            return;
        }

        // Si es el set que estaba corriendo, lo completamos y guardamos tiempo
        if (runningSetIndex === sIndex) {
            onUpdateSet(we.id, sIndex, 'is_completed', true, set.rest_seconds);
            onUpdateSet(we.id, sIndex, 'duration_seconds', setSeconds);
            setRunningSetIndex(null);
            setSetSeconds(0);
        } else {
            // Si el usuario simplemente toca el check sin haber iniciado el cronómetro
            onUpdateSet(we.id, sIndex, 'is_completed', true, set.rest_seconds);
        }
    };

    const startSetTimer = (sIndex: number) => {
        if (runningSetIndex === sIndex) {
            setRunningSetIndex(null);
            setSetSeconds(0);
        } else {
            setRunningSetIndex(sIndex);
            setSetSeconds(0);
        }
    };

    return (
        <View className={`mb-8 rounded-[40] overflow-hidden border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white shadow-xl border-slate-100'} ${isSupersetChild ? 'mt-[-32] border-t-0 rounded-t-none border-l-4 border-l-blue-600' : ''} ${isCollapsed ? 'opacity-50 grayscale' : ''}`}>
            
            {!isCollapsed && (
                /* Visualización de Técnica (GIF/Imagen) */
                <View className="h-44 w-full bg-zinc-950 relative overflow-hidden">
                    {we.exercise?.animation_url ? (
                        <Image 
                            source={{ uri: we.exercise.animation_url }} 
                            className="w-full h-full opacity-60"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full items-center justify-center">
                            <Dumbbell size={40} color="#3f3f46" strokeWidth={1} />
                        </View>
                    )}
                    {/* Gradiente Inferior para legibilidad */}
                    <View className="absolute bottom-0 left-0 right-0 h-20 bg-zinc-950/80 shadow-2xl" />
                    {/* Overlay de Superserie */}
                    {isSupersetChild && (
                        <View className="absolute top-4 left-4 bg-blue-600 px-3 py-1 rounded-full flex-row items-center">
                            <Link size={10} color="#fff" strokeWidth={3} />
                            <Text className="text-[9px] font-black text-white ml-1 uppercase">Vínculo Activo</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Cabecera del Ejercicio */}
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setIsCollapsed(!isCollapsed)}
                className={`p-6 ${isCollapsed ? 'py-4' : ''}`}
            >
                <View className="flex-row items-center justify-between mb-4">
                    <TouchableOpacity 
                        className="flex-1 mr-4"
                        onPress={(e) => {
                            e.stopPropagation();
                            setShowDetails(true);
                        }}
                    >
                        {blockIndex && (
                            <Text className={`font-black uppercase text-[9px] tracking-[0.2em] mb-1 ${isCollapsed ? 'text-zinc-500' : 'text-blue-500'}`}>Bloque {blockIndex}/{totalBlocks}</Text>
                        )}
                        <Text className={`font-black text-xl ${isDark ? 'text-white' : 'text-slate-900'} leading-tight uppercase tracking-tighter`}>{we.exercise?.name}</Text>
                        <Text className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-md self-start mt-2">{we.exercise?.target_muscle_group}</Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center gap-x-2">
                        {index > 0 && (
                            <TouchableOpacity onPress={() => onToggleSuperset(index)} className={`w-10 h-10 rounded-full items-center justify-center ${isSupersetChild ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                                <Link size={16} color={isSupersetChild ? '#fff' : '#52525b'} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => onDuplicateBlock(we.id)} className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800">
                            <Copy size={16} color="#a1a1aa" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onRemoveExercise(we.id)} className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800">
                            <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {isCollapsed && (
                    <View className="flex-row items-center justify-between mt-2">
                        <Text className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Entrenamiento Finalizado</Text>
                        <Text className={`text-[10px] font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Toca para editar</Text>
                    </View>
                )}
            </TouchableOpacity>

            {!isCollapsed && (
                <View className="px-6 pb-6 mt-[-10]">
                {/* Panel de Progresión (Triple KPI Premium) */}
                <View className="flex-row gap-x-2 mb-6">
                    {/* Última Vez */}
                    <View className={`flex-1 ${isDark ? 'bg-zinc-950/50 border-zinc-800/50' : 'bg-slate-50 border-slate-100'} rounded-2xl p-3 border`}>
                        <View className="flex-row items-center mb-1">
                            <History size={10} color={isDark ? "#a1a1aa" : "#64748b"} />
                            <Text className={`text-[7px] font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Última Vez</Text>
                        </View>
                        <Text className={`text-[10px] font-black ${isDark ? 'text-zinc-300' : 'text-slate-700'}`} numberOfLines={1}>
                            {lastSets.length > 0 ? lastSets.map(s => `${s.weight}x${s.reps}`).join('/') : 'Primer entreno'}
                        </Text>
                    </View>

                    {/* Mejor Peso */}
                    <View className="flex-1 bg-emerald-500/5 rounded-2xl p-3 border border-emerald-500/20">
                        <View className="flex-row items-center mb-1">
                            <Dumbbell size={10} color="#10b981" />
                            <Text className="text-[7px] font-bold text-emerald-500/70 uppercase tracking-widest ml-1">Mejor Peso</Text>
                        </View>
                        <Text className="text-xs font-black text-emerald-400">{maxWeight || 0} kg</Text>
                    </View>
                    
                    {/* Est. 1RM */}
                    <View className="flex-1 bg-blue-600/10 rounded-2xl p-3 border border-blue-500/20">
                        <View className="flex-row items-center mb-1">
                            <Trophy size={10} color="#3b82f6" fill="#3b82f6" />
                            <Text className="text-[7px] font-bold text-blue-500 uppercase tracking-widest ml-1">Est. 1RM</Text>
                        </View>
                        <Text className="text-xs font-black text-blue-400">{oneRM || 0} kg</Text>
                    </View>
                </View>

                {/* Tabla de Series - Rediseño Tech */}
                <View className="gap-y-3">
                    {we.sets.map((set, setIndex) => {
                        const isActive = runningSetIndex === setIndex;
                        return (
                            <View key={setIndex} className={`flex-row items-center p-3 rounded-2xl border ${set.is_completed ? 'bg-emerald-500/10 border-emerald-500/30' : (isActive ? 'bg-blue-500/10 border-blue-500/50' : (isDark ? 'bg-zinc-800/40 border-zinc-800' : 'bg-slate-50 border-slate-200'))}`}>
                                <View className="w-8 items-center">
                                    <Text className={`font-black ${set.is_completed ? 'text-emerald-500' : (isDark ? 'text-zinc-600' : 'text-slate-400')}`}>{setIndex + 1}</Text>
                                </View>

                                {/* Play Button / Timer */}
                                <TouchableOpacity 
                                    onPress={() => startSetTimer(setIndex)}
                                    className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${isActive ? 'bg-blue-500 shadow-lg shadow-blue-500' : 'bg-zinc-800'}`}
                                >
                                    {isActive ? (
                                        <Text className="text-white font-black text-[10px]">{formatTime(setSeconds)}</Text>
                                    ) : set.is_completed && set.duration_seconds ? (
                                        <Text className="text-emerald-500 font-black text-[8px]">{formatTime(set.duration_seconds)}</Text>
                                    ) : (
                                        <Play size={14} color={set.is_completed ? '#10b981' : (isDark ? '#a1a1aa' : '#94a3b8')} fill={set.is_completed ? '#10b981' : 'transparent'} />
                                    )}
                                </TouchableOpacity>

                                <View className="flex-1 flex-row gap-x-2">
                                    <View className={`flex-1 h-12 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} rounded-xl justify-center items-center border`}>
                                        <TextInput
                                            className={`text-center font-black ${isDark ? 'text-white' : 'text-slate-900'} text-base`}
                                            keyboardType="numeric"
                                            value={set.weight ? set.weight.toString() : ''}
                                            placeholder="0"
                                            placeholderTextColor={isDark ? "#3f3f46" : "#cbd5e1"}
                                            onChangeText={(val) => onUpdateSet(we.id, setIndex, 'weight', parseFloat(val) || 0)}
                                        />
                                        <Text className={`absolute bottom-1 right-2 text-[8px] font-bold ${isDark ? 'text-zinc-600' : 'text-slate-400'} uppercase`}>KG</Text>
                                    </View>
                                    <View className={`flex-1 h-12 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} rounded-xl justify-center items-center border`}>
                                        <TextInput
                                            className={`text-center font-black ${isDark ? 'text-white' : 'text-slate-900'} text-base`}
                                            keyboardType="numeric"
                                            value={set.reps ? set.reps.toString() : ''}
                                            placeholder="0"
                                            placeholderTextColor={isDark ? "#3f3f46" : "#cbd5e1"}
                                            onChangeText={(val) => onUpdateSet(we.id, setIndex, 'reps', parseInt(val, 10) || 0)}
                                        />
                                        <Text className={`absolute bottom-1 right-2 text-[8px] font-bold ${isDark ? 'text-zinc-600' : 'text-slate-400'} uppercase`}>REPS</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={() => {
                                        onDismissTimer();
                                        handleToggleSet(setIndex);
                                    }}
                                    className={`w-12 h-12 rounded-2xl ml-3 items-center justify-center border-2 ${set.is_completed ? 'bg-emerald-500 border-emerald-500' : (isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200')}`}
                                >
                                    <Text className={`font-black text-xl ${set.is_completed ? 'text-white' : (isDark ? 'text-zinc-800' : 'text-slate-100')}`}>{set.is_completed ? '✓' : '✓'}</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>

                {/* Timer de Descanso Local */}
                {activeRestTimer?.exerciseId === we.id && activeRestTimer?.remainingSeconds > 0 && (
                    <View className="bg-blue-600 rounded-3xl mt-4 px-5 py-4 flex-row items-center justify-between shadow-2xl shadow-blue-500/50">
                        <View className="flex-row items-center">
                            <View className="bg-white/20 p-2 rounded-full mr-3">
                                <Timer size={16} color="#ffffff" />
                            </View>
                            <View>
                                <Text className="text-blue-100 font-black text-[9px] uppercase tracking-widest">Descanso activo</Text>
                                <Text className="text-white font-black text-2xl mt-[-2]">{formatTime(activeRestTimer.remainingSeconds)}</Text>
                            </View>
                        </View>
                        <TouchableOpacity 
                            onPress={onDismissTimer}
                            activeOpacity={0.7}
                            className="bg-white/20 px-4 py-2 rounded-2xl flex-row items-center"
                        >
                            <Square size={12} color="#ffffff" fill="#ffffff" />
                            <Text className="text-white font-black text-[10px] ml-2 uppercase tracking-widest">STOP</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    onPress={() => onAddSet(we.id)}
                    className="mt-6 py-4 rounded-3xl border-2 border-zinc-800 border-dashed items-center justify-center"
                >
                    <Plus size={20} color="#52525b" />
                    <Text className="font-black text-[10px] ml-1 text-zinc-500 uppercase tracking-widest mt-1">Siguiente Round</Text>
                </TouchableOpacity>
            </View>
            )}

            {/* Modal de Detalles de Ejercicio con Gráfica */}
            <ExerciseDetailsModal 
                isDark={isDark}
                isVisible={showDetails}
                onClose={() => setShowDetails(false)}
                exercise={we.exercise!}
                userId={user.id}
            />
        </View>
    );
});

const SupersetBlock = React.memo(({
    exercises,
    isDark,
    user,
    onUpdateSet,
    restRemainingSeconds,
    activeRestExerciseId,
    onDismissTimer,
    formatTime,
    blockIndex,
    totalBlocks
}: {
    exercises: WorkoutExercise[],
    isDark: boolean,
    user: any,
    onUpdateSet: (id: string, sIndex: number, field: keyof WorkoutSet, val: any, restSeconds?: number) => void,
    restRemainingSeconds: number,
    activeRestExerciseId: string | null,
    onDismissTimer: () => void,
    formatTime: (seconds: number) => string,
    blockIndex: number,
    totalBlocks: number
}) => {
    const totalRounds = exercises[0]?.sets.length || 0;
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Auto-colapsar si todas las rondas están completadas
    useEffect(() => {
        const allDone = exercises.every(we => 
            we.sets.length > 0 && we.sets.every(s => s.is_completed)
        );
        const isThisBlockTimer = exercises.some(we => we.id === activeRestExerciseId);
        const timerRunning = isThisBlockTimer && restRemainingSeconds > 0;

        if (allDone && !timerRunning) {
            setIsCollapsed(true);
        } else if (!allDone) {
            setIsCollapsed(false);
        }
    }, [exercises.map(we => we.sets.map(s => s.is_completed).join(',')).join('|'), restRemainingSeconds]);
    
    return (
        <View className={`mb-10 rounded-[40px] overflow-hidden border ${isCollapsed ? 'border-zinc-800 bg-zinc-900/30 opacity-60' : 'border-blue-600/30 bg-zinc-950 shadow-2xl shadow-blue-900/10'}`}>
            {/* Cabecera del Bloque */}
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setIsCollapsed(!isCollapsed)}
                className={`${isCollapsed ? 'bg-zinc-800' : 'bg-blue-600'} px-6 py-4 flex-row items-center justify-between`}
            >
                <View className="flex-row items-center flex-1">
                    <Layers size={18} color={isCollapsed ? '#52525b' : '#fff'} strokeWidth={2.5} />
                    <View className="ml-3 flex-1">
                        <Text className={`font-black uppercase text-[10px] tracking-widest ${isCollapsed ? 'text-zinc-500' : 'text-blue-200'}`}>Bloque {blockIndex}/{totalBlocks}</Text>
                        <Text className="font-black text-white text-xs uppercase tracking-tight" numberOfLines={1}>
                            {exercises.map(we => we.exercise?.name).join(' + ')}
                        </Text>
                    </View>
                </View>
                <View className="bg-white/20 px-3 py-1 rounded-full ml-2">
                    <Text className="text-white font-black text-[10px] uppercase">{isCollapsed ? 'Hecho' : `${totalRounds} Rds`}</Text>
                </View>
            </TouchableOpacity>

            {!isCollapsed && (
                <View className="p-2">
                    {Array.from({ length: totalRounds }).map((_, rIdx) => (
                        <View key={rIdx} className="mb-4 bg-zinc-900/50 rounded-[32px] p-4 border border-zinc-800/50">
                            <View className="flex-row items-center mb-4 px-2">
                                <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
                                    <Text className="text-white font-black text-sm">{rIdx + 1}</Text>
                                </View>
                                <Text className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">Ronda {rIdx + 1}</Text>
                            </View>

                            <View className="gap-y-3">
                                {exercises.map((we) => {
                                    const set = we.sets[rIdx];
                                    const isCompleted = set?.is_completed;
                                    const isTimerActive = activeRestExerciseId === we.id && restRemainingSeconds > 0;

                                    return (
                                        <View key={we.id} className={`p-4 rounded-3xl border ${isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-800/30 border-zinc-800'}`}>
                                            <View className="flex-row items-center justify-between mb-3">
                                                <View className="flex-1 mr-2">
                                                    <Text className={`font-black text-[11px] uppercase tracking-tight ${isCompleted ? 'text-emerald-500' : 'text-white'}`} numberOfLines={1}>
                                                        {we.exercise?.name}
                                                    </Text>
                                                </View>
                                                
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        onDismissTimer(); // Apagar timer si se interactúa con una nueva ronda
                                                        const isLastExerciseInRound = exercises.indexOf(we) === exercises.length - 1;
                                                        onUpdateSet(we.id, rIdx, 'is_completed', !isCompleted, isLastExerciseInRound ? set.rest_seconds : undefined);
                                                    }}
                                                    className={`w-10 h-10 rounded-2xl items-center justify-center border-2 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'bg-zinc-900 border-zinc-700'}`}
                                                >
                                                    <Text className="font-black text-lg text-white">{isCompleted ? '✓' : ''}</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <View className="flex-row gap-x-2">
                                                <View className="flex-1 h-12 bg-zinc-900/50 rounded-xl justify-center items-center border border-zinc-800/50">
                                                    <TextInput
                                                        className="text-center font-black text-white text-sm"
                                                        keyboardType="numeric"
                                                        value={set.weight ? set.weight.toString() : ''}
                                                        placeholder="0"
                                                        placeholderTextColor="#3f3f46"
                                                        onChangeText={(val) => onUpdateSet(we.id, rIdx, 'weight', parseFloat(val) || 0)}
                                                    />
                                                    <Text className="absolute bottom-1 right-2 text-[7px] font-bold text-zinc-600">KG</Text>
                                                </View>
                                                <View className="flex-1 h-12 bg-zinc-900/50 rounded-xl justify-center items-center border border-zinc-800/50">
                                                    <TextInput
                                                        className="text-center font-black text-white text-sm"
                                                        keyboardType="numeric"
                                                        value={set.reps ? set.reps.toString() : ''}
                                                        placeholder="0"
                                                        placeholderTextColor="#3f3f46"
                                                        onChangeText={(val) => onUpdateSet(we.id, rIdx, 'reps', parseInt(val, 10) || 0)}
                                                    />
                                                    <Text className="absolute bottom-1 right-2 text-[7px] font-bold text-zinc-600">REPS</Text>
                                                </View>
                                            </View>

                                            {isTimerActive && (
                                                <View className="bg-blue-600 rounded-2xl mt-3 px-4 py-3 flex-row items-center justify-between shadow-lg shadow-blue-500/30">
                                                    <View className="flex-row items-center">
                                                        <Timer size={14} color="#ffffff" />
                                                        <Text className="text-white font-black text-[10px] ml-2 uppercase tracking-widest">{formatTime(restRemainingSeconds)}</Text>
                                                    </View>
                                                    <TouchableOpacity 
                                                        onPress={onDismissTimer}
                                                        className="bg-white/20 px-3 py-1.5 rounded-xl flex-row items-center"
                                                    >
                                                        <Square size={10} color="#ffffff" fill="#ffffff" />
                                                        <Text className="text-white font-black text-[8px] ml-1.5 uppercase tracking-widest">STOP</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
});


export default function ActiveWorkoutScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [exercisesDb, setExercisesDb] = useState<Exercise[]>([]);
    const { routine } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Temporizadores
    const [workoutStarted, setWorkoutStarted] = useState(false);
    const [elapsedWorkoutSeconds, setElapsedWorkoutSeconds] = useState(0);

    const [restTimerActive, setRestTimerActive] = useState(false);
    const [restRemainingSeconds, setRestRemainingSeconds] = useState(0);
    const [activeRestExerciseId, setActiveRestExerciseId] = useState<string | null>(null);

    // Estado del Modal de Configuración de Bloque
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockType, setBlockType] = useState<'normal' | 'superset'>('normal');
    const [supersetCount, setSupersetCount] = useState(2);

    // Estado del Modal de Catálogo
    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingExercisesCount, setPendingExercisesCount] = useState(0);
    const [tempSelectedExercises, setTempSelectedExercises] = useState<Exercise[]>([]);

    const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
    
    // Estados para Home Workouts
    const [isHomeWorkoutPlan, setIsHomeWorkoutPlan] = useState(false);
    const [availableExtraBlocks, setAvailableExtraBlocks] = useState<WorkoutExercise[]>([]);
    const [showFinisherModal, setShowFinisherModal] = useState(false);

    // Cálculo de Volumen Total en vivo
    const totalVolume = workoutExercises.reduce((acc, we) => {
        const exerciseVol = we.sets.reduce((sAcc, s) => {
            if (s.is_completed) {
                return sAcc + ((s.weight || 0) * (s.reps || 0));
            }
            return sAcc;
        }, 0);
        return acc + exerciseVol;
    }, 0);

    useEffect(() => {
        workoutService.getExercises().then(data => {
            setExercisesDb(data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (routine && !loading && exercisesDb.length > 0) {
            const template = HOME_WORKOUTS.find(h => h.id === routine);
            if (template && workoutExercises.length === 0) {
                const mandatory = template.exercises.filter(we => !(we as any).is_extra_block);
                const extras = template.exercises.filter(we => (we as any).is_extra_block);
                setWorkoutExercises(mandatory);
                setAvailableExtraBlocks(extras);
                setIsHomeWorkoutPlan(true);
                setWorkoutStarted(true);
            }
        }
    }, [routine, loading, exercisesDb]);

    // Effect Temporizador Global
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (workoutStarted) {
            timer = setInterval(() => {
                setElapsedWorkoutSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [workoutStarted]);

    // Effect Temporizador de Descanso
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (restTimerActive && restRemainingSeconds > 0) {
            timer = setInterval(() => {
                setRestRemainingSeconds(prev => prev - 1);
            }, 1000);
        } else if (restRemainingSeconds === 0 && restTimerActive) {
            playBoxingSound('final');
            setRestTimerActive(false);
            setActiveRestExerciseId(null);
        }
        return () => clearInterval(timer);
    }, [restTimerActive, restRemainingSeconds]);

    // Alerta de 20s
    useEffect(() => {
        if (restTimerActive && restRemainingSeconds === 20) {
            playBoxingSound('warning');
        }
    }, [restRemainingSeconds, restTimerActive]);

    const playBoxingSound = async (type: 'warning' | 'final') => {
        try {
            // Asegurar que el audio esté configurado para sonar
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                playThroughEarpieceAndroid: false,
            });

            // Campana de boxeo clásica
            const soundUrl = 'https://www.soundjay.com/misc/sounds/boxing-bell-1.mp3';
            
            const { sound } = await Audio.Sound.createAsync(
                { uri: soundUrl },
                { shouldPlay: true, volume: 1.0 }
            );

            if (type === 'final') {
                // Para el final, 2 toques (dos dings)
                setTimeout(async () => {
                    try {
                        await sound.replayAsync();
                    } catch (e) {}
                }, 600);
            }

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    if (type === 'warning') {
                        sound.unloadAsync();
                    } else {
                        // Esperar un poco más en final para el segundo ding
                        setTimeout(() => sound.unloadAsync(), 2000);
                    }
                }
            });
        } catch (e) {
            console.log('Error playing sound:', e);
        }
    };

    const filteredExercises = exercisesDb.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.target_muscle_group.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const startAddFlow = () => {
        setBlockType('normal');
        setSupersetCount(2);
        setShowBlockModal(true);
    };

    const confirmBlockType = () => {
        setPendingExercisesCount(blockType === 'normal' ? 1 : supersetCount);
        setTempSelectedExercises([]);
        setShowBlockModal(false);
        setShowCatalogModal(true);
    };

    const handleSelectExercise = (exercise: Exercise) => {
        setTempSelectedExercises(prev => {
            const exists = prev.find(ex => ex.id === exercise.id);
            if (exists) {
                return prev.filter(ex => ex.id !== exercise.id);
            }
            // Si es normal, solo permitimos 1. Si es superset, hasta el count.
            if (blockType === 'normal') return [exercise];
            if (prev.length < pendingExercisesCount) return [...prev, exercise];
            return prev;
        });
    };

    const confirmSelection = () => {
        if (tempSelectedExercises.length === 0) return;
        
        const firstExId = Math.random().toString(36).substring(7);
        const newExercises: WorkoutExercise[] = tempSelectedExercises.map((ex, idx) => {
            const isFirst = idx === 0;
            const currentId = isFirst ? firstExId : Math.random().toString(36).substring(7);
            return {
                id: currentId,
                exercise_id: ex.id,
                exercise: ex,
                supersets_with: idFromBlock(idx, firstExId),
                sets: [{ reps: 0, weight: 0, rest_seconds: 90, is_completed: false }]
            };
        });

        function idFromBlock(idx: number, firstId: string) {
            if (blockType === 'normal') return null;
            return idx === 0 ? null : firstId;
        }

        setWorkoutExercises([...workoutExercises, ...newExercises]);
        setShowCatalogModal(false);
        setTempSelectedExercises([]);
        setSearchQuery('');
        if (!workoutStarted) setWorkoutStarted(true);
    };

    const duplicateBlock = useCallback((baseLocalId: string) => {
        setWorkoutExercises(prev => {
            const rootWe = prev.find(we => we.id === baseLocalId);
            if (!rootWe) return prev;

            const rootId = rootWe.supersets_with ? rootWe.supersets_with : rootWe.id;
            
            // Encontrar todos los ejercicios del bloque y el índice del último
            let lastIndexInBlock = -1;
            const blockExercises: WorkoutExercise[] = [];
            
            prev.forEach((we, idx) => {
                if (we.id === rootId || we.supersets_with === rootId) {
                    blockExercises.push(we);
                    lastIndexInBlock = idx;
                }
            });

            if (blockExercises.length === 0) return prev;

            const newRootId = Math.random().toString(36).substring(7);
            const duplicatedExercises: WorkoutExercise[] = blockExercises.map((we) => {
                const isRoot = we.id === rootId;
                return {
                    ...we,
                    id: isRoot ? newRootId : Math.random().toString(36).substring(7),
                    supersets_with: isRoot ? null : newRootId,
                    sets: we.sets.map(s => ({ ...s, is_completed: false }))
                };
            });

            const newWorkoutExercises = [...prev];
            newWorkoutExercises.splice(lastIndexInBlock + 1, 0, ...duplicatedExercises);
            return newWorkoutExercises;
        });
    }, []);

    const addSet = useCallback((workoutExerciseId: string) => {
        setWorkoutExercises(prev => prev.map(we => {
            if (we.id === workoutExerciseId) {
                const lastSet = we.sets[we.sets.length - 1];
                return {
                    ...we,
                    sets: [...we.sets, {
                        reps: lastSet?.reps || 0,
                        weight: lastSet?.weight || 0,
                        rest_seconds: lastSet?.rest_seconds || 90,
                        is_completed: false
                    }]
                };
            }
            return we;
        }));
    }, []);

    const toggleSuperset = useCallback((currentIndex: number) => {
        if (currentIndex === 0) return;
        setWorkoutExercises(prev => {
            const updated = [...prev];
            const prevExercise = updated[currentIndex - 1];
            if (updated[currentIndex].supersets_with === prevExercise.id) {
                updated[currentIndex].supersets_with = null;
            } else {
                updated[currentIndex].supersets_with = prevExercise.id;
            }
            return updated;
        });
    }, []);

    const updateSet = useCallback((exerciseId: string, setIndex: number, field: keyof WorkoutSet, value: number | boolean, restSecondsTrigger?: number) => {
        setWorkoutExercises(prev => {
            const updated = prev.map(we => {
                if (we.id === exerciseId) {
                    const newSets = [...we.sets];
                    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
                    return { ...we, sets: newSets };
                }
                return we;
            });

            // Lógica de Interceptación de Home Workout (Final de Bloque 4)
            if (isHomeWorkoutPlan && field === 'is_completed' && value === true) {
                // Verificar si todos los ejercicios obligatorios (no extra_block) están completados
                const mandatoryExercises = updated.filter(we => !exIsExtraBlock(we));
                const allMandatoryCompleted = mandatoryExercises.every(we => 
                    we.sets.every(s => s.is_completed)
                );

                if (allMandatoryCompleted && availableExtraBlocks.length > 0) {
                    setShowFinisherModal(true);
                }
            }

            return updated;
        });

        function exIsExtraBlock(we: WorkoutExercise) {
            // @ts-ignore
            return we.is_extra_block === true;
        }

        // Si el usuario acaba de completar la serie, iniciar timer de descanso
        if (field === 'is_completed' && value === true && restSecondsTrigger) {
            setRestRemainingSeconds(restSecondsTrigger);
            setActiveRestExerciseId(exerciseId);
            setRestTimerActive(true);
        }
    }, [isHomeWorkoutPlan, availableExtraBlocks]);

    const removeExercise = useCallback((exerciseId: string) => {
        setWorkoutExercises(prev => {
            return prev.filter(we => we.id !== exerciseId).map(we =>
                we.supersets_with === exerciseId ? { ...we, supersets_with: null } : we
            );
        });
    }, []);

    const addExtraBlock = () => {
        if (availableExtraBlocks.length > 0) {
            setWorkoutExercises(prev => [...prev, ...availableExtraBlocks]);
            setAvailableExtraBlocks([]);
            setShowFinisherModal(false);
        }
    };

    const finishWorkout = async () => {
        if (!user) return alert("Debes iniciar sesión");
        if (workoutExercises.length === 0) return alert("No hay ejercicios en este entreno");

        Alert.alert(
            "FINALIZAR ENTRENAMIENTO",
            "¿Has terminado ya por hoy? Se guardará todo tu progreso de esta sesión.",
            [
                { text: "No, seguir", style: "cancel" },
                { 
                    text: "SÍ, FINALIZAR", 
                    onPress: async () => {
                        await executeFinishWorkout();
                    }
                }
            ]
        );
    };
    const executeFinishWorkout = async () => {
        if (!user) return;
        setWorkoutStarted(false);
        setSaving(true);
        try {
            const workoutData: Omit<Workout, 'id'> = {
                user_id: user.id,
                name: 'Entreno Libre',
                date: new Date().toISOString(),
                is_completed: true,
                exercises: workoutExercises,
                duration_seconds: elapsedWorkoutSeconds
            };

            await workoutService.saveWorkout(workoutData).then(result => {
                // Navegar al resumen épico pasando los datos clave
                router.push({
                    pathname: '/workouts/summary',
                    params: {
                        workoutId: result.workoutId,
                        duration: elapsedWorkoutSeconds,
                        volume: totalVolume,
                        exerciseCount: workoutExercises.length,
                        muscles: JSON.stringify(workoutExercises.map(we => we.exercise?.target_muscle_group))
                    }
                });
            });
        } catch (e: any) {
            alert("Error al guardar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>

            {/* Cabecera Principal y Timer de Sesión */}
            <View className={`px-4 pb-4 pt-1 border-b ${isDark ? 'border-zinc-900' : 'border-slate-200'}`}>
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <ChevronLeft size={28} color={isDark ? "#e4e4e7" : "#0f172a"} />
                    </TouchableOpacity>

                    <View className="items-center">
                        <Text className={`font-bold text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'} uppercase tracking-widest mb-1`}>Volumen Total: {totalVolume} kg</Text>
                        <Text className={`font-black text-2xl ${workoutStarted ? 'text-blue-500' : 'text-zinc-500'} tracking-tighter`}>
                            {formatTime(elapsedWorkoutSeconds)}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={finishWorkout}
                        disabled={saving}
                        className={`px-6 py-3 rounded-full bg-blue-600 shadow-xl shadow-blue-500/20 ${saving ? 'opacity-50' : ''}`}
                    >
                        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-black text-[11px] uppercase tracking-widest text-white">Finalizar Entrenamiento</Text>}
                    </TouchableOpacity>
                </View>

                {/* Controles de Inicio Rápido (Solo si hay ejercicios) */}
                {workoutExercises.length > 0 && (
                    <View className="flex-row items-center justify-center mt-3 gap-x-4">
                        {!workoutStarted ? (
                            <TouchableOpacity onPress={() => setWorkoutStarted(true)} className={`${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'} px-6 py-2 rounded-full flex-row items-center border`}>
                                <Play size={16} color="#10b981" />
                                <Text className="text-emerald-500 font-bold ml-2 text-xs">INICIAR SESIÓN</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => setWorkoutStarted(false)} className={`${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'} px-6 py-2 rounded-full flex-row items-center border`}>
                                <Square size={14} color="#f59e0b" fill="#f59e0b" />
                                <Text className="text-amber-500 font-bold ml-2 text-xs">PAUSAR</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
                {workoutExercises.length === 0 ? (
                    <View className="py-20 items-center">
                        <View className="relative mb-10">
                            <View className="absolute -inset-8 bg-blue-600/30 blur-3xl rounded-full" />
                            <View className="w-40 h-40 rounded-full items-center justify-center bg-blue-600 shadow-2xl shadow-blue-500/50">
                                <Zap size={80} color="#ffffff" fill="#ffffff" strokeWidth={1} />
                            </View>
                        </View>
                        <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black text-4xl uppercase tracking-tighter text-center mb-4 px-4`}>
                            ¡VAMOS A POR ELLO!
                        </Text>
                        <Text className={`${isDark ? 'text-zinc-400' : 'text-slate-600'} font-bold text-[10px] text-center px-14 leading-relaxed uppercase tracking-[0.3em] mb-12 opacity-90`}>
                            Prepara tus músculos y comienza la sesión
                        </Text>
                        
                        {!workoutStarted && (
                            <TouchableOpacity 
                                onPress={startAddFlow}
                                className="bg-blue-600 px-10 py-5 rounded-[40px] flex-row items-center shadow-2xl shadow-blue-500/50"
                            >
                                <Plus size={24} color="#fff" strokeWidth={4} />
                                <Text className="text-white font-black ml-4 text-xl uppercase tracking-[0.1em]">Elegir Ejercicios</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    (() => {
                        // Agrupar ejercicios en bloques (Normales o Superseres)
                        const blocks: WorkoutExercise[][] = [];
                        let currentBlock: WorkoutExercise[] = [];
                        
                        workoutExercises.forEach((we) => {
                            if (we.supersets_with === null) {
                                if (currentBlock.length > 0) blocks.push(currentBlock);
                                currentBlock = [we];
                            } else {
                                currentBlock.push(we);
                            }
                        });
                        if (currentBlock.length > 0) blocks.push(currentBlock);

                        return blocks.map((block, bIdx) => {
                            const isSuperset = block.length > 1;
                            
                            if (isSuperset) {
                                return (
                                    <SupersetBlock
                                        key={block[0].id}
                                        exercises={block}
                                        isDark={isDark}
                                        user={user}
                                        onUpdateSet={updateSet}
                                        restRemainingSeconds={restRemainingSeconds}
                                        activeRestExerciseId={activeRestExerciseId}
                                        onDismissTimer={() => setRestTimerActive(false)}
                                        formatTime={formatTime}
                                        blockIndex={bIdx + 1}
                                        totalBlocks={blocks.length}
                                    />
                                );
                            }

                            return (
                                <ExerciseRow
                                    key={block[0].id}
                                    we={block[0]}
                                    index={workoutExercises.indexOf(block[0])}
                                    isDark={isDark}
                                    user={user}
                                    activeRestTimer={restTimerActive && activeRestExerciseId === block[0].id ? { exerciseId: activeRestExerciseId, remainingSeconds: restRemainingSeconds } : null}
                                    onToggleSuperset={toggleSuperset}
                                    onDuplicateBlock={duplicateBlock}
                                    onRemoveExercise={removeExercise}
                                    onUpdateSet={updateSet}
                                    onAddSet={addSet}
                                    onDismissTimer={() => setRestTimerActive(false)}
                                    blockIndex={bIdx + 1}
                                    totalBlocks={blocks.length}
                                />
                            );
                        });
                    })()
                )}

                {workoutExercises.length === 0 && (
                    <View className="px-6 mt-[-16] gap-y-4">
                        <Text className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] mb-2 px-1">Entrenamientos en Casa</Text>
                        
                        {HOME_WORKOUTS.map((routine) => (
                            <TouchableOpacity
                                key={routine.id}
                                onPress={() => {
                                    const mandatory = routine.exercises.filter(we => !(we as any).is_extra_block);
                                    const extras = routine.exercises.filter(we => (we as any).is_extra_block);
                                    setWorkoutExercises(mandatory);
                                    setAvailableExtraBlocks(extras);
                                    setIsHomeWorkoutPlan(true);
                                    setWorkoutStarted(true);
                                }}
                                className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'} p-6 rounded-[32px] flex-row items-center justify-between border`}
                            >
                                <View className="flex-row items-center flex-1">
                                    <View className={`${isDark ? 'bg-blue-600/10' : 'bg-blue-50'} p-3 rounded-2xl mr-4 h-12 w-12 items-center justify-center`}>
                                        <CalendarClock size={24} color={isDark ? '#3b82f6' : '#2563eb'} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-black uppercase text-sm tracking-widest mb-1`} numberOfLines={1}>{routine.name}</Text>
                                        <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-bold text-[10px] leading-tight`} numberOfLines={2}>{routine.description}</Text>
                                    </View>
                                </View>
                                <ChevronLeft size={20} color={isDark ? '#3f3f46' : '#94a3b8'} style={{ transform: [{ rotate: '180deg' }] }} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                {/* Botón Añadir Ejercicio integrado al final de la lista (solo si hay ejercicios) */}
                {workoutExercises.length > 0 && (
                    <View className="px-4 mt-6">
                        <TouchableOpacity
                            onPress={startAddFlow}
                            activeOpacity={0.8}
                            className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'} h-20 rounded-[32px] flex-row items-center justify-center border border-dashed`}
                        >
                            <Plus size={20} color={isDark ? '#3b82f6' : '#2563eb'} strokeWidth={3} className="mr-3" />
                            <Text className={`${isDark ? 'text-zinc-400' : 'text-slate-500'} font-black uppercase tracking-widest text-xs`}>Añadir otro ejercicio</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View className="h-48" />
            </ScrollView>

            {/* Modal de Finisher (Premium Blur) */}
            <Modal visible={showFinisherModal} transparent animationType="fade">
                <View className="flex-1 justify-center items-center px-6">
                    <BlurView intensity={80} tint="dark" className="absolute inset-0" />
                    
                    <View className="w-full bg-zinc-900/90 border border-zinc-800 p-8 rounded-[40px] items-center">
                        <View className="bg-blue-600/10 p-4 rounded-full mb-6">
                            <Trophy size={40} color="#3b82f6" />
                        </View>
                        
                        <Text className="text-3xl font-black text-white text-center mb-2 uppercase tracking-tighter">
                            ¡BUEN TRABAJO!
                        </Text>
                        
                        <Text className="text-zinc-400 text-center mb-10 font-bold leading-relaxed px-4">
                            Has completado la rutina obligatoria. ¿Tienes energía para un finisher?
                        </Text>

                        <View className="w-full gap-y-4">
                            <TouchableOpacity 
                                onPress={addExtraBlock}
                                className="w-full bg-blue-600 py-5 rounded-3xl items-center shadow-xl shadow-blue-500/30"
                            >
                                <Text className="text-white font-black uppercase tracking-widest text-sm">🔥 Añadir Bloque Extra</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => {
                                    setShowFinisherModal(false);
                                    finishWorkout();
                                }}
                                className="w-full py-5 rounded-3xl items-center border border-zinc-700"
                            >
                                <Text className="text-zinc-400 font-bold uppercase tracking-widest text-xs">🏁 Finalizar sesión</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>


            {/* Modal Selector de Tipo de Bloque */}
            <Modal visible={showBlockModal} animationType="fade" transparent={true} onRequestClose={() => setShowBlockModal(false)}>
                <View className="flex-1 justify-center items-center bg-black/80 px-4">
                    <View className={`w-full max-w-sm rounded-[40] p-8 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'} border`}>
                        <Text className={`text-2xl font-black text-center mb-8 ${isDark ? 'text-white' : 'text-slate-900'} uppercase tracking-tighter`}>
                            ¿Qué vas a entrenar?
                        </Text>
 
                        <View className="flex-row gap-x-4 mb-8">
                            <TouchableOpacity
                                onPress={() => setBlockType('normal')}
                                className={`flex-1 p-5 rounded-3xl items-center border-2 ${blockType === 'normal' ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-zinc-800 bg-zinc-800' : 'border-slate-100 bg-slate-50')}`}
                            >
                                <Dumbbell size={28} color={blockType === 'normal' ? '#3b82f6' : (isDark ? '#52525b' : '#94a3b8')} />
                                <Text className={`mt-3 font-bold uppercase text-xs ${blockType === 'normal' ? 'text-blue-500' : (isDark ? 'text-zinc-500' : 'text-slate-400')}`}>Normal</Text>
                            </TouchableOpacity>
 
                            <TouchableOpacity
                                onPress={() => setBlockType('superset')}
                                className={`flex-1 p-5 rounded-3xl items-center border-2 ${blockType === 'superset' ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-zinc-800 bg-zinc-800' : 'border-slate-100 bg-slate-50')}`}
                            >
                                <Layers size={28} color={blockType === 'superset' ? '#3b82f6' : (isDark ? '#52525b' : '#94a3b8')} />
                                <Text className={`mt-3 font-bold uppercase text-xs ${blockType === 'superset' ? 'text-blue-500' : (isDark ? 'text-zinc-500' : 'text-slate-400')}`}>Superserie</Text>
                            </TouchableOpacity>
                        </View>
 
                        {blockType === 'superset' && (
                            <View className="mb-8">
                                <Text className={`text-center font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'} mb-4 uppercase text-[10px] tracking-widest`}>
                                    Ejercicios por ronda
                                </Text>
                                <View className="flex-row items-center justify-center gap-x-8">
                                    <TouchableOpacity
                                        onPress={() => setSupersetCount(Math.max(2, supersetCount - 1))}
                                        className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}
                                    >
                                        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>-</Text>
                                    </TouchableOpacity>
 
                                    <Text className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'} w-12 text-center`}>{supersetCount}</Text>
 
                                    <TouchableOpacity
                                        onPress={() => setSupersetCount(Math.min(10, supersetCount + 1))}
                                        className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}
                                    >
                                        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
 
                        <View className="flex-row gap-x-3">
                            <TouchableOpacity
                                onPress={() => setShowBlockModal(false)}
                                className={`flex-1 py-4 items-center rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}
                            >
                                <Text className={`font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Paso atrás</Text>
                            </TouchableOpacity>
 
                            <TouchableOpacity
                                onPress={confirmBlockType}
                                className="flex-1 py-4 items-center rounded-2xl bg-blue-600"
                            >
                                <Text className="font-bold text-white">Continuar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Búsqueda de Ejercicios - REDISEÑO RADICAL */}
            <Modal visible={showCatalogModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCatalogModal(false)}>
                <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                    <View className={`flex-row items-center justify-between px-6 pt-6 pb-4 border-b ${isDark ? 'border-zinc-900' : 'border-slate-200'}`}>
                        <View className="flex-1">
                            <Text className={`font-black text-2xl ${isDark ? 'text-white' : 'text-slate-900'} uppercase tracking-tighter`}>BIBLIOTECA</Text>
                            <Text className="text-blue-500 font-bold text-xs uppercase tracking-widest">
                                {blockType === 'superset' ? `Selecciona ${tempSelectedExercises.length}/${pendingExercisesCount}` : 'Elige un ejercicio'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowCatalogModal(false)} className={`w-10 h-10 rounded-full ${isDark ? 'bg-zinc-900' : 'bg-slate-200'} items-center justify-center`}>
                            <X size={20} color={isDark ? "#ffffff" : "#0f172a"} />
                        </TouchableOpacity>
                    </View>
 
                    <View className="p-6 flex-1">
                        <View className={`flex-row items-center px-4 h-14 rounded-2xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} mb-6 border`}>
                            <Search size={20} color={isDark ? "#52525b" : "#94a3b8"} />
                            <TextInput
                                className={`flex-1 ml-3 font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-base`}
                                placeholder="¿Qué vamos a dar hoy?"
                                placeholderTextColor={isDark ? "#3f3f46" : "#cbd5e1"}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                            {loading ? <ActivityIndicator size="large" className="mt-10" color="#3b82f6" /> :
                                filteredExercises.length === 0 ? (
                                    <View className="items-center py-20">
                                        <Text className="font-bold text-zinc-500 text-lg">Sin resultados</Text>
                                    </View>
                                ) : (
                                    <View className="flex-row flex-wrap justify-between">
                                        {filteredExercises.map((ex) => {
                                            const isSelected = tempSelectedExercises.some(s => s.id === ex.id);
                                            return (
                                                <TouchableOpacity
                                                    key={ex.id}
                                                    onPress={() => handleSelectExercise(ex)}
                                                    activeOpacity={0.8}
                                                    style={{ width: '48%' }}
                                                    className={`mb-4 rounded-[28] p-4 border-2 overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-slate-100')}`}
                                                >
                                                    <View className={`items-center justify-center mb-3 h-24 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-slate-50'} overflow-hidden`}>
                                                        {ex.animation_url ? (
                                                            <Image 
                                                                source={{ uri: ex.animation_url }} 
                                                                className="w-full h-full opacity-50"
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <Dumbbell size={32} color="#3f3f46" />
                                                        )}
                                                        {isSelected && (
                                                            <View className="absolute inset-0 bg-blue-500/20 items-center justify-center">
                                                                <View className="bg-blue-500 rounded-full p-1.5 ring-4 ring-blue-500/30">
                                                                    <Plus size={20} color="#fff" />
                                                                </View>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text numberOfLines={2} className={`font-black text-xs uppercase leading-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                                        {ex.name}
                                                    </Text>
                                                    <Text className="text-[9px] font-bold text-blue-500 mt-2 tracking-widest uppercase">
                                                        {ex.target_muscle_group}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            <View className="h-40" />
                        </ScrollView>
                    </View>

                    {/* Botón de Confirmar Selección */}
                    {tempSelectedExercises.length > 0 && (
                        <View className="absolute bottom-10 left-6 right-6">
                            <TouchableOpacity
                                onPress={confirmSelection}
                                className="bg-blue-500 h-16 rounded-3xl flex-row items-center justify-center shadow-2xl shadow-blue-500/50"
                            >
                                <Text className="font-black text-white text-lg tracking-widest uppercase">
                                    CONECTAR {tempSelectedExercises.length} PIEZAS
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// Componente para simular animación intercalando 2 imágenes
const ExerciseAnimation = ({ baseUrl }: { baseUrl: string }) => {
    const [currentFrame, setCurrentFrame] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentFrame(prev => (prev === 0 ? 1 : 0));
        }, 800); // 800ms por frame para un ritmo natural
        return () => clearInterval(timer);
    }, []);

    const imageUrl = baseUrl.endsWith('.jpg') 
        ? baseUrl.replace('0.jpg', `${currentFrame}.jpg`)
        : `${baseUrl}${currentFrame}.jpg`;

    return (
        <Image 
            source={{ uri: imageUrl }} 
            className="w-full h-full opacity-90"
            resizeMode="contain"
        />
    );
};

// Componente de Detalle de Ejercicio con Gráfica de Líneas
const ExerciseDetailsModal = ({ isDark, isVisible, onClose, exercise, userId }: {
    isDark: boolean,
    isVisible: boolean,
    onClose: () => void,
    exercise: Exercise,
    userId: string
}) => {
    const [progression, setProgression] = useState<{ date: string, oneRM: number, maxWeight: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isVisible && exercise.id) {
            setLoading(true);
            workoutService.getExerciseProgression(userId, exercise.id)
                .then(setProgression)
                .finally(() => setLoading(false));
        }
    }, [isVisible, exercise.id, userId]);

    const chartData = useMemo(() => {
        if (progression.length === 0) return null;
        const points = progression.slice(-6);
        const labels = points.map(p => {
            const d = new Date(p.date);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        });

        return {
            oneRM: {
                labels,
                datasets: [{
                    data: points.map(p => p.oneRM),
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    strokeWidth: 3
                }]
            },
            weight: {
                labels,
                datasets: [{
                    data: points.map(p => p.maxWeight),
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Esmeralda/Verde
                    strokeWidth: 3
                }]
            }
        };
    }, [progression]);

    return (
        <Modal visible={isVisible} animationType="slide" transparent>
            <View className={`flex-1 ${isDark ? 'bg-zinc-950/95' : 'bg-slate-50/98'}`}>
                <SafeAreaView className="flex-1">
                    <View className={`px-6 py-4 flex-row items-center justify-between border-b ${isDark ? 'border-zinc-900' : 'border-slate-200'}`}>
                        <View className="flex-1">
                            <Text className={`font-black text-2xl ${isDark ? 'text-white' : 'text-slate-900'} uppercase tracking-tighter`}>{exercise.name}</Text>
                            <Text className="text-blue-500 font-bold text-[10px] uppercase tracking-[4px]">{exercise.target_muscle_group}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'} w-10 h-10 rounded-full items-center justify-center border`}>
                            <X size={20} color={isDark ? "#a1a1aa" : "#475569"} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                        {/* Técnica Visual */}
                        <View className="px-6 mt-6">
                            <Text className={`font-black text-xs uppercase tracking-widest mb-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Animación de Técnica</Text>
                            <View className={`h-64 w-full ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'} rounded-[40] overflow-hidden border p-4`}>
                                {exercise.animation_url ? (
                                    <ExerciseAnimation baseUrl={exercise.animation_url} />
                                ) : (
                                    <View className="flex-1 items-center justify-center">
                                        <Dumbbell size={48} color={isDark ? "#3f3f46" : "#cbd5e1"} strokeWidth={1} />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Gráfica de Evolución de Pesos */}
                        <View className="px-6 mt-10">
                            <Text className={`font-black text-xs uppercase tracking-widest mb-6 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Evolución de Pesos (Máx kg)</Text>
                            
                            {loading ? (
                                <View className={`h-64 items-center justify-center ${isDark ? 'bg-zinc-900/10 border-zinc-900' : 'bg-slate-100 border-slate-200'} rounded-[40] border border-dashed`}>
                                    <ActivityIndicator color="#10b981" />
                                </View>
                            ) : chartData ? (
                                <View className={`${isDark ? 'bg-zinc-900/30 border-zinc-900' : 'bg-white border-slate-100 shadow-sm'} rounded-[40] py-6 border items-center overflow-hidden`}>
                                    <LineChart
                                        data={chartData.weight}
                                        width={SCREEN_WIDTH - 48}
                                        height={200}
                                        chartConfig={{
                                            backgroundColor: 'transparent',
                                            backgroundGradientFrom: isDark ? '#18181b' : '#ffffff',
                                            backgroundGradientTo: isDark ? '#18181b' : '#ffffff',
                                            decimalPlaces: 1,
                                            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                                            labelColor: (opacity = 1) => isDark ? `rgba(161, 161, 170, ${opacity})` : `rgba(100, 116, 139, ${opacity})`,
                                            propsForDots: { r: "4", strokeWidth: "2", stroke: "#10b981" },
                                            propsForLabels: { fontSize: 9 }
                                        }}
                                        bezier
                                        style={{ marginVertical: 8, borderRadius: 16 }}
                                    />
                                </View>
                            ) : null}
                        </View>

                        {/* Gráfica de Progresión 1RM */}
                        <View className="px-6 mt-10 mb-20">
                            <Text className="text-zinc-500 font-black text-xs uppercase tracking-widest mb-6 text-center">Evolución Est. 1RM (Epley)</Text>
                            
                            {loading ? (
                                <View className="h-64 items-center justify-center bg-zinc-900/10 rounded-[40] border border-zinc-900 border-dashed">
                                    <ActivityIndicator color="#3b82f6" />
                                </View>
                            ) : chartData ? (
                                <View className={`${isDark ? 'bg-zinc-900/30 border-zinc-900' : 'bg-white border-slate-100 shadow-sm'} rounded-[40] py-6 border items-center overflow-hidden`}>
                                    <LineChart
                                        data={chartData.oneRM}
                                        width={SCREEN_WIDTH - 48}
                                        height={200}
                                        chartConfig={{
                                            backgroundColor: 'transparent',
                                            backgroundGradientFrom: isDark ? '#18181b' : '#ffffff',
                                            backgroundGradientTo: isDark ? '#18181b' : '#ffffff',
                                            decimalPlaces: 0,
                                            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                                            labelColor: (opacity = 1) => isDark ? `rgba(161, 161, 170, ${opacity})` : `rgba(100, 116, 139, ${opacity})`,
                                            propsForDots: { r: "4", strokeWidth: "2", stroke: "#3b82f6" },
                                            propsForLabels: { fontSize: 9 }
                                        }}
                                        bezier
                                        style={{ marginVertical: 8, borderRadius: 16 }}
                                    />
                                    <View className={`${isDark ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} px-6 py-3 rounded-2xl border`}>
                                        <Text className={`${isDark ? 'text-blue-400' : 'text-blue-600'} font-black text-sm uppercase tracking-widest`}>
                                            Mejor 1RM: {Math.max(...progression.map(p => p.oneRM))} kg
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View className={`h-64 items-center justify-center ${isDark ? 'bg-zinc-900/10 border-zinc-900' : 'bg-slate-50 border-slate-200 shadow-inner'} rounded-[40] border border-dashed p-10`}>
                                    <Trophy size={40} color={isDark ? "#3f3f46" : "#cbd5e1"} strokeWidth={1} className="mb-4" />
                                    <Text className={`${isDark ? 'text-zinc-400' : 'text-slate-400'} font-black text-[10px] text-center uppercase tracking-[2px] leading-relaxed`}>
                                        {progression.length === 1 
                                            ? "Primer registro completado. Necesitas entrenar otro día para ver tu tendencia." 
                                            : "Registra este ejercicio en diferentes sesiones para desbloquear el análisis de fuerza."}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
};
