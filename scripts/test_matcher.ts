import { createClient } from '@supabase/supabase-js';
import { HOME_WORKOUTS } from '../data/homeWorkoutsTemplates';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

async function testMatcher() {
    const { data: exercisesDb, error } = await supabase.from('exercises_library').select('*');
    if (error || !exercisesDb) throw error;

    console.log(`Tenemos ${exercisesDb.length} ejercicios de la BBDD.`);

    const template = HOME_WORKOUTS.find(h => h.id === 'routine-a-push');
    for (const we of template!.exercises) {
        const templateName = normalize(we.exercise?.name || '');
        let matchByName = exercisesDb.find(e => normalize(e.name) === templateName);
        let matchById = exercisesDb.find(e => e.id === we.exercise_id);
        
        let fuzzyMatch = undefined;
        if (!matchByName && templateName) {
            const firstWord = templateName.split(' ')[0];
            fuzzyMatch = exercisesDb.find(e => {
                const dbName = normalize(e.name);
                return dbName.includes(templateName) || templateName.includes(dbName) || 
                       (dbName.includes(firstWord) && e.target_muscle_group === we.exercise?.target_muscle_group);
            });
        }

        const finalMatch = matchByName || fuzzyMatch;

        console.log(`\nEJERCICIO TEMPLATE: ${we.exercise?.name}`);
        console.log(`- Match directo por Nombre: ${matchByName ? 'SI (' + matchByName.name + ')' : 'NO'}`);
        console.log(`- Match borroso: ${fuzzyMatch ? 'SI (' + fuzzyMatch.name + ')' : 'NO'}`);
        console.log(`- Match por ID: ${matchById ? 'SI (' + matchById.name + ')' : 'NO'}`);
        if (finalMatch) {
            console.log(`   Keys en el finalMatch: ${Object.keys(finalMatch).join(', ')}`);
        }
        
        if (!finalMatch) {
            console.log(`❌ FALLO TOTAL DE MATCHEADO.`);
        }
    }
}

testMatcher();
