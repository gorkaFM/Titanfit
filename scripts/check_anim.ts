import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAnim() {
    const { data: db } = await supabase.from('exercises_library').select('id, name, animation_url, video_url');
    
    if (!db) return;

    const idsToCheck = [
        'a449cbca-c0e1-49ef-ba98-f0e4db635540', // Remo con Barra
        '165ca91d-4767-4360-8783-5f07f231774f', // Remo con Mancuerna
    ];

    for (const id of idsToCheck) {
        const item = db.find(e => e.id === id);
        console.log(`\nEJERCICIO: ${item?.name} (${item?.id})`);
        console.log(`- animation_url: ${item?.animation_url}`);
        console.log(`- video_url: ${item?.video_url}`);
    }
}

checkAnim();
