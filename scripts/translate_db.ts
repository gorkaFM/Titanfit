import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY) {
    console.error("Faltan variables de entorno (SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY).");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function translateExercises() {
    console.log("Descargando ejercicios de Supabase...");
    const { data: exercises, error } = await supabase
        .from('exercises_library')
        .select('id, name, target_muscle_group');

    if (error || !exercises || exercises.length === 0) {
        console.error("Error o base de datos vacía:", error);
        return;
    }
    
    // Chunking to avoid Gemini timeouts or token limits
    const chunkSize = 100;
    let totalSuccessCount = 0;
    let totalErrorCount = 0;

    for (let i = 0; i < exercises.length; i += chunkSize) {
        const chunk = exercises.slice(i, i + chunkSize);
        console.log(`\n--- PROCESANDO LOTE ${i / chunkSize + 1} de ${Math.ceil(exercises.length / chunkSize)} (${chunk.length} ejercicios) ---`);
        
        const payload = chunk.map(e => ({ id: e.id, name: e.name, muscle: e.target_muscle_group }));
        
        const prompt = `
Traduce la siguiente lista de ejercicios de fitness del inglés al español.
REGLAS CRÍTICAS Y ESTRICTAS:
1. Usa nomenclatura TÉCNICA Y REAL de los gimnasios en España. PROHIBIDO hacer traducciones literales.
2. MANTÉN LA UNICIDAD ABSOLUTA DEL EQUIPAMIENTO: Es VITAL que no haya dos ejercicios con el mismo nombre. Si el nombre original especifica "Dumbbell", "Barbell", "Cable", "Smith Machine", "Band", etc., DEBES incluirlo en la traducción (Ej: "Press de Banca con Mancuernas", "Press de Banca con Barra", "Jalón al pecho en Polea"). Si dos ejercicios terminan llamándose igual, la base de datos explotará.
3. Ejemplos maestros: 
   - "Barbell Deadlift" -> "Peso Muerto con Barra"
   - "Dumbbell Deadlift" -> "Peso Muerto con Mancuernas"
   - "Lat Pulldown" -> "Jalón al Pecho"
   - "Skullcrushers" -> "Press Francés"
   - "Lunge" -> "Zancadas"
   - "Overhead Press" -> "Press Militar"
4. Traduce también el grupo muscular ("muscle") a español (Chest -> Pecho, Back -> Espalda, Legs -> Piernas, Shoulders -> Hombros, Arms -> Brazos, Core -> Core).
5. DEVUELVE SOLO un array JSON válido, directamente parseable. No incluyas absolutamente nada de texto markdown. Cada objeto debe tener 'id', 'name' traducido y 'muscle' traducido.

JSON de entrada:
${JSON.stringify(payload)}
        `;

        try {
            console.log(`Llamando a Gemini para lote ${i / chunkSize + 1}...`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json"
                    }
                })
            });

            const result = await response.json();
            
            if (!result.candidates || !result.candidates[0]) {
                console.error("Error en la respuesta de Gemini para este lote:", JSON.stringify(result, null, 2));
                continue;
            }

            let translatedText = result.candidates[0].content.parts[0].text;
            translatedText = translatedText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
            const translatedArr = JSON.parse(translatedText);

            console.log(`✅ Traducción recibida. Inyectando en Supabase...`);

            for (const item of translatedArr) {
                const { error: updateError } = await supabase
                    .from('exercises_library')
                    .update({
                        name: item.name,
                        target_muscle_group: item.muscle
                    })
                    .eq('id', item.id);
                
                if (updateError) {
                    console.error(`❌ Fallo al actualizar ${item.id}:`, updateError);
                    totalErrorCount++;
                } else {
                    totalSuccessCount++;
                }
            }
        } catch (e) {
            console.error(`Catástrofe en el lote ${i / chunkSize + 1}:`, e);
        }
    }

    console.log(`\n==================================`);
    console.log(`OPERACIÓN MASIVA COMPLETADA:`);
    console.log(`- Traducidos y actualizados: ${totalSuccessCount}`);
    console.log(`- Errores: ${totalErrorCount}`);
    console.log(`==================================\n`);
}

translateExercises();
