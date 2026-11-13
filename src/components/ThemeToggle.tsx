import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme: Theme) {
  localStorage.setItem("theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setLocalTheme] = useState<Theme>("light");

  useEffect(() => {
    const initial = getTheme();
    setLocalTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setLocalTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center justify-center rounded-md border border-input bg-card p-2 text-sm font-medium transition-colors hover:bg-secondary"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
