import { SERVICES, CATEGORY_LABELS, ServiceItem } from "./services";

const TOGGLES_KEY = "revera_service_toggles";
const SERVICES_KEY = "revera_dynamic_services";
const CATEGORIES_KEY = "revera_dynamic_categories";

export interface LocalCategory {
  key: string;
  en: string;
  ar: string;
  sortOrder?: number;
}

export type ServiceToggleState = Record<number, { visible: boolean; active: boolean }>;

// Flags to prevent redundant parallel sync requests
let isCategoriesSyncing = false;
let isServicesSyncing = false;

async function syncCategoriesFromDb() {
  if (typeof window === "undefined" || isCategoriesSyncing) return;
  isCategoriesSyncing = true;
  try {
    const res = await fetch("/api/categories");
    if (!res.ok) throw new Error("Fetch failed");
    const dbCats = await res.json() as LocalCategory[];
    if (Array.isArray(dbCats) && dbCats.length > 0) {
      const localRaw = localStorage.getItem(CATEGORIES_KEY);
      if (localRaw !== JSON.stringify(dbCats)) {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(dbCats));
        window.dispatchEvent(new StorageEvent("storage", { key: CATEGORIES_KEY }));
      }
    }
  } catch (err) {
    console.warn("Background categories sync failed:", err);
  } finally {
    isCategoriesSyncing = false;
  }
}

async function syncServicesFromDb() {
  if (typeof window === "undefined" || isServicesSyncing) return;
  isServicesSyncing = true;
  try {
    const res = await fetch("/api/services");
    if (!res.ok) throw new Error("Fetch failed");
    const dbSvcs = await res.json() as ServiceItem[];
    if (Array.isArray(dbSvcs) && dbSvcs.length > 0) {
      const localRaw = localStorage.getItem(SERVICES_KEY);
      if (localRaw !== JSON.stringify(dbSvcs)) {
        localStorage.setItem(SERVICES_KEY, JSON.stringify(dbSvcs));
        window.dispatchEvent(new StorageEvent("storage", { key: SERVICES_KEY }));
      }
    }
  } catch (err) {
    console.warn("Background services sync failed:", err);
  } finally {
    isServicesSyncing = false;
  }
}

async function syncCategoriesToDb(categories: LocalCategory[]) {
  try {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categories),
    });
  } catch (err) {
    console.error("Failed to sync categories to Supabase:", err);
  }
}

async function syncServicesToDb(services: ServiceItem[]) {
  try {
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(services),
    });
  } catch (err) {
    console.error("Failed to sync services to Supabase:", err);
  }
}

/** Helper to get dynamic categories, seeding with defaults if empty */
export function getDynamicCategories(): LocalCategory[] {
  if (typeof window === "undefined") return [];

  // Trigger background synchronization
  syncCategoriesFromDb();

  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalCategory[];
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
    }
    
    // Seed default categories
    const defaults: LocalCategory[] = Object.entries(CATEGORY_LABELS).map(([key, val], index) => ({
      key,
      en: val.en,
      ar: val.ar,
      sortOrder: index,
    }));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaults));
    
    // Sync seeded defaults to Supabase
    syncCategoriesToDb(defaults);

    return defaults.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  } catch {
    return [];
  }
}

/** Helper to save dynamic categories */
export function saveDynamicCategories(categories: LocalCategory[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  window.dispatchEvent(new StorageEvent("storage", { key: CATEGORIES_KEY }));

  // Save changes to Supabase
  syncCategoriesToDb(categories);
}

export function sortServices(services: ServiceItem[]): ServiceItem[] {
  const categories = getDynamicCategories();
  const catSortMap = new Map<string, number>(categories.map((c, i) => [c.key, c.sortOrder ?? i]));
  return [...services].sort((a, b) => {
    const catAOrder = catSortMap.get(a.cat) ?? 999;
    const catBOrder = catSortMap.get(b.cat) ?? 999;
    if (catAOrder !== catBOrder) {
      return catAOrder - catBOrder;
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

/** Helper to get dynamic services, seeding with defaults if empty */
export function getDynamicServices(): ServiceItem[] {
  if (typeof window === "undefined") return [];

  // Trigger background synchronization
  syncServicesFromDb();

  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ServiceItem[];
      if (Array.isArray(parsed)) {
        let changed = false;
        const migrated = parsed.map(item => {
          const defaultSvc = SERVICES.find(s => s.id === item.id);
          if (defaultSvc && item.img !== defaultSvc.img) {
            changed = true;
            return { ...item, img: defaultSvc.img };
          }
          return item;
        });
        if (changed) {
          localStorage.setItem(SERVICES_KEY, JSON.stringify(migrated));
          syncServicesToDb(migrated);
        }
        return sortServices(migrated);
      }
    }

    // Seed default services
    const defaults = SERVICES.map(s => ({
      ...s,
      price: s.price ?? 0,
      createdAt: s.createdAt ?? "30 Apr 2:01 pm",
      sortOrder: s.sortOrder ?? 0,
    }));
    localStorage.setItem(SERVICES_KEY, JSON.stringify(defaults));

    // Sync seeded defaults to Supabase
    syncServicesToDb(defaults);

    return sortServices(defaults);
  } catch {
    return [];
  }
}

/** Helper to save dynamic services */
export function saveDynamicServices(services: ServiceItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  window.dispatchEvent(new StorageEvent("storage", { key: SERVICES_KEY }));

  // Save changes to Supabase
  syncServicesToDb(services);
}

/** Read the current toggle state from localStorage */
export function getServiceToggles(): ServiceToggleState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TOGGLES_KEY);
    return raw ? (JSON.parse(raw) as ServiceToggleState) : {};
  } catch {
    return {};
  }
}

/** Persist a toggle state update to localStorage */
export function setServiceToggle(
  id: number,
  field: "visible" | "active",
  value: boolean
): void {
  if (typeof window === "undefined") return;
  const current = getServiceToggles();
  const updated: ServiceToggleState = {
    ...current,
    [id]: { ...(current[id] ?? { visible: true, active: true }), [field]: value },
  };
  localStorage.setItem(TOGGLES_KEY, JSON.stringify(updated));
  window.dispatchEvent(new StorageEvent("storage", { key: TOGGLES_KEY }));

  // Find matching service and update its values to trigger Supabase sync
  const services = getDynamicServices();
  const target = services.find(s => s.id === id);
  if (target) {
    if (field === "visible") target.visible = value;
    if (field === "active") target.active = value;
    saveDynamicServices(services);
  }
}

/** Returns true if the service with the given id is active (should be shown to users) */
export function isServiceActive(id: number, toggles: ServiceToggleState): boolean {
  const state = toggles[id];
  if (!state) return true; // default: active
  return state.active;
}
