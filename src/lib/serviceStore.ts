import { CLIENT } from "@/config/client";
import { SERVICES, CATEGORY_LABELS, ServiceItem } from "./services";

const TOGGLES_KEY = `${CLIENT.storagePrefix}_service_toggles`;
const SERVICES_KEY = `${CLIENT.storagePrefix}_dynamic_services`;
const CATEGORIES_KEY = `${CLIENT.storagePrefix}_dynamic_categories`;

export interface LocalCategory {
  key: string;
  en: string;
  ar: string;
  sortOrder?: number;
}

export type ServiceToggleState = Record<number, { visible: boolean; active: boolean }>;

/** Helper to get dynamic categories, seeding with defaults if empty */
export function getDynamicCategories(): LocalCategory[] {
  if (typeof window === "undefined") return [];
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
}

/** Helper to get dynamic services, seeding with defaults if empty */
export function getDynamicServices(): ServiceItem[] {
  if (typeof window === "undefined") return [];
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
        }
        return migrated.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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
    return defaults.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  } catch {
    return [];
  }
}

/** Helper to save dynamic services */
export function saveDynamicServices(services: ServiceItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  window.dispatchEvent(new StorageEvent("storage", { key: SERVICES_KEY }));
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
  // Notify other components in the same session
  window.dispatchEvent(new StorageEvent("storage", { key: TOGGLES_KEY }));
}

/** Returns true if the service with the given id is active (should be shown to users) */
export function isServiceActive(id: number, toggles: ServiceToggleState): boolean {
  const state = toggles[id];
  if (!state) return true; // default: active
  return state.active;
}
