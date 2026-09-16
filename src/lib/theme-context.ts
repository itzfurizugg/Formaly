import { createContext, useContext } from "react"
import { getColors } from "./colorbase"

export type Theme = "light" | "dark"

export interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
    setTheme: (theme: Theme) => void
}

export const THEME_STORAGE_KEY = "setting_theme"

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function applyTheme(theme: Theme) {
    if (typeof document === "undefined") return
    const root = document.documentElement
    root.setAttribute("data-theme", theme)
    if (theme === "dark") {
        root.classList.add("dark")
    } else {
        root.classList.remove("dark")
    }

    const c = getColors(theme)
    root.style.setProperty("--fml-base", c.base)
    root.style.setProperty("--fml-second", c.second)
    root.style.setProperty("--fml-tinted", c.tinted)
    root.style.setProperty("--fml-darks", c.darks)
    root.style.setProperty("--fml-done", c.done)
    root.style.setProperty("--fml-pass", c.pass)
    root.style.setProperty("--fml-wrong", c.wrong)

    if (theme === "dark") {
        root.style.setProperty("--color-base-100", c.second)
        root.style.setProperty("--color-base-200", c.base)
        root.style.setProperty("--color-base-300", c.base)
        root.style.setProperty("--color-base-content", c.darks)
        root.style.colorScheme = "dark"
    } else {
        root.style.setProperty("--color-base-100", "#FFFFFF")
        root.style.setProperty("--color-base-200", c.base)
        root.style.setProperty("--color-base-300", c.second)
        root.style.setProperty("--color-base-content", c.darks)
        root.style.colorScheme = "light"
    }
}

if (typeof document !== "undefined") {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    const initialTheme: Theme = saved === "dark" || saved === "light"
        ? saved
        : (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    applyTheme(initialTheme)
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }
    return context
}

export function useThemeColors() {
    const { theme } = useTheme()
    return getColors(theme)
}
