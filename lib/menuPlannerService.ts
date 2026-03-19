import { supabase } from '@/lib/supabase';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_MODELS = [
  process.env.EXPO_PUBLIC_GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
].filter((value): value is string => Boolean(value));

export interface DayPlan {
  day: string;
  meals: { meal: string; foods: string; kcal_approx: number }[];
}

export interface ShoppingItem {
  category: string;
  items: string[];
}

interface MealLogRecord {
  id: string;
  user_id: string;
  date: string;
  meal_type: string;
  meal_label: string | null;
  sort_order: number | null;
  created_at?: string;
}

interface ImportPlanRpcResult {
  first_date?: string;
  last_date?: string;
  inserted_items?: number;
  replaced_sections?: number;
}

export const ACTIVE_GEMINI_MODELS = GEMINI_MODELS;
const MIN_PLAN_DAYS = 7;
const MIN_MEALS_PER_DAY = 3;

const MENU_PLAN_PROMPT = `Eres un nutricionista experto. Analiza el menu, receta o lista de alimentos proporcionada y genera un plan alimentario semanal de 7 dias siguiendo el mismo estilo de cocina y alimentos visibles.

REGLAS ESTRICTAS:
1. Responde UNICAMENTE con JSON puro, sin texto adicional, sin markdown, sin bloques de codigo.
2. El JSON debe tener exactamente esta estructura:
{"plan":[{"day":"Lunes","meals":[{"meal":"Desayuno","foods":"descripcion","kcal_approx":350},{"meal":"Comida","foods":"descripcion","kcal_approx":600},{"meal":"Merienda","foods":"descripcion","kcal_approx":200},{"meal":"Cena","foods":"descripcion","kcal_approx":500}]},{"day":"Martes","meals":[...]},{"day":"Miercoles","meals":[...]},{"day":"Jueves","meals":[...]},{"day":"Viernes","meals":[...]},{"day":"Sabado","meals":[...]},{"day":"Domingo","meals":[...]}]}
3. Todos los campos son obligatorios. kcal_approx debe ser un numero entero.
4. En "foods" debes incluir SIEMPRE los alimentos y las cantidades visibles o inferibles del menu (ejemplo: "150 g pechuga de pollo, 80 g arroz, ensalada verde").
5. No inventes platos que no encajen con el texto o la imagen analizada.
6. Si el contenido original parece ser un menu de varios dias, reutiliza sus ideas y completa la semana manteniendo coherencia.`;

function ensureGeminiKey() {
  if (!GEMINI_API_KEY) {
    throw new Error('Falta EXPO_PUBLIC_GEMINI_API_KEY para generar el plan.');
  }
}

function stripDataUrlPrefix(base64: string) {
  return base64.includes(',') ? base64.split(',')[1] : base64;
}

function stripMarkdownFences(raw: string) {
  return raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

function extractJsonCandidate(raw: string) {
  const clean = stripMarkdownFences(raw);
  const objectStart = clean.indexOf('{');
  const arrayStart = clean.indexOf('[');
  let start = -1;

  if (objectStart >= 0 && arrayStart >= 0) {
    start = Math.min(objectStart, arrayStart);
  } else {
    start = Math.max(objectStart, arrayStart);
  }

  if (start < 0) {
    throw new Error('No se pudo extraer JSON valido de la respuesta.');
  }

  return clean.slice(start).trim();
}

function removeTrailingCommas(raw: string) {
  return raw.replace(/,\s*([}\]])/g, '$1');
}

function closeJsonDelimiters(raw: string) {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const char of raw) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') stack.push('}');
    if (char === '[') stack.push(']');
    if ((char === '}' || char === ']') && stack[stack.length - 1] === char) {
      stack.pop();
    }
  }

  return `${removeTrailingCommas(raw)}${stack.reverse().join('')}`;
}

function parseJsonResponse(raw: string) {
  if (!raw.trim()) {
    throw new Error('La IA no devolvio contenido.');
  }

  const attempts = [raw];

  try {
    return JSON.parse(raw);
  } catch {}

  const candidate = extractJsonCandidate(raw);
  if (candidate !== raw) {
    attempts.push(candidate);
  }

  attempts.push(removeTrailingCommas(candidate));
  attempts.push(closeJsonDelimiters(candidate));
  attempts.push(closeJsonDelimiters(removeTrailingCommas(candidate)));

  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('No se pudo parsear el JSON.');
    }
  }

  throw lastError ?? new Error('No se pudo extraer JSON valido de la respuesta.');
}

