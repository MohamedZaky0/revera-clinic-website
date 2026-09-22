import { CLIENT } from "@/config/client";
import { ServiceItem } from "./services";

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

/** Helper to get dynamic categories from localStorage */
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
    return [];
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

/** Helper to get dynamic services from localStorage */
export function getDynamicServices(): ServiceItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ServiceItem[];
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
    }
    return [];
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
