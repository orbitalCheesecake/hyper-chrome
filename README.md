# Hyper Chrome Extension

## Install

1. Download the code as a ZIP and extract it, or clone the repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extracted project folder (normally `hyper-chrome-main` for a ZIP download).

The extension runs on regular HTTP and HTTPS pages. The browser does not allow extensions to run on Chrome internal pages such as `chrome://extensions`, the Chrome Web Store, or some PDF viewer pages.

## Use

Press **Right Shift** to open the ClickGUI. The GUI key can be changed in the settings. Right-click a module to set its keybind (including function keys, arrows, and modifier combinations such as Ctrl+Alt+K), or choose **No Keybind**. Modules can also be used from the GUI. The Theme & HUD panel includes built-in dark themes and lets you save and reuse custom themes. Configuration is stored per website in that site's local storage.

The Configs window contains a page search bar, Cookie Manager, Console Window, and AI Chat. The Cookie Manager can edit or delete cookies that are readable by the current page; Chrome intentionally keeps HttpOnly and other-domain cookies unavailable. The Console Window records messages emitted after Hyper Chrome loads.

HTML Lab can preview HTML safely or, when **Apply HTML to This Website** is enabled, save and restore the edited page body on later visits to that same site. Scripts in HTML Lab are never run; disable the override and reload to restore the original page.

AI Chat supports OpenAI, Groq, Google Gemini, and Anthropic APIs. Enter an API key and model ID in the chat window. The key stays only in the current tab and is sent directly to the selected provider; it is never stored in Hyper Chrome's configuration or included in config exports.





## Web Developer tools

The Modules, Visuals, and Configs windows include Web Developer tools grouped by CSS, Forms, Images, Information, Miscellaneous, Outline, and Resize & Tools. Click toggle tools to turn them on or off; click action tools to run them or open a report. Right-click any tool to assign a keybind.

Page scripts cannot clear Chrome history/cache, read full response headers, change Chrome's window size, or perform external validators/DNS lookups without browser-level permissions or a connected service. The corresponding tools explain these limitations in the GUI.