function normalizeWeeklyPlan(rawPlan: unknown): DayPlan[] {
  if (!Array.isArray(rawPlan)) {
    throw new Error('La IA no devolvio una lista de dias valida.');
  }

  if (rawPlan.length < MIN_PLAN_DAYS) {
    throw new Error(`La IA devolvio un plan incompleto (${rawPlan.length}/${MIN_PLAN_DAYS} dias).`);
  }

  const normalizedPlan = rawPlan.map((dayEntry, dayIndex) => {
    const day = typeof dayEntry?.day === 'string' ? dayEntry.day.trim() : '';
    const meals = Array.isArray(dayEntry?.meals) ? dayEntry.meals : [];

    if (!day) {
      throw new Error(`El dia ${dayIndex + 1} del plan no tiene nombre valido.`);
    }

    if (meals.length < MIN_MEALS_PER_DAY) {
      throw new Error(`El dia ${day} esta incompleto (${meals.length} comidas).`);
    }

    return {
      day,
      meals: meals.map((mealEntry: any, mealIndex: number) => {
        const meal = typeof mealEntry?.meal === 'string' ? mealEntry.meal.trim() : '';
        const foods = typeof mealEntry?.foods === 'string' ? mealEntry.foods.trim() : '';
        const kcal = Math.round(Number(mealEntry?.kcal_approx) || 0);

        if (!meal || !foods) {
          throw new Error(`La comida ${mealIndex + 1} de ${day} no es valida.`);
        }

        return {
          meal,
          foods,
          kcal_approx: kcal,
        };
      }),
    };
  });

  return normalizedPlan.slice(0, MIN_PLAN_DAYS);
}

async function callGemini(
  parts: { text?: string; inline_data?: { mime_type: string; data: string } }[],
  maxOutputTokens: number,
  validator?: (parsed: any) => any
) {
  ensureGeminiKey();

  let lastError = 'No se pudo contactar con Gemini.';

  for (const model of GEMINI_MODELS) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      try {
        const parsed = parseJsonResponse(raw);
        return validator ? validator(parsed) : parsed;
      } catch (error) {
        lastError = `${model} -> ${(error as Error).message}`;
        continue;
      }
    }

    const errText = await response.text();
    lastError = `${model} -> Gemini error ${response.status}: ${errText.slice(0, 240)}`;

    // Si el modelo no existe o ya no está disponible, probamos el siguiente.
    if (response.status === 404) {
      continue;
    }

    // Para otros errores devolvemos el más informativo.
    throw new Error(lastError);
  }

  throw new Error(lastError);
}

async function analyzeMenuInline(base64: string, mimeType: string) {
  return callGemini(
    [
      { text: MENU_PLAN_PROMPT },
      { inline_data: { mime_type: mimeType, data: stripDataUrlPrefix(base64) } },
    ],
    6000,
    (parsed) => normalizeWeeklyPlan(parsed?.plan ?? [])
  );
}

async function generatePlanFromText(menuText: string) {
  const prompt = `${MENU_PLAN_PROMPT}

TEXTO EXTRAIDO DEL MENU:
${menuText}`;

  return callGemini([{ text: prompt }], 6000, (parsed) => normalizeWeeklyPlan(parsed?.plan ?? []));
}

function base64ToUint8Array(base64: string) {
  const normalized = stripDataUrlPrefix(base64);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function extractPdfTextWeb(base64: string) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

  const pdf = await pdfjs.getDocument({ data: base64ToUint8Array(base64) }).promise;
  const pageTexts: string[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str ?? '' : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text) {
      pageTexts.push(`Pagina ${pageIndex}: ${text}`);
    }
  }

  return pageTexts.join('\n\n').trim();
}

async function extractImageTextWeb(base64: string) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa+eng');

  try {
    const { data } = await worker.recognize(`data:image/jpeg;base64,${stripDataUrlPrefix(base64)}`);
    return data.text.replace(/\s+/g, ' ').trim();
  } finally {
    await worker.terminate();
  }
}

async function extractMenuText(base64: string, mimeType: string) {
  if (typeof window === 'undefined') {
    return '';
  }

  if (mimeType === 'application/pdf') {
    return extractPdfTextWeb(base64);
  }

  if (mimeType.startsWith('image/')) {
    return extractImageTextWeb(base64);
  }

  return '';
}

