export type AppTheme = "light" | "dark";
export type AppThemePreference = AppTheme | "system";
export type AppColorTheme = "blue" | "violet" | "gold";

export function isAppColorTheme(value: unknown): value is AppColorTheme {
  return value === "blue" || value === "violet" || value === "gold";
}
