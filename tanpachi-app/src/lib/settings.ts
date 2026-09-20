import { useSyncExternalStore } from "react";

export type Settings = {
  /** 演出の音を鳴らすか */
  sound: boolean;
  /** 画面の明るさ（1 = 標準） */
  brightness: number;
  /** 確変（ラッシュ）を発生させるか */
  kakuhenEnabled: boolean;
};

const STORAGE_KEY = "tanpachi:settings";

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  brightness: 1,
  kakuhenEnabled: true,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // 明るさは範囲内にクランプ
    merged.brightness = Math.min(1.5, Math.max(0.5, Number(merged.brightness) || 1));
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let settings: Settings = load();
let menuOpen = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getSettings(): Settings {
  return settings;
}

export function setSettings(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  emit();
}

export function resetSettings(): void {
  setSettings(DEFAULT_SETTINGS);
}

export function setMenuOpen(open: boolean): void {
  if (menuOpen === open) return;
  menuOpen = open;
  emit();
}

export function openMenu(): void {
  setMenuOpen(true);
}

export function closeMenu(): void {
  setMenuOpen(false);
}

export function toggleMenu(): void {
  setMenuOpen(!menuOpen);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

export function useMenuOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => menuOpen,
    () => menuOpen,
  );
}
