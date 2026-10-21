# MagicX-Client Chrome Extension

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `magicx-client-extension` folder.

The extension runs on regular HTTP and HTTPS pages. The browser does not allow extensions to run on Chrome internal pages such as `chrome://extensions`, the Chrome Web Store, or some PDF viewer pages.

## Use

Press **Right Shift** to open the ClickGUI. The GUI key can be changed in the settings. Right-click a module to set its keybind (including function keys, arrows, and modifier combinations such as Ctrl+Alt+K), or choose **No Keybind**. Modules can also be used from the GUI. The Theme & HUD panel lets you customize the GUI palette, text, buttons, inputs, switches, editor highlighting, opacity, and scale. Configuration is stored per website in that site's local storage, matching the original userscript behavior.





## Web Developer tools

The Modules, Visuals, and Configs windows include Web Developer tools grouped by CSS, Forms, Images, Information, Miscellaneous, Outline, and Resize & Tools. Click toggle tools to turn them on or off; click action tools to run them or open a report. Right-click any tool to assign a keybind.

Page scripts cannot clear Chrome history/cache, read full response headers, change Chrome's window size, or perform external validators/DNS lookups without browser-level permissions or a connected service. The corresponding tools explain these limitations in the GUI.
