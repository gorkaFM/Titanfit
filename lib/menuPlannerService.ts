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

export const ACTIVE_GEMINI_MODELS = GEMINI_MODELS;

const MENU_PLAN_PROMPT = `Eres un nutricionista experto. Analiza el menu, receta o lista de alimentos proporcionada y genera un plan alimentario semanal de 7 dias siguiendo el mismo estilo de cocina y alimentos visibles.

REGLAS ESTRICTAS:
1. Responde UNICAMENTE con JSON puro, sin texto adicional, sin markdown, sin bloques de codigo.
2. El JSON debe tener exactamente esta estructura:
{"plan":[{"day":"Lunes","meals":[{"meal":"Desayuno","foods":"descripcion","kcal_approx":350},{"meal":"Comida","foods":"descripcion","kcal_approx":600},{"meal":"Merienda","foods":"descripcion","kcal_approx":200},{"meal":"Cena","foods":"descripcion","kcal_approx":500}]},{"day":"Martes","meals":[...]},{"day":"Miercoles","meals":[...]},{"day":"Jueves","meals":[...]},{"day":"Viernes","meals":[...]},{"day":"Sabado","meals":[...]},{"day":"Domingo","meals":[...]}]}
3. Todos los campos son obligatorios. kcal_approx debe ser un numero entero.
4. No inventes platos que no encajen con el texto o la imagen analizada.
5. Si el contenido original parece ser un menu de varios dias, reutiliza sus ideas y completa la semana manteniendo coherencia.`;

function ensureGeminiKey() {
  if (!GEMINI_API_KEY) {
    throw new Error('Falta EXPO_PUBLIC_GEMINI_API_KEY para generar el plan.');
  }
}

function stripDataUrlPrefix(base64: string) {
  return base64.includes(',') ? base64.split(',')[1] : base64;
}

function parseJsonResponse(raw: string) {
  if (!raw.trim()) {
    throw new Error('La IA no devolvio contenido.');
  }

  try {
    return JSON.parse(raw);
  } catch {
    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('No se pudo extraer JSON valido de la respuesta.');
    }
    return JSON.parse(match[0]);
  }
}

async function callGemini(parts: { text?: string; inline_data?: { mime_type: string; data: string } }[], maxOutputTokens: number) {
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
      return parseJsonResponse(raw);
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
    4000
  );
}

async function generatePlanFromText(menuText: string) {
  const prompt = `${MENU_PLAN_PROMPT}

TEXTO EXTRAIDO DEL MENU:
${menuText}`;

  return callGemini([{ text: prompt }], 4000);
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
    const plan = parsed?.plan ?? [];
    if (plan.length) {
      return plan;
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

  const parsed = await generatePlanFromText(extractedText);
  const plan = parsed?.plan ?? [];

  if (!plan.length) {
    throw new Error('Se extrajo texto, pero no se pudo convertir en un plan semanal valido.');
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

  const parsed = await callGemini([{ text: prompt }], 1500);
  return parsed?.categories ?? [];
}
