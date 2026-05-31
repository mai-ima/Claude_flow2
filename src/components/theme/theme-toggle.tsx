"use client";

import { useEffect, useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { SunIcon, MoonIcon, MonitorIcon } from "@/components/icons";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("tsumiki-theme") as Theme) || "system";
    setTheme(saved);
  }, []);

  function change(next: Theme) {
    setTheme(next);
    localStorage.setItem("tsumiki-theme", next);
    apply(next);
  }

  if (compact) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    return (
      <button
        onClick={() => change(next)}
        aria-label="テーマを切り替え"
        className="grid h-10 w-10 place-items-center rounded-full text-text-secondary hover:bg-surface-2 hover:text-text-primary transition"
      >
        {theme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
      </button>
    );
  }

  return (
    <Segmented<Theme>
      value={theme}
      onChange={change}
      options={[
        { value: "light", label: "ライト" },
        { value: "dark", label: "ダーク" },
        { value: "system", label: "自動" },
      ]}
    />
  );
}

export { SunIcon, MoonIcon, MonitorIcon };
