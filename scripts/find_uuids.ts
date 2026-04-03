import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findExercises() {
    const { data: db } = await supabase.from('exercises_library').select('id, name');
    
    if (!db) return;

    const searchTerms = [
        "Flexiones", 
        "Sentadilla Isométrica", "Sentadilla", "Wall Sit",
        "Tríceps", "Crunch", "Plancha", "Dead bug", "Bird"
    ];

    for (const term of searchTerms) {
        const matches = db.filter(e => e.name.toLowerCase().includes(term.toLowerCase()));
        console.log(`\nResultados para '${term}':`);
        matches.slice(0, 5).forEach(m => console.log(`- ${m.name} (${m.id})`));
    }
}

findExercises();
