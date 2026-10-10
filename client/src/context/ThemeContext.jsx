import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function initialTheme() {
  try {
    return localStorage.getItem("theme") || "dark";
  } catch {
    return "dark";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch { /* storage blocked */ }
  }, [theme]);
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
