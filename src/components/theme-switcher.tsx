"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

type Preference = "system" | "dark" | "light";
const storageKey = "cinechat-theme";
let fallbackPreference: Preference = "system";
let storageDisabled = false;

function preference(): Preference {
  if (storageDisabled) return fallbackPreference;
  try {
    const value = localStorage.getItem(storageKey);
    return value === "dark" || value === "light" ? value : "system";
  } catch { return fallbackPreference; }
}

function savePreference(next: Preference) {
  fallbackPreference = next;
  try { localStorage.setItem(storageKey, next); } catch { storageDisabled = true; }
  window.dispatchEvent(new Event("cinechat:theme"));
}

function applyTheme() {
  const value = preference();
  document.documentElement.dataset.theme = value === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : value;
}

function subscribe(onChange: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const update = () => { applyTheme(); onChange(); };
  window.addEventListener("storage", update);
  window.addEventListener("cinechat:theme", update);
  media.addEventListener("change", update);
  applyTheme();
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("cinechat:theme", update);
    media.removeEventListener("change", update);
  };
}

export function ThemeSwitcher() {
  const value = useSyncExternalStore(subscribe, preference, () => "system" as const);
  const menu = useRef<HTMLDetailsElement>(null);
  const Icon = value === "dark" ? Moon : value === "light" ? Sun : Monitor;

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function select(next: Preference) {
    savePreference(next);
    if (menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); }
  }

  return <details className="theme-menu" ref={menu}>
    <summary className="icon-button" aria-label="Change theme" title="Appearance"><Icon size={19} /></summary>
    <div className="theme-dropdown">
      <span className="dropdown-label">Appearance</span>
      {([{ value: "dark", label: "Dark", icon: Moon }, { value: "light", label: "Light", icon: Sun }, { value: "system", label: "System", icon: Monitor }] as const).map(option =>
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => select(option.value)}><option.icon size={16} /><span>{option.label}</span>{value === option.value && <Check size={15} />}</button>
      )}
    </div>
  </details>;
}
