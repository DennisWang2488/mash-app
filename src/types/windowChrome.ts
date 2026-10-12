export interface WindowChrome {
  customTitlebar: boolean;
  maximized: boolean;
  title: string;
  version: string;
}

export type WindowChromeAction = "minimize" | "toggleMaximize" | "close" | "startDragging";