export async function analyzeMenuAsset(base64: string, mimeType: string): Promise<DayPlan[]> {
  let extractedText = '';
  let inlineError = '';

  try {
    const parsed = await analyzeMenuInline(base64, mimeType);
    if (parsed.length) {
      return parsed;
    }
  } catch (error) {
    inlineError = error instanceof Error ? error.message : 'Fallo desconocido en el analisis directo';
  }

  try {
    extractedText = await extractMenuText(base64, mimeType);
  } catch (error) {
    const extractionError = error instanceof Error ? error.message : 'Fallo al extraer texto del archivo';
    throw new Error(`${inlineError || 'Gemini no pudo analizar el archivo'} | OCR/PDF fallback: ${extractionError}`);
  }

  if (!extractedText || extractedText.length < 40) {
    throw new Error(inlineError || 'No se pudo extraer suficiente texto del archivo.');
  }

  const plan = await generatePlanFromText(extractedText);
  if (!plan.length) {
    throw new Error('Se extrajo texto, pero no se pudo convertir en un plan semanal completo y valido.');
  }

  return plan;
}

export async function generateShoppingListFromPlan(plan: DayPlan[]): Promise<ShoppingItem[]> {
  const planText = plan
    .map((dayPlan) => `${dayPlan.day}:\n${dayPlan.meals.map((meal) => `  ${meal.meal}: ${meal.foods}`).join('\n')}`)
    .join('\n\n');

  const prompt = `Dado este plan semanal, genera una lista de la compra organizada por categorias.
Responde SOLO JSON puro sin markdown:
{"categories":[{"category":"Carnes y Pescados","items":["item1"]},{"category":"Frutas y Verduras","items":["item1"]}]}

Plan:
${planText}`;

  try {
    const parsed = await callGemini([{ text: prompt }], 1500);
    const categories = parsed?.categories ?? [];
    if (categories.length > 0) {
      return categories;
    }
  } catch {}

  return deriveShoppingListFromPlan(plan);
}

function deriveShoppingListFromPlan(plan: DayPlan[]): ShoppingItem[] {
  const categoryMap = new Map<string, Set<string>>();

  const pickCategory = (item: string) => {
    const normalized = item.toLowerCase();
    if (/(pollo|pavo|ternera|atun|atún|salmon|salmón|huevo|jamon|jamón|merluza)/.test(normalized)) return 'Proteinas';
    if (/(arroz|avena|pan|pasta|patata|boniato|tortilla|cereal)/.test(normalized)) return 'Carbohidratos';
    if (/(manzana|platano|plátano|naranja|fresa|pera|kiwi|verdura|ensalada|brocoli|brócoli|tomate|pepino|zanahoria)/.test(normalized)) return 'Frutas y Verduras';
    if (/(aceite|aguacate|frutos secos|nueces|almendras|queso|yogur|leche)/.test(normalized)) return 'Grasas y Lacteos';
    return 'Otros';
  };

  for (const dayPlan of plan) {
    for (const meal of dayPlan.meals) {
      const rawItems = meal.foods
        .split(/,| y | con /gi)
        .map((item) => item.trim())
        .filter(Boolean);

      for (const item of rawItems) {
        const category = pickCategory(item);
        if (!categoryMap.has(category)) {
          categoryMap.set(category, new Set());
        }
        categoryMap.get(category)?.add(item);
      }
    }
  }

  return Array.from(categoryMap.entries()).map(([category, items]) => ({
    category,
    items: Array.from(items),
  }));
}

function normalizeMealType(mealLabel: string) {
  const normalized = mealLabel.toLowerCase();
  if (normalized.includes('desayuno')) return { meal_type: 'desayuno', meal_label: 'Desayuno', sort_order: 0 };
  if (normalized.includes('pre')) return { meal_type: 'pre_entreno', meal_label: 'Pre-entreno', sort_order: 1 };
  if (normalized.includes('comida') || normalized.includes('almuerzo')) return { meal_type: 'comida', meal_label: 'Comida', sort_order: 2 };
  if (normalized.includes('merienda') || normalized.includes('media')) return { meal_type: 'merienda', meal_label: 'Merienda', sort_order: 3 };
  if (normalized.includes('cena')) return { meal_type: 'cena', meal_label: 'Cena', sort_order: 4 };
  if (normalized.includes('post')) return { meal_type: 'post_entreno', meal_label: 'Post-entreno', sort_order: 5 };
  return { meal_type: 'extra', meal_label: mealLabel, sort_order: 6 };
}

