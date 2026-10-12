import React from "react";
import { Theme } from "@radix-ui/themes";
import App from "./App";
import { DebugCanvasWindow } from "./features/debug/DebugCanvasWindow";
import { WindowTitlebar } from "./features/window/WindowTitlebar";
import { invoke } from "./tauri";
import { isAppColorTheme, type AppColorTheme, type AppTheme, type AppThemePreference } from "./types/theme";
import {
  DEFAULT_MYSTIC_CODE_GENDER,
  normalizeMysticCodeGender,
  type MysticCodeGender,
} from "./types/appUiSettings";

interface AppThemeRootProps {
  isDebugCanvas: boolean;
}

interface StartupMigrationStatus {
  migrated: boolean;
  from: string | null;
  to: string;
}

function getSystemTheme(): AppTheme {
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function isThemePreference(value: unknown): value is AppThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function AppThemeRoot({ isDebugCanvas }: AppThemeRootProps) {
  const [themePreference, setThemePreference] =
    React.useState<AppThemePreference>("system");
  const [systemTheme, setSystemTheme] = React.useState<AppTheme>(getSystemTheme);
  const [colorTheme, setColorTheme] = React.useState<AppColorTheme>();
  const [colorThemeError, setColorThemeError] = React.useState<string>();
  const colorThemeRequest = React.useRef(0);
  const [startupReady, setStartupReady] = React.useState(isDebugCanvas);
  const [mysticCodeGender, setMysticCodeGender] = React.useState<MysticCodeGender>(
    DEFAULT_MYSTIC_CODE_GENDER,
  );
  const theme = themePreference === "system" ? systemTheme : themePreference;

  const handleColorThemeChange = React.useCallback(async (value: AppColorTheme) => {
    const saved = await invoke<AppColorTheme>("set_app_color_theme", { value });
    if (!isAppColorTheme(saved)) throw new Error("主题配色保存失败");
    setColorTheme(saved);
  }, []);

  const reloadColorTheme = React.useCallback(async () => {
    const request = ++colorThemeRequest.current;
    setColorThemeError(undefined);
    try {
      const saved = await invoke<AppColorTheme>("get_app_color_theme");
      if (!isAppColorTheme(saved)) throw new Error("Invalid app color theme response");
      if (request === colorThemeRequest.current) setColorTheme(saved);
    } catch (error: unknown) {
      if (request !== colorThemeRequest.current) return;
      console.error("Failed to load app color theme", error);
      setColorThemeError(/get_app_color_theme.*not found|unknown command/i.test(String(error))
        ? "当前应用需要重启后才能使用主题配色。"
        : "主题配色读取失败，请重试。");
    }
  }, []);

  React.useEffect(() => {
    void reloadColorTheme();
    return () => { colorThemeRequest.current += 1; };
  }, [reloadColorTheme]);

  const handleThemePreferenceChange = React.useCallback((nextTheme: AppThemePreference) => {
    setThemePreference(nextTheme);
    invoke("set_app_theme", { theme: nextTheme }).catch((error: unknown) => {
      console.error("Failed to persist app theme", error);
    });
  }, []);

  const handleMysticCodeGenderChange = React.useCallback((value: MysticCodeGender) => {
    setMysticCodeGender(value);
    invoke("set_mystic_code_gender", { value }).catch((error: unknown) => {
      console.error("Failed to persist Mystic Code gender", error);
    });
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  React.useEffect(() => {
    if (colorTheme) document.documentElement.dataset.colorTheme = colorTheme;
  }, [colorTheme]);

  React.useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const handleSystemThemeChange = () => {
      setSystemTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener?.("change", handleSystemThemeChange);
    return () => {
      media.removeEventListener?.("change", handleSystemThemeChange);
    };
  }, []);

  React.useEffect(() => {
    invoke<MysticCodeGender>("get_mystic_code_gender")
      .then((value) => setMysticCodeGender(normalizeMysticCodeGender(value)))
      .catch((error: unknown) => {
        console.error("Failed to load Mystic Code gender", error);
      });
  }, []);

  React.useEffect(() => {
    invoke<AppThemePreference | null>("get_app_theme")
      .then((savedTheme) => {
        if (isThemePreference(savedTheme)) {
          setThemePreference(savedTheme);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load app theme", error);
      });
  }, []);

  React.useEffect(() => {
    if (isDebugCanvas) {
      return;
    }
    invoke<StartupMigrationStatus>("run_startup_migration")
      .catch((error: unknown) => {
        console.error("Startup migration failed", error);
      })
      .finally(() => setStartupReady(true));
  }, [isDebugCanvas]);

  return (
    <Theme
      appearance={theme}
      accentColor="blue"
      data-color-theme={colorTheme}
      grayColor="slate"
      panelBackground="translucent"
      radius="medium"
    >
      {isDebugCanvas ? (
        <DebugCanvasWindow />
      ) : (
        <div className="window-shell">
          <WindowTitlebar ready={startupReady} />
          <div className="window-shell-body">
            <App
              theme={theme}
              themePreference={themePreference}
              onThemeChange={handleThemePreferenceChange}
              colorTheme={colorTheme}
              colorThemeError={colorThemeError}
              onColorThemeReload={reloadColorTheme}
              onColorThemeChange={handleColorThemeChange}
              mysticCodeGender={mysticCodeGender}
              onMysticCodeGenderChange={handleMysticCodeGenderChange}
              startupReady={startupReady}
            />
          </div>
        </div>
      )}
    </Theme>
  );
}
