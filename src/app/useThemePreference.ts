import { useEffect, useState } from "react";
import type { PaletteMode } from "@mui/material";

const storageKey = "reactive-circuit.theme";

function initialMode(): PaletteMode {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Theme switching remains available when browser storage is blocked.
  }
  return "dark";
}

export function useThemePreference() {
  const [mode, setMode] = useState<PaletteMode>(initialMode);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      // Keep the preference in React state if persistence is unavailable.
    }
  }, [mode]);
  return { mode, toggleTheme: () => setMode((current) => (current === "dark" ? "light" : "dark")) };
}
