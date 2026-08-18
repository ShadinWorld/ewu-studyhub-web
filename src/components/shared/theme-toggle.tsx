"use client";
import * as React from "react";
import { Moon, Palette, Sun, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES = [
  { value: "light", label: "Light", dot: "bg-white border-slate-300" },
  { value: "dark", label: "Dark", dot: "bg-slate-900 border-slate-700" },
  { value: "ewu-blue", label: "EWU Blue", dot: "bg-[#1b2e58] border-[#006b63]" },
  { value: "pink", label: "Pink", dot: "bg-[#e64980] border-[#40205f]" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-10 w-10" />;

  const current = THEMES.find((item) => item.value === theme) ?? THEMES[0];
  const isDark = theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Theme: ${current.label}`}
          title={`Theme: ${current.label}`}
          className="h-9 w-9 sm:h-10 sm:w-10"
        >
          {theme === "light" ? (
            <Sun className="h-5 w-5" />
          ) : theme === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Palette className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {THEMES.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => setTheme(item.value)}
            className="gap-2"
          >
            <span className={`h-4 w-4 rounded-full border ${item.dot}`} aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {current.value === item.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