function getNextMonday(baseDate = new Date()) {
  const result = new Date(baseDate);
  result.setHours(12, 0, 0, 0);
  const currentDay = result.getDay();
  const daysUntilMonday = currentDay === 1 ? 0 : currentDay === 0 ? 1 : 8 - currentDay;
  result.setDate(result.getDate() + daysUntilMonday);
  return result;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPlannerStartDate(baseDate = new Date()) {
  return toISODate(getNextMonday(baseDate));
}

function compareMealLogs(a: MealLogRecord, b: MealLogRecord) {
  const sortOrderDifference = (a.sort_order ?? 0) - (b.sort_order ?? 0);
  if (sortOrderDifference !== 0) return sortOrderDifference;

  const createdAtA = a.created_at ? new Date(a.created_at).getTime() : 0;
  const createdAtB = b.created_at ? new Date(b.created_at).getTime() : 0;
  if (createdAtA !== createdAtB) return createdAtA - createdAtB;

  return a.id.localeCompare(b.id);
}

async function consolidateMealLogs(
  logs: MealLogRecord[],
  userId: string,
  date: string,
  mealType: string
) {
  const matchingLogs = logs
    .filter((log) => log.date === date && log.meal_type === mealType)
    .sort(compareMealLogs);

  if (matchingLogs.length === 0) {
    return null;
  }

  const canonicalLog = matchingLogs[0];
  const duplicateLogs = matchingLogs.slice(1);

  for (const duplicateLog of duplicateLogs) {
    const { error: moveItemsError } = await supabase
      .from('meal_log_items')
      .update({ meal_log_id: canonicalLog.id })
      .eq('meal_log_id', duplicateLog.id)
      .eq('user_id', userId);

    if (moveItemsError) throw moveItemsError;

    const { error: deleteLogError } = await supabase
      .from('meal_logs')
      .delete()
      .eq('id', duplicateLog.id)
      .eq('user_id', userId);

    if (deleteLogError) throw deleteLogError;
  }

  for (let index = logs.length - 1; index >= 0; index -= 1) {
    if (logs[index].date === date && logs[index].meal_type === mealType && logs[index].id !== canonicalLog.id) {
      logs.splice(index, 1);
    }
  }

  return canonicalLog;
}

function isMissingImportRpc(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    error.message?.toLowerCase().includes('import_menu_plan_to_diary') === true
  );
}

async function importPlanToDiaryViaRpc(userId: string, plan: DayPlan[]) {
  const startDate = getPlannerStartDate();
  const { data, error } = await supabase.rpc('import_menu_plan_to_diary', {
    p_user_id: userId,
    p_start_date: startDate,
    p_plan: plan,
  });

  if (error) {
    if (isMissingImportRpc(error)) {
      return null;
    }
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as ImportPlanRpcResult | undefined) : (data as ImportPlanRpcResult | null);
  if (!row?.first_date || !row?.last_date) {
    throw new Error('La importación RPC no devolvió el rango esperado.');
  }

  return {
    firstDate: row.first_date,
    lastDate: row.last_date,
  };
}

export async function importPlanToDiary(userId: string, plan: DayPlan[]) {
  const rpcResult = await importPlanToDiaryViaRpc(userId, plan);
  if (rpcResult) {
    return rpcResult;
  }

  const monday = getNextMonday();
  const targetDates = plan.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toISODate(date);
  });

  const { data: existingLogs, error: existingLogsError } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .in('date', targetDates);

  if (existingLogsError) throw existingLogsError;

  const logs: MealLogRecord[] = [...((existingLogs ?? []) as MealLogRecord[])];

  for (const [dayIndex, dayPlan] of plan.entries()) {
    const date = targetDates[dayIndex];

    for (const meal of dayPlan.meals) {
      const normalizedMeal = normalizeMealType(meal.meal);
      let currentLog = await consolidateMealLogs(logs, userId, date, normalizedMeal.meal_type);

      if (!currentLog) {
        const { data: insertedLog, error: insertLogError } = await supabase
          .from('meal_logs')
          .insert({
            user_id: userId,
            date,
            meal_type: normalizedMeal.meal_type,
            meal_label: normalizedMeal.meal_label,
            sort_order: normalizedMeal.sort_order,
          })
          .select()
          .single();

        if (insertLogError) throw insertLogError;
        currentLog = insertedLog as MealLogRecord;
        logs.push(currentLog);
      }

      const { data: insertedItem, error: insertItemError } = await supabase
        .from('meal_log_items')
        .insert({
          meal_log_id: currentLog.id,
          user_id: userId,
          name: meal.foods,
          quantity_g: 1,
          kcal: meal.kcal_approx,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          source: 'gemini',
        })
        .select('id');

      if (insertItemError) throw insertItemError;

      const insertedItemId = insertedItem?.[0]?.id;
      if (!insertedItemId) {
        throw new Error('No se pudo confirmar el item importado en el diario.');
      }

      const { error: deletePreviousGeminiError } = await supabase
        .from('meal_log_items')
        .delete()
        .eq('meal_log_id', currentLog.id)
        .eq('user_id', userId)
        .eq('source', 'gemini')
        .neq('id', insertedItemId);

      if (deletePreviousGeminiError) throw deletePreviousGeminiError;
    }
  }

  return {
    firstDate: targetDates[0],
    lastDate: targetDates[targetDates.length - 1],
  };
}
