import { act, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppThemeRoot } from "../AppThemeRoot";
import type { AppColorTheme, AppTheme, AppThemePreference } from "../types/theme";

const appProps: Array<{
  theme: AppTheme;
  themePreference: AppThemePreference;
  onThemeChange: (theme: AppThemePreference) => void;
  colorTheme?: AppColorTheme;
  onColorThemeChange: (value: AppColorTheme) => Promise<void>;
  colorThemeError?: string;
  onColorThemeReload: () => Promise<void>;
}> = [];

vi.mock("../App", () => ({
  default: (props: {
    theme: AppTheme;
    themePreference: AppThemePreference;
    onThemeChange: (theme: AppThemePreference) => void;
    colorTheme?: AppColorTheme;
    onColorThemeChange: (value: AppColorTheme) => Promise<void>;
    colorThemeError?: string;
    onColorThemeReload: () => Promise<void>;
  }) => {
    appProps.push(props);
    return <div>主界面已加载：{props.theme}/{props.themePreference}</div>;
  },
}));

vi.mock("../features/debug/DebugCanvasWindow", () => ({
  DebugCanvasWindow: () => <div>调试窗口已加载</div>,
}));

describe("AppThemeRoot", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockClear();
    appProps.length = 0;
  });

  it("loads the app immediately while startup migration runs in the background", () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "run_startup_migration") {
        return new Promise(() => {});
      }
      if (cmd === "get_app_theme") {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    render(<AppThemeRoot isDebugCanvas={false} />);

    expect(screen.getByText(/主界面已加载/)).toBeInTheDocument();
    expect(screen.queryByText("正在从 com.mash.app 迁移数据...")).not.toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("run_startup_migration");
  });

  it("skips startup migration for the debug canvas window", () => {
    render(<AppThemeRoot isDebugCanvas={true} />);

    expect(screen.getByText("调试窗口已加载")).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalledWith("run_startup_migration");
  });

  it("restores the saved app theme after startup", async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "get_app_theme") {
        return Promise.resolve("light");
      }
      return Promise.resolve(null);
    });

    render(<AppThemeRoot isDebugCanvas={false} />);

    expect(await screen.findByText("主界面已加载：light/light")).toBeInTheDocument();
  });

  it("uses the system theme when the saved app theme is system", async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "get_app_theme") {
        return Promise.resolve("system");
      }
      return Promise.resolve(null);
    });

    render(<AppThemeRoot isDebugCanvas={false} />);

    expect(await screen.findByText("主界面已加载：light/system")).toBeInTheDocument();
  });

  it("persists theme changes from the app shell", async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "get_app_theme") {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    render(<AppThemeRoot isDebugCanvas={false} />);

    appProps[appProps.length - 1]?.onThemeChange("system");

    expect(invoke).toHaveBeenCalledWith("set_app_theme", { theme: "system" });
  });

  it.each(["blue", "violet", "gold"] as const)("restores %s independently of appearance", async (colorTheme) => {
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_app_color_theme") return colorTheme;
      if (cmd === "get_app_theme") return "dark";
      return null;
    });
    const { container } = render(<AppThemeRoot isDebugCanvas={false} />);
    await waitFor(() => {
      expect(container.querySelector(".radix-themes")).toHaveAttribute("data-color-theme", colorTheme);
      expect(document.documentElement).toHaveAttribute("data-color-theme", colorTheme);
      expect(appProps[appProps.length - 1]?.theme).toBe("dark");
    });
  });

  it("applies a theme only after the backend confirms the saved value", async () => {
    let save!: (value: AppColorTheme) => void;
    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === "get_app_color_theme") return Promise.resolve("violet");
      if (cmd === "set_app_color_theme") return new Promise((resolve) => { save = resolve; });
      return Promise.resolve(null);
    });
    render(<AppThemeRoot isDebugCanvas={false} />);
    await waitFor(() => expect(appProps[appProps.length - 1]?.colorTheme).toBe("violet"));
    const changing = appProps[appProps.length - 1]!.onColorThemeChange("gold");
    expect(invoke).toHaveBeenCalledWith("set_app_color_theme", { value: "gold" });
    expect(appProps[appProps.length - 1]?.colorTheme).toBe("violet");
    await act(async () => { save("gold"); await changing; });
    expect(appProps[appProps.length - 1]?.colorTheme).toBe("gold");
  });

  it("keeps the current theme and reports a failed save to settings", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_app_color_theme") return "blue";
      if (cmd === "set_app_color_theme") throw new Error("无法保存界面设置");
      return null;
    });
    render(<AppThemeRoot isDebugCanvas={false} />);
    await waitFor(() => expect(appProps[appProps.length - 1]?.colorTheme).toBe("blue"));
    await expect(appProps[appProps.length - 1]!.onColorThemeChange("gold")).rejects.toThrow("无法保存界面设置");
    expect(appProps[appProps.length - 1]?.colorTheme).toBe("blue");
  });

  it("reports an unavailable theme command instead of leaving settings loading", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_app_color_theme") throw "Command get_app_color_theme not found";
      return null;
    });
    render(<AppThemeRoot isDebugCanvas={false} />);
    await waitFor(() => expect(appProps[appProps.length - 1]?.colorThemeError)
      .toBe("当前应用需要重启后才能使用主题配色。"));
    expect(appProps[appProps.length - 1]?.colorTheme).toBeUndefined();
  });

  it.each(["invalid response", "read failure"])("allows retry after %s and restores the saved theme", async (failure) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let attempt = 0;
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_app_color_theme") {
        if (attempt++ === 0) {
          if (failure === "read failure") throw new Error("read failed");
          return "unknown";
        }
        return "gold";
      }
      return null;
    });
    render(<AppThemeRoot isDebugCanvas={false} />);
    await waitFor(() => expect(appProps[appProps.length - 1]?.colorThemeError)
      .toBe("主题配色读取失败，请重试。"));
    await act(async () => { await appProps[appProps.length - 1]!.onColorThemeReload(); });
    expect(appProps[appProps.length - 1]?.colorThemeError).toBeUndefined();
    expect(appProps[appProps.length - 1]?.colorTheme).toBe("gold");
    expect(document.documentElement.dataset.colorTheme).toBe("gold");
  });
});
