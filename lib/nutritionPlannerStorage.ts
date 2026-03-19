import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { DayPlan, MealRecipe } from '@/lib/menuPlannerService';

export interface PersistedShoppingListItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface PersistedShoppingCategory {
  category: string;
  items: PersistedShoppingListItem[];
}

export interface PersistedPlannerState {
  plan: DayPlan[];
  shopping: PersistedShoppingCategory[];
  recipes: Record<string, MealRecipe>;
  expandedDay: string | null;
  importedToDiary: boolean;
  importedDiaryStartDate?: string | null;
  updatedAt: string;
}

function getStorageKey(userId: string) {
  return `titanfit:nutrition-planner:${userId}`;
}

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  }
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
    return;
  }
  await AsyncStorage.removeItem(key);
}

export async function loadPlannerState(userId: string): Promise<PersistedPlannerState | null> {
  const raw = await getItem(getStorageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedPlannerState;
    return {
      plan: parsed.plan ?? [],
      shopping: parsed.shopping ?? [],
      recipes: parsed.recipes ?? {},
      expandedDay: parsed.expandedDay ?? null,
      importedToDiary: parsed.importedToDiary ?? false,
      importedDiaryStartDate: parsed.importedDiaryStartDate ?? null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    await clearPlannerState(userId);
    return null;
  }
}

export async function savePlannerState(userId: string, state: PersistedPlannerState) {
  await setItem(getStorageKey(userId), JSON.stringify(state));
}

export async function clearPlannerState(userId: string) {
  await deleteItem(getStorageKey(userId));
}
