//! Native window presentation and controls.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WindowChrome {
    custom_titlebar: bool,
    maximized: bool,
    title: String,
    version: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum WindowChromeAction {
    Minimize,
    ToggleMaximize,
    Close,
    StartDragging,
}

pub(crate) fn window_chrome(window: &tauri::WebviewWindow) -> Result<WindowChrome, String> {
    use tauri::Manager;
    Ok(WindowChrome {
        custom_titlebar: uses_custom_titlebar(window.label()),
        maximized: window.is_maximized().map_err(|err| err.to_string())?,
        title: window.title().map_err(|err| err.to_string())?,
        version: window.app_handle().package_info().version.to_string(),
    })
}

fn uses_custom_titlebar(label: &str) -> bool {
    cfg!(target_os = "windows") && label == "main"
}

pub(crate) fn apply_window_chrome_action(
    window: &tauri::WebviewWindow,
    action: WindowChromeAction,
) -> Result<(), String> {
    if !uses_custom_titlebar(window.label()) {
        return Err("当前窗口使用系统标题栏".into());
    }
    let result = match action {
        WindowChromeAction::Minimize => window.minimize(),
        WindowChromeAction::ToggleMaximize => {
            if window.is_maximized().map_err(|err| err.to_string())? {
                window.unmaximize()
            } else {
                window.maximize()
            }
        }
        WindowChromeAction::Close => window.close(),
        WindowChromeAction::StartDragging => window.start_dragging(),
    };
    result.map_err(|err| err.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn custom_titlebar_is_only_for_the_windows_main_window() {
        assert_eq!(uses_custom_titlebar("main"), cfg!(target_os = "windows"));
        assert!(!uses_custom_titlebar("debug-canvas"));
    }

    #[test]
    fn chrome_wire_shape_matches_frontend() {
        let chrome = WindowChrome {
            custom_titlebar: true,
            maximized: false,
            title: "Mash".into(),
            version: "0.15.0".into(),
        };
        assert_eq!(
            serde_json::to_value(chrome).unwrap(),
            serde_json::json!({
                "customTitlebar": true, "maximized": false, "title": "Mash", "version": "0.15.0"
            })
        );
        assert!(matches!(
            serde_json::from_str::<WindowChromeAction>("\"toggleMaximize\"").unwrap(),
            WindowChromeAction::ToggleMaximize
        ));
        assert!(serde_json::from_str::<WindowChromeAction>("\"unknown\"").is_err());
    }
}
