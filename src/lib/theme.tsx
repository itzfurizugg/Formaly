import { useEffect, useState, type ReactNode } from "react"
import {
    ThemeContext,
    THEME_STORAGE_KEY,
    applyTheme,
    type Theme,
} from "./theme-context"

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
        if (saved === "dark" || saved === "light") return saved
        return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    })

    useEffect(() => {
        applyTheme(theme)
        localStorage.setItem(THEME_STORAGE_KEY, theme)
    }, [theme])

    const setTheme = (nextTheme: Theme) => {
        setThemeState(nextTheme)
    }

    const toggleTheme = () => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"))
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}
