use crate::platform::{self, WindowChrome, WindowChromeAction};

#[tauri::command]
pub(crate) fn get_window_chrome(window: tauri::WebviewWindow) -> Result<WindowChrome, String> {
    platform::window_chrome(&window)
}

#[tauri::command]
pub(crate) fn window_chrome_action(
    window: tauri::WebviewWindow,
    action: WindowChromeAction,
) -> Result<(), String> {
    platform::apply_window_chrome_action(&window, action)
}
