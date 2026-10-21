(() => {
  "use strict";

  if (window.__MagicXClientV4) return;
  window.__MagicXClientV4 = true;

  const STORE = "magicx-client-v4";

  const defaults = {
    accent: "#FFFFFF",
    gradient: "#303030",
    bg: "#000000",
    text: "#FFFFFF",
    border: "#FFFFFF",
    muted: "#B8B8B8",
    headerText: "#FFFFFF",
    buttonBg: "#161616",
    buttonText: "#FFFFFF",
    buttonHover: "#333333",
    controlBg: "#111111",
    switchOff: "#444444",
    switchKnob: "#FFFFFF",
    switchOnKnob: "#000000",
    syntax: {
      plain: "#EEEEEE", selector: "#80D8FF", property: "#C4A1FF",
      value: "#A5E3A1", string: "#FFC68A", comment: "#82768E",
      tag: "#FF9DC7", attr: "#C8B1FF", punct: "#B8AA87"
    },
    opacity: 100,
    scale: 100,
    guiKey: "ShiftRight",
    clock: {
      enabled: false, x: 20, y: 20, size: 16,
      color: "#FFFFFF", format: "24h", seconds: true
    },
    modules: {
      dark: false, animations: false, reader: false,
      inspector: false, links: false, images: false,
      hideImages: false, bigText: false, hideHeaders: false,
      customCSS: false, clock: false, imageReplace: false,
      textFix: false, linkWidget: false, serverESP: false, timer: false,
    },
    binds: { textFix: "AltRight", linkWidget: "KeyJ", serverESP: "KeyN" },
    options: {
      inspector: { color: "#FFFFFF" },
      links: { color: "#FFFFFF" },
      images: { color: "#FFFFFF" },
      bigText: { size: 120 },
      reader: { width: 850 },
      clock: { color: "#FFFFFF", size: 16 },
      imageReplace: { fit: "cover" },
      textFix: { hotkey: "AltRight" },
      linkWidget: { hotkey: "KeyJ", url: "" },
      serverESP: { hotkey: "KeyN", maxRows: 80 }
    },
    css: "",
    html: "<h2 style='color:#FFFFFF'>Hello MagicX!</h2>\n<p>Welcome to the HTML Lab.</p>",
    replacementImage: ""
  };

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (!saved || typeof saved !== "object") return clone(defaults);
      const config = {
        ...clone(defaults),
        ...saved,
        clock: { ...defaults.clock, ...(saved.clock || {}) },
        modules: { ...defaults.modules, ...(saved.modules || {}) },
        binds: { ...defaults.binds, ...(saved.binds || {}) },
        syntax: { ...defaults.syntax, ...(saved.syntax || {}) },
        options: {
          ...clone(defaults.options),
          ...(saved.options || {})
        }
      };
      // Upgrade the previous built-in palette while preserving user-picked colors.
      const oldPalette = {
        "#D5AD00": "#FFFFFF",
        "#15120a": "#000000",
        "#fff4cc": "#FFFFFF",
        "#806a12": "#FFFFFF"
      };
      for (const key of ["accent", "bg", "text", "border"]) {
        if (oldPalette[config[key]]) config[key] = oldPalette[config[key]];
      }
      if (config.gradient === "#000000") config.gradient = "#303030";
      if (config.opacity === 96) config.opacity = 100;
      if (config.clock.color === "#D5AD00") config.clock.color = "#FFFFFF";
      for (const key of ["inspector", "links", "images", "clock"]) {
        if (config.options[key]?.color === "#D5AD00") config.options[key].color = "#FFFFFF";
      }
      if (config.html === "<h2 style='color:#D5AD00'>Hello MagicX!</h2>\n<p>Welcome to the HTML Lab.</p>") {
        config.html = defaults.html;
      }
      return config;
    } catch {
      return clone(defaults);
    }
  }

  let cfg = loadConfig();
  let menuOpen = false;
  let waitingForKey = null;
  let inspectorTarget = null;
  let toastTimer;

  const host = document.createElement("div");
  host.id = "magicx-client";
  host.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  document.documentElement.appendChild(host);

  const root = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing:border-box }
    :host {
      --a:${cfg.accent}; --bg:${cfg.bg}; --fg:${cfg.text};
      --bd:${cfg.border}; --op:${cfg.opacity / 100};
      --gradient:${cfg.gradient};--muted:${cfg.muted};--header-text:${cfg.headerText};
      --button-bg:${cfg.buttonBg};--button-text:${cfg.buttonText};
      --button-hover:${cfg.buttonHover};--control-bg:${cfg.controlBg};
      --switch-off:${cfg.switchOff};--switch-knob:${cfg.switchKnob};--switch-on-knob:${cfg.switchOnKnob};
      --syntax-plain:${cfg.syntax.plain};--syntax-selector:${cfg.syntax.selector};
      --syntax-property:${cfg.syntax.property};--syntax-value:${cfg.syntax.value};
      --syntax-string:${cfg.syntax.string};--syntax-comment:${cfg.syntax.comment};
      --syntax-tag:${cfg.syntax.tag};--syntax-attr:${cfg.syntax.attr};--syntax-punct:${cfg.syntax.punct};
      color:var(--fg);font:13px Inter,Arial,sans-serif;
    }
    #gui { display:none;position:fixed;inset:0;pointer-events:none }
    #gui.open { display:block }
    #brand {
      position:absolute;top:14px;left:50%;
      transform:translateX(-50%);
      background:var(--bg);border:1px solid var(--bd);
      border-radius:12px;padding:12px 22px;text-align:center;
      box-shadow:0 8px 35px #0009;pointer-events:auto;
    }
    .logo { font-size:20px;font-weight:950;letter-spacing:1px;color:var(--a) }
    .sub { font-size:10px;letter-spacing:2px;color:var(--muted);margin-top:4px }
    .win {
      position:absolute;width:250px;max-width:calc(100vw - 12px);
      background:var(--bg);background:color-mix(in srgb,var(--bg) calc(var(--op)*100%),transparent);isolation:isolate;
      border:1px solid var(--bd);border-radius:9px;overflow:hidden;
      box-shadow:0 12px 35px #0009;pointer-events:auto;
      transform:scale(var(--scale,1));transform-origin:top left;
    }
    .wide { width:365px }
    .head {
      background:linear-gradient(100deg,var(--gradient),var(--bg));
      padding:12px;font-weight:900;cursor:move;
      color:var(--header-text);user-select:none;
      display:flex;justify-content:space-between;
    }
    .content { padding:8px;max-height:62vh;overflow:auto }
    .module {
      display:flex;align-items:center;justify-content:space-between;
      gap:8px;padding:10px 7px;border-radius:6px;cursor:pointer;
      user-select:none;
    }
    .module:hover { background:color-mix(in srgb,var(--a) 10%,transparent) }
    .module.on { background:color-mix(in srgb,var(--a) 14%,transparent) }
    .mname { font-size:12px;font-weight:850 }
    .desc { font-size:10px;color:var(--muted);margin-top:3px;line-height:1.4 }
    .switch { width:32px;height:18px;background:var(--switch-off);border-radius:20px;padding:3px;flex-shrink:0 }
    .switch:after { content:"";display:block;width:12px;height:12px;background:var(--switch-knob);border-radius:50% }
    .on .switch { background:var(--a) }
    .on .switch:after { background:var(--switch-on-knob);transform:translateX(14px) }
    .setting { padding:9px 5px;border-bottom:1px solid #ffffff12 }
    label { display:block;font-size:11px;font-weight:800;margin-bottom:7px }
    input[type=color] { width:100%;height:30px;border:0;background:transparent;cursor:pointer }
    input[type=range] { width:100%;accent-color:var(--a) }
    input[type=text],select {
      width:100%;padding:8px;background:var(--control-bg);color:var(--fg);
      border:1px solid var(--bd);border-radius:6px;
    }
    .btn {
      width:100%;padding:9px;margin:4px 0;background:var(--button-bg);
      border:1px solid var(--bd);border-radius:6px;cursor:pointer;
      color:var(--button-text);font-size:11px;font-weight:800;
    }
    .btn:hover { background:var(--button-hover) }
    .small { color:var(--muted);font-size:10px;line-height:1.6 }
    .editor {
      position:relative;height:220px;background:var(--control-bg);
      border:1px solid var(--bd);border-radius:6px;overflow:hidden;
    }
    .code,.code-input {
      position:absolute;inset:0;margin:0;padding:10px;width:100%;height:100%;
      overflow:auto;white-space:pre;tab-size:2;
      font:11px/1.55 Consolas,monospace;border:0;outline:0;
    }
    .code { pointer-events:none;color:var(--syntax-plain) }
    .code-input {
      resize:none;background:transparent;color:transparent;
      caret-color:white;-webkit-text-fill-color:transparent;
    }
    .code-input::selection { background:color-mix(in srgb,var(--a) 35%,transparent) }
    .token-selector { color:var(--syntax-selector) }
    .token-property { color:var(--syntax-property) }
    .token-value { color:var(--syntax-value) }
    .token-string { color:var(--syntax-string) }
    .token-comment { color:var(--syntax-comment) }
    .token-tag { color:var(--syntax-tag) }
    .token-attr { color:var(--syntax-attr) }
    .token-punct { color:var(--syntax-punct) }
    #toast {
      display:none;position:fixed;bottom:20px;left:50%;
      transform:translateX(-50%);background:var(--bg);color:var(--fg);
      border:1px solid var(--a);border-radius:8px;
      padding:11px 16px;box-shadow:0 5px 30px #0009;font-weight:bold;
    }
    #clock {
      display:none;position:fixed;z-index:1000000;
      background:var(--bg);border:1px solid var(--a);color:var(--fg);
      border-radius:8px;padding:9px 12px;font-weight:900;
      cursor:move;user-select:none;white-space:nowrap;pointer-events:auto;
    }
    #timer-hud {
  display: none;
  position: fixed;
  z-index: 1000001;
  min-width: 230px;
  background: var(--bg);
  border: 1px solid var(--a);
  border-radius: 10px;
  padding: 12px;
  font-weight: 900;
  box-shadow: 0 10px 35px #0009;
  user-select: none;
  pointer-events: auto;
}
#timer-hud.visible { display: block; }
#timer-hud .timer-display {
  font-size: 28px;
  text-align: center;
  color: var(--a);
  padding: 8px;
  font-variant-numeric: tabular-nums;
}
#timer-hud button {
  background: var(--button-bg);
  border: 1px solid var(--bd);
  border-radius: 5px;
  padding: 7px;
  margin: 2px;
  color: var(--button-text);
  cursor: pointer;
}
#timer-hud input {
  width: 100%;
  background: var(--control-bg);
  color: var(--fg);
  border: 1px solid var(--bd);
  border-radius: 5px;
  padding: 7px;
}
    #clock.visible { display:block }
    .floating {
      position:fixed;left:18%;top:18%;width:460px;height:330px;min-width:260px;min-height:180px;
      resize:both;overflow:hidden;background:var(--bg);color:var(--fg);border:1px solid var(--a);
      border-radius:10px;box-shadow:0 15px 45px #000b;pointer-events:auto;z-index:2147483646;
    }
    .floating .float-head {height:36px;display:flex;align-items:center;justify-content:space-between;
      gap:8px;padding:7px 10px;background:linear-gradient(100deg,var(--gradient),var(--bg));color:var(--header-text);
      font-weight:900;cursor:move;user-select:none}
    .float-actions {display:flex;gap:5px}
    .float-actions button {background:var(--button-bg);color:var(--button-text);border:1px solid var(--bd);border-radius:5px;cursor:pointer;padding:3px 7px}
    .floating .float-body {height:calc(100% - 36px);overflow:auto;padding:8px}
    .floating iframe {width:100%;height:100%;border:0;background:white}
    .floating.fullscreen {left:0!important;top:0!important;width:100vw!important;height:100vh!important;
      resize:none;border-radius:0;animation:mx-expand .28s ease-out}
    @keyframes mx-expand {from{transform:scale(.82);opacity:.65}to{transform:scale(1);opacity:1}}
    .floating .float-url {width:100%;padding:8px;background:var(--control-bg);color:var(--fg);border:1px solid var(--bd);border-radius:6px}
    .net-row {font:11px/1.45 Consolas,monospace;padding:6px;border-bottom:1px solid #ffffff16;overflow-wrap:anywhere}
    .net-row b {color:var(--a)}
    #preview {
      width:100%;height:200px;background:white;
      border:1px solid var(--bd);border-radius:6px;
    }
    #settings-modal {
      display:none;position:fixed;inset:0;background:#0009;
      align-items:center;justify-content:center;pointer-events:auto;
    }
    #settings-modal.open { display:flex }
    .modal-box {
      width:330px;max-width:95vw;max-height:80vh;overflow:auto;
      background:var(--bg);border:1px solid var(--a);border-radius:10px;
      padding:12px;box-shadow:0 15px 55px #000b;
    }
    .modal-title { font-size:15px;font-weight:900;color:var(--a);padding:5px 0 12px }
    @media(max-width:700px) {
      .wide { width:calc(100vw - 12px) }
      .content { max-height:45vh }
    }
  `;
  root.appendChild(style);

  const gui = document.createElement("div");
  gui.id = "gui";
  root.appendChild(gui);

  const brand = document.createElement("div");
  brand.id = "brand";
  brand.innerHTML =
    '<div class="logo">✦ HYPER CHROME ✦</div><div class="sub">chromium web tools v4</div>';
  gui.appendChild(brand);

  const toast = document.createElement("div");
  toast.id = "toast";
  root.appendChild(toast);

  const clock = document.createElement("div");
  clock.id = "clock";
  clock.textContent = "00:00:00";
  root.appendChild(clock);
  // ===== HYPER CHROME TIMER HUD =====
const timerHud = document.createElement("div");
timerHud.id = "timer-hud";
timerHud.innerHTML = `
  <div style="cursor:move;text-align:center;color:var(--a);margin-bottom:8px">
    ⏱ HYPER CHROME TIMER
  </div>
  <div class="timer-display">00:00</div>
  <div style="display:flex;gap:4px;margin:6px 0">
    <input class="timer-minutes" type="number" min="0" max="999" value="5" title="Minuten">
    <input class="timer-seconds" type="number" min="0" max="59" value="0" title="Sekunden">
  </div>
  <label style="display:block;margin:6px 0">
    MP3-Klingelton
    <input class="timer-audio-file" type="file" accept="audio/mpeg,.mp3">
  </label>
  <div style="text-align:center">
    <button class="timer-start">▶ Start</button>
    <button class="timer-pause">Ⅱ Pause</button>
    <button class="timer-reset">↺ Reset</button>
  </div>
`;
root.appendChild(timerHud);

let timerInterval = null;
let timerRemaining = 0;
let timerEndAt = 0;
let timerAudio = null;
let timerAudioUrl = null;
let timerRunning = false;
let timerFinished = false;

const timerDisplay = timerHud.querySelector(".timer-display");
const timerMinutes = timerHud.querySelector(".timer-minutes");
const timerSeconds = timerHud.querySelector(".timer-seconds");
const timerFile = timerHud.querySelector(".timer-audio-file");

function timerFormat(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return String(min).padStart(2,"0") + ":" +
         String(sec).padStart(2,"0");
}

function timerRender() {
  timerDisplay.textContent = timerFormat(timerRemaining);
}

function timerStopInterval() {
  if (timerInterval !== null) clearInterval(timerInterval);
  timerInterval = null;
}

function timerTick() {
  timerRemaining = Math.max(0, timerEndAt - Date.now());
  timerRender();

  if (timerRemaining <= 0) {
    timerStopInterval();
    timerRunning = false;
    timerFinished = true;
    timerDisplay.textContent = "00:00";
    if (timerAudio) {
      timerAudio.currentTime = 0;
      timerAudio.loop = true;
      timerAudio.play().catch(() =>
        notify("Klicke auf Start, um den Ton freizugeben")
      );
    } else {
      notify("⏱ Timer abgelaufen!");
    }
  }
}

timerHud.querySelector(".timer-start").addEventListener("click", async () => {
  if (timerRunning) return;

  if (timerFinished) {
    if (timerAudio) {
      timerAudio.pause();
      timerAudio.currentTime = 0;
      timerAudio.loop = false;
    }
    timerFinished = false;
  }

  if (timerRemaining <= 0) {
    const mins = Math.max(0, Math.min(999,
      Number(timerMinutes.value) || 0));
    const secs = Math.max(0, Math.min(59,
      Number(timerSeconds.value) || 0));
    const duration = (mins * 60 + secs) * 1000;

    if (duration <= 0) {
      notify("Bitte eine Timer-Dauer einstellen");
      return;
    }
    timerRemaining = duration;
  }

  if (timerAudio) {
    try {
      timerAudio.loop = false;
      await timerAudio.play();
      timerAudio.pause();
      timerAudio.currentTime = 0;
    } catch {}
  }

  timerEndAt = Date.now() + timerRemaining;
  timerRunning = true;
  timerStopInterval();
  timerInterval = setInterval(timerTick, 200);
  timerTick();
});

timerHud.querySelector(".timer-pause").addEventListener("click", () => {
  if (!timerRunning) return;
  timerRemaining = Math.max(0, timerEndAt - Date.now());
  timerRunning = false;
  timerStopInterval();
  timerRender();
});

timerHud.querySelector(".timer-reset").addEventListener("click", () => {
  timerRunning = false;
  timerFinished = false;
  timerStopInterval();
  if (timerAudio) {
    timerAudio.pause();
    timerAudio.currentTime = 0;
    timerAudio.loop = false;
  }
  timerRemaining = 0;
  timerRender();
});

timerFile.addEventListener("change", () => {
  const file = timerFile.files && timerFile.files[0];
  if (!file) return;

  if (file.type !== "audio/mpeg" && !/\.mp3$/i.test(file.name)) {
    notify("Bitte eine MP3-Datei auswählen");
    timerFile.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    notify("Die MP3 darf höchstens 10 MB groß sein");
    timerFile.value = "";
    return;
  }

  if (timerAudioUrl) URL.revokeObjectURL(timerAudioUrl);
  timerAudioUrl = URL.createObjectURL(file);
  timerAudio = new Audio(timerAudioUrl);
  timerAudio.loop = false;
  notify("Timer-Klingelton geladen");
});

// Dragging the Timer HUD
const timerHead = timerHud.firstElementChild;
let timerDrag = null;

timerHead.addEventListener("pointerdown", e => {
  const r = timerHud.getBoundingClientRect();
  timerDrag = {x:e.clientX-r.left,y:e.clientY-r.top};
  timerHead.setPointerCapture(e.pointerId);
  e.preventDefault();
});

timerHead.addEventListener("pointermove", e => {
  if (!timerDrag) return;
  timerHud.style.left = Math.max(0,e.clientX-timerDrag.x)+"px";
  timerHud.style.top = Math.max(0,e.clientY-timerDrag.y)+"px";
  timerHud.style.right = "auto";
});

timerHead.addEventListener("pointerup", () => timerDrag = null);
timerHead.addEventListener("pointercancel", () => timerDrag = null);

timerRender();

  const effects = document.createElement("style");
  effects.id = "magicx-page-effects";
  document.head.appendChild(effects);

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(cfg)); }
    catch (e) { console.warn("[MagicX] Config save failed", e); }
  }

  function notify(message) {
    toast.textContent = message;
    toast.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.style.display = "none", 1800);
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"]/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"
    })[c]);
  }

  function highlightCSS(code) {
    return escapeHTML(code)
      .replace(/(\/\*[\s\S]*?\*\/)/g,'<span class="token-comment">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,'<span class="token-string">$1</span>')
      .replace(/([^{};\n]+)(\s*\{)/g,'<span class="token-selector">$1</span>$2')
      .replace(/([\w-]+)(\s*:)([^;{}]*)/g,
        '<span class="token-property">$1</span>$2<span class="token-value">$3</span>');
  }

  function highlightHTML(code) {
    return escapeHTML(code)
      .replace(/(&lt;\/?)([\w-]+)/g,'<span class="token-punct">$1</span><span class="token-tag">$2</span>')
      .replace(/([\w-]+)(=)/g,'<span class="token-attr">$1</span>$2')
      .replace(/(&quot;[^&]*?&quot;)/g,'<span class="token-string">$1</span>');
  }

  function makeEditor(value, mode, changed) {
    const wrap = document.createElement("div");
    wrap.className = "editor";
    const pre = document.createElement("pre");
    pre.className = "code";
    const input = document.createElement("textarea");
    input.className = "code-input";    input.spellcheck = false;
    input.wrap = "off";
    input.value = value;

    function paint() {
      pre.innerHTML = (mode === "html" ? highlightHTML : highlightCSS)(input.value) + "\n";
      pre.scrollTop = input.scrollTop;
      pre.scrollLeft = input.scrollLeft;
    }

    input.addEventListener("input", () => {
      paint();
      changed(input.value);
    });
    input.addEventListener("scroll", () => {
      pre.scrollTop = input.scrollTop;
      pre.scrollLeft = input.scrollLeft;
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Tab") {
        e.preventDefault();
        input.setRangeText("  ", input.selectionStart, input.selectionEnd, "end");
        input.dispatchEvent(new Event("input", { bubbles:true }));
      }
    });

    wrap.append(pre, input);
    paint();
    return { wrap, input, paint };
  }

  function makeWindow(title, x, y, wide = false) {
    const win = document.createElement("section");
    win.className = "win" + (wide ? " wide" : "");
    win.style.left = x + "px";
    win.style.top = y + "px";
    win.style.setProperty("--scale", cfg.scale / 100);

    const head = document.createElement("div");
    head.className = "head";
    const titleSpan = document.createElement("span");
    titleSpan.textContent = title;
    const iconSpan = document.createElement("span");
    iconSpan.textContent = "✦";
    head.append(titleSpan, iconSpan);

    const content = document.createElement("div");
    content.className = "content";
    win.append(head, content);
    gui.appendChild(win);

    let drag = null;
    head.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      const r = win.getBoundingClientRect();
      drag = { x:e.clientX-r.left, y:e.clientY-r.top };
      head.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    head.addEventListener("pointermove", e => {
      if (!drag) return;
      win.style.left = Math.max(0, Math.min(innerWidth-70, e.clientX-drag.x)) + "px";
      win.style.top = Math.max(0, Math.min(innerHeight-35, e.clientY-drag.y)) + "px";
    });
    head.addEventListener("pointerup", () => drag = null);
    head.addEventListener("pointercancel", () => drag = null);
    return content;
  }

  const modulesPanel = makeWindow("⚡ MODULES", 12, 100);
  const visualPanel = makeWindow("◈ VISUALS", 275, 100);
  const themePanel = makeWindow("🎨 THEME & HUD", 538, 100);
  const cssPanel = makeWindow("⌘ CSS EDITOR", 801, 100, true);
  const htmlPanel = makeWindow("〈 HTML LAB", 801, 380, true);
  const configPanel = makeWindow("▣ CONFIGS", 275, 380);

  const moduleInfo = {
    dark: ["Dark Mode","Invert page colors"],
    animations: ["No Animations","Disable CSS animation and transitions"],
    reader: ["Reader Mode","Limit article width and improve line spacing"],
    inspector: ["Element Inspector","Highlight the element under the mouse"],
    links: ["Link ESP","Outline links"],
    images: ["Image ESP","Outline images"],
    hideImages: ["Hide Images","Hide page images"],
    bigText: ["Big Text","Increase text size"],
    hideHeaders: ["Hide Headers","Hide common page headers"],
    customCSS: ["Custom CSS","Apply your CSS editor code"],
    clock: ["Clock HUD","Show a customizable clock"],
    timer: ["Timer HUD","Countdown with a custom MP3 alarm"],
    imageReplace: ["Image Replacer","Replace page images with your JPG"],
    textFix: ["Text Fix","Edit selected text and apply a correction"],
    linkWidget: ["Link Widget","Open a movable website widget"],
    serverESP: ["Server ESP","Observe page network requests and resource URLs"]
  };

  const webDeveloperTools = [
    ["CSS","devDisableAllStyles","Disable All Styles","Turn page stylesheets off and restore them on the next click","toggle"],
    ["CSS","devDisableBrowserDefaults","Disable Browser Default Styles","Reset common browser default margins and control styles","toggle"],
    ["CSS","devDisableEmbeddedStyles","Disable Embedded Styles","Toggle style elements in the page head","toggle"],
    ["CSS","devDisableInlineStyles","Disable Inline Styles","Toggle style attributes on page elements","toggle"],
    ["CSS","devDisableLinkedStyles","Disable Linked Stylesheets","Toggle linked CSS files","toggle"],
    ["CSS","devDisablePrintStyles","Disable Print Styles","Toggle print-only stylesheets","toggle"],
    ["CSS","devShowPrintStyles","Display Print Styles","Apply print media styles on screen","toggle"],
    ["CSS","devShowHandheldStyles","Display Handheld Styles","Apply handheld media styles","toggle"],
    ["CSS","devBorderBox","Use Border Box Model","Apply border-box sizing to page elements","toggle"],
    ["CSS","devViewCSS","View CSS","List stylesheets and inline style blocks","action"],
    ["CSS","devReloadStyles","Reload Linked Stylesheets","Reload linked stylesheets on this page","action"],

    ["Forms","devCheckAll","Check All Checkboxes","Check every checkbox","action"],
    ["Forms","devUncheckAll","Uncheck All Checkboxes","Uncheck every checkbox","action"],
    ["Forms","devClearFields","Clear Form Fields","Clear text, date, and selection fields","action"],
    ["Forms","devClearRadios","Clear Radio Buttons","Clear radio selections","action"],
    ["Forms","devGetToPost","Convert GET Forms to POST","Change GET forms to POST","action"],
    ["Forms","devPostToGet","Convert POST Forms to GET","Change POST forms to GET","action"],
    ["Forms","devSelectToText","Convert Selects to Text","Replace select controls with editable text fields","action"],
    ["Forms","devInputToTextarea","Convert Text Inputs to Textareas","Replace text inputs with textareas","action"],
    ["Forms","devFormDetails","Display Form Details","Show form methods, actions, and field counts","action"],
    ["Forms","devDisplayPasswords","Display Passwords","Reveal password fields","action"],
    ["Forms","devEnableAutocomplete","Enable Auto Completion","Enable autocomplete on forms and fields","action"],
    ["Forms","devEnableFields","Enable Form Fields","Enable disabled form controls","action"],
    ["Forms","devPopulateFields","Populate Form Fields","Fill fields with generic test values","action"],
    ["Forms","devRemoveValidation","Remove Form Validation","Disable native required and validity checks","action"],
    ["Forms","devRemoveMaxlength","Remove Maximum Lengths","Remove maxlength limits from fields","action"],

    ["Images","devDisableImages","Disable Images","Hide image elements on the current page","toggle"],
    ["Images","devDisplayAlt","Display Alt Attributes","Add image alt text to image tooltips","action"],
    ["Images","devImageDimensions","Display Image Dimensions","Add rendered image dimensions to tooltips","action"],
    ["Images","devImagePaths","Display Image Paths","Add image source URLs to tooltips","action"],
    ["Images","devBrokenImages","Find Broken Images","Outline failed image loads","action"],
    ["Images","devHideBackgrounds","Hide Background Images","Hide CSS background images","toggle"],
    ["Images","devFullSizeImages","Make Images Full Size","Show images at their natural dimensions","toggle"],
    ["Images","devInvisibleImages","Make Images Invisible","Keep image layout space but hide pixels","toggle"],
    ["Images","devOutlineImages","Outline Images","Outline all image elements","toggle"],
    ["Images","devReloadImages","Reload Images","Reload image URLs on this page","action"],
    ["Images","devReplaceAlt","Replace Images with Alt Text","Hide images and show their alt text","toggle"],
    ["Images","devImageInfo","View Image Information","List image paths, alt text, dimensions, and load state","action"],

    ["Information","devAbbreviations","Display Abbreviations","Reveal title text from abbreviation elements","action"],
    ["Information","devAccessKeys","Display Access Keys","Show accesskey values on elements","action"],
    ["Information","devAnchors","Display Anchors","Highlight named anchors","toggle"],
    ["Information","devAriaRoles","Display ARIA Roles","Show ARIA roles and labels","action"],
    ["Information","devElementInfo","Display Element Information","Show tag, id, classes, and dimensions for page elements","action"],
    ["Information","devIdClass","Display ID and Class Details","Label elements with IDs and classes","toggle"],
    ["Information","devLinkInfo","Display Link Details","Add target URLs to link tooltips","action"],
    ["Information","devAnchorInfo","View Anchor Information","List anchors and their targets","action"],
    ["Information","devColorInfo","View Color Information","List colors used by page elements","action"],
    ["Information","devDocumentOutline","View Document Outline","List headings in document order","action"],
    ["Information","devJavaScriptInfo","View JavaScript","List external scripts and inline script sizes","action"],
    ["Information","devCookieInfo","View Cookie Information","Show cookies visible to this page","action"],
    ["Information","devMetaInfo","View Meta Tag Information","List document meta tags","action"],
    ["Information","devHeaderInfo","View Response Headers","Show response headers when available","action"],

    ["Miscellaneous","devClearCache","Clear Cache","Chrome restricts cache clearing from a page script","action"],
    ["Miscellaneous","devClearHistory","Clear History","Chrome restricts history clearing from a page script","action"],
    ["Miscellaneous","devColorPicker","Display Color Picker","Pick a color from the page when EyeDropper is supported","action"],
    ["Miscellaneous","devShowHidden","Display Hidden Elements","Reveal elements hidden with display:none","toggle"],
    ["Miscellaneous","devLineGuides","Display Line Guides","Show horizontal and vertical page guides","toggle"],
    ["Miscellaneous","devRuler","Display Ruler","Show a draggable pixel ruler","toggle"],
    ["Miscellaneous","devLinearize","Linearize Page","Display page content in a single column","toggle"],
    ["Miscellaneous","devResizableFrames","Make Frames Resizable","Allow resizing iframe elements","toggle"],
    ["Miscellaneous","devMarkLinks","Mark All Links","Mark links by destination and visited status where available","toggle"],

    ["Outline","devOutlineBlocks","Outline Block Elements","Outline common block-level elements","toggle"],
    ["Outline","devOutlineDeprecated","Outline Deprecated Elements","Outline legacy/deprecated HTML elements","toggle"],
    ["Outline","devOutlineExternal","Outline External Links","Outline links to other hostnames","toggle"],
    ["Outline","devOutlinePositioned","Outline Positioned Elements","Outline absolute, fixed, and sticky elements","toggle"],
    ["Outline","devOutlineFloated","Outline Floated Elements","Outline floated elements","toggle"],
    ["Outline","devOutlineFrames","Outline Frames","Outline iframe and frame elements","toggle"],
    ["Outline","devOutlineHeadings","Outline Headings","Outline headings and expose their level","toggle"],
    ["Outline","devOutlineInsecure","Outline Non-Secure Elements","Outline HTTP resources on HTTPS pages","toggle"],
    ["Outline","devOutlineTables","Outline Tables","Outline tables, rows, and cells","toggle"],
    ["Outline","devTagNames","Show Element Tag Names","Show tag labels next to page elements","toggle"],

    ["Resize & Tools","devViewportSize","Display Window Size","Show the current viewport dimensions","toggle"],
    ["Resize & Tools","devResizeWindow","Resize Window","Open responsive size presets (page scripts cannot resize Chrome itself)","action"],
    ["Resize & Tools","devResponsiveLayouts","View Responsive Layouts","Show common mobile and tablet viewport widths","action"],
    ["Resize & Tools","devEditResizeSizes","Edit Resize Dimensions","Show the responsive viewport presets","action"],
    ["Resize & Tools","devValidateCSS","Validate Local CSS","Check page stylesheet rules for parse errors","action"],
    ["Resize & Tools","devValidateHTML","Validate Local HTML","Check common local markup issues","action"],
    ["Resize & Tools","devValidateFeed","Validate Feed","Open feed validation guidance","action"],
    ["Resize & Tools","devValidateAccessibility","Validate Accessibility","Run basic local accessibility checks","action"],
    ["Resize & Tools","devValidateLinks","Validate Links","Check same-page links for missing targets","action"],
    ["Resize & Tools","devValidateStructuredData","Validate Structured Data","List structured data blocks for review","action"],
    ["Resize & Tools","devDNS","View DNS Records","DNS lookup needs an external service","action"],
    ["Resize & Tools","devViewSource","View Source","Show the current page DOM source","action"]
  ];
  const developerToggles = new Set(webDeveloperTools.filter(item => item[4] === "toggle").map(item => item[1]));
  const developerActions = new Set(webDeveloperTools.filter(item => item[4] === "action").map(item => item[1]));
  const developerStyleRules = {
    devBorderBox: "*,*::before,*::after{box-sizing:border-box!important}",
    devDisableBrowserDefaults: "html,body,h1,h2,h3,h4,h5,h6,p,blockquote,figure,ul,ol,dl,dd,fieldset,legend,button,input,select,textarea{margin:0!important;padding:0!important;border-radius:0!important;font:inherit!important}button,input,select,textarea{appearance:none!important}",
    devDisableImages: "img,picture,svg,video{visibility:hidden!important}",
    devHideBackgrounds: "*{background-image:none!important}",
    devFullSizeImages: "img{width:auto!important;height:auto!important;max-width:none!important;max-height:none!important}",
    devInvisibleImages: "img{visibility:hidden!important}",
    devOutlineImages: "img,picture,svg{outline:2px solid #00aaff!important;outline-offset:1px!important}",
    devReplaceAlt: "img[data-mx-replace-alt]{display:none!important}.mx-dev-alt{display:inline-block!important;padding:4px 7px!important;background:#fff3cd!important;color:#111!important;border:1px dashed #555!important;font:12px/1.4 monospace!important}",
    devAnchors: "a[id],a[name]{outline:2px solid #ff7b00!important;outline-offset:2px!important}",
    devIdClass: "[data-mx-dev-idclass]::after{content:attr(data-mx-dev-idclass);position:absolute;z-index:2147483000;background:#111;color:#fff;font:10px monospace;padding:2px 4px;pointer-events:none}",
    devShowHidden: "[data-mx-hidden='1']{display:revert!important;visibility:visible!important;opacity:1!important}",
    devLinearize: "html body,html body *{float:none!important;position:static!important;display:block!important;width:auto!important;max-width:none!important;columns:auto!important;transform:none!important}",
    devResizableFrames: "iframe,frame{resize:both!important;overflow:auto!important}",
    devMarkLinks: "a[href]{outline:1px solid #13a10e!important;outline-offset:1px!important}",
    devOutlineBlocks: "address,article,aside,blockquote,body,dd,div,dl,dt,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hr,li,main,nav,ol,p,pre,section,table,ul{outline:1px solid #e74856!important}",
    devOutlineDeprecated: "acronym,big,center,font,marquee, strike,tt{outline:2px solid #ff7b00!important}",
    devOutlineExternal: "a[data-mx-dev-external]{outline:2px solid #a855f7!important}",
    devOutlinePositioned: "[style*='position: absolute'],[style*='position:absolute'],[style*='position: fixed'],[style*='position:fixed'],[style*='position: sticky'],[style*='position:sticky']{outline:2px solid #00aaff!important}",
    devOutlineFloated: "[style*='float: left'],[style*='float:left'],[style*='float: right'],[style*='float:right']{outline:2px solid #ff7b00!important}",
    devOutlineFrames: "iframe,frame{outline:2px solid #a855f7!important}",
    devOutlineHeadings: "h1,h2,h3,h4,h5,h6{outline:2px solid #e74856!important}",
    devOutlineInsecure: "[src^='http://'],[href^='http://']{outline:2px solid #ff3b30!important}",
    devOutlineTables: "table,tr,th,td{outline:1px solid #00aaff!important}",
    devTagNames: ""
  };
  for (const [category,id,label,description] of webDeveloperTools) {
    moduleInfo[id] = [label,description];
    if (!(id in cfg.modules)) cfg.modules[id] = false;
  }

  const rows = {};
  const settingsModal = document.createElement("div");
  settingsModal.id = "settings-modal";
  settingsModal.innerHTML =
    '<div class="modal-box"><div class="modal-title">Module Settings</div><div class="modal-content"></div><button class="btn close-settings">Close</button></div>';
  root.appendChild(settingsModal);
  const modalContent = settingsModal.querySelector(".modal-content");
  settingsModal.querySelector(".close-settings").addEventListener("click", () => {
    settingsModal.classList.remove("open");
  });

  function addSetting(panel, title, el) {
    const box = document.createElement("div");
    box.className = "setting";
    const label = document.createElement("label");
    label.textContent = title;
    box.append(label, el);
    panel.appendChild(box);
    return box;
  }

  function colorControl(panel, title, get, set) {
    const input = document.createElement("input");
    input.type = "color";
    input.value = get();
    addSetting(panel, title, input);
    input.addEventListener("input", () => {
      set(input.value);
      applyTheme();
      save();
      applyModules();
    });
    return input;
  }

  function rangeControl(panel, title, min, max, get, set) {
    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.value = get();
    const box = addSetting(panel, title, input);
    const readout = document.createElement("div");
    readout.className = "small";
    readout.textContent = input.value;
    box.appendChild(readout);
    input.addEventListener("input", () => {
      readout.textContent = input.value;
      set(Number(input.value));
      applyTheme();
      save();
      applyModules();
    });
    return input;
  }

  function button(panel, text, action) {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = text;
    b.addEventListener("click", action);
    panel.appendChild(b);
    return b;
  }

  function openModuleSettings(id) {
    modalContent.replaceChildren();
    const title = document.createElement("div");
    title.className = "small";
    title.textContent = "Customize " + moduleInfo[id][0] +
      ". Right-click the module again to reopen these settings.";
    modalContent.appendChild(title);

    const currentBind = cfg.binds[id] || "";
    const bindButton = button(modalContent,
      "Set Keybind: " + (currentBind || "None"), () => {
        waitingForKey = { type:"module", id, button:bindButton };
        bindButton.textContent = "Press a key or combination...";
        notify("Press any key or combination for " + moduleInfo[id][0]);
      });
    button(modalContent,"No Keybind",() => {
      cfg.binds[id] = "";
      save();
      openModuleSettings(id);
      notify("Keybind removed");
    });

    if (id === "inspector") {
      colorControl(modalContent,"Highlight Color",
        () => cfg.options.inspector.color,
        v => cfg.options.inspector.color = v);
    }

    if (id === "links") {
      colorControl(modalContent,"Link Outline Color",
        () => cfg.options.links.color,
        v => cfg.options.links.color = v);
    }

    if (id === "images") {
      colorControl(modalContent,"Image Outline Color",
        () => cfg.options.images.color,
        v => cfg.options.images.color = v);
    }

    if (id === "bigText") {
      rangeControl(modalContent,"Text Scale (%)",100,200,
        () => cfg.options.bigText.size,
        v => cfg.options.bigText.size = v);
    }

    if (id === "reader") {
      rangeControl(modalContent,"Maximum Text Width (px)",450,1400,
        () => cfg.options.reader.width,
        v => cfg.options.reader.width = v);
    }

    if (id === "clock") {
      colorControl(modalContent,"Clock Color",
        () => cfg.clock.color,
        v => { cfg.clock.color = v; cfg.options.clock.color = v; });
      rangeControl(modalContent,"Clock Size",10,36,
        () => cfg.clock.size,
        v => { cfg.clock.size = v; cfg.options.clock.size = v; });
      rangeControl(modalContent,"Clock Horizontal Position (%)",0,100,
        () => cfg.clock.x, v => cfg.clock.x = v);
      rangeControl(modalContent,"Clock Vertical Position (%)",0,100,
        () => cfg.clock.y, v => cfg.clock.y = v);

      const format = document.createElement("select");
      [["24h","24-hour"],["12h","12-hour"]].forEach(([v,t]) => {
        const o = document.createElement("option");
        o.value = v; o.textContent = t; format.appendChild(o);
      });
      format.value = cfg.clock.format;
      addSetting(modalContent,"Time Format",format);
      format.addEventListener("change",() => {
        cfg.clock.format = format.value; save(); updateClock();
      });

      button(modalContent,"Toggle Seconds: " + (cfg.clock.seconds ? "ON" : "OFF"),e => {
        cfg.clock.seconds = !cfg.clock.seconds;
        e.currentTarget.textContent = "Toggle Seconds: " + (cfg.clock.seconds ? "ON" : "OFF");
        save(); updateClock();
      });
    }

    if (id === "imageReplace") {
      const help = document.createElement("div");
      help.className = "small";
      help.textContent = "Choose a JPG/JPEG image. While the module is enabled, page images are replaced with your chosen picture.";
      modalContent.appendChild(help);

      const file = document.createElement("input");
      file.type = "file";
      file.accept = ".jpg,.jpeg,image/jpeg";
      file.style.width = "100%";
      addSetting(modalContent,"Replacement JPG",file);

      file.addEventListener("change",() => {
        const f = file.files && file.files[0];
        if (!f) return;
        if (f.type !== "image/jpeg") {
          notify("Please select a JPG/JPEG image");
          file.value = "";
          return;
        }
        if (f.size > 4 * 1024 * 1024) {
          notify("Please choose a JPG under 4 MB");
          file.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          cfg.replacementImage = String(reader.result);
          save();
          applyModules();
          notify("Replacement image saved");
        };
        reader.readAsDataURL(f);
      });

      const fit = document.createElement("select");
      [["cover","Cover"],["contain","Contain"],["fill","Stretch"]].forEach(([v,t]) => {
        const o = document.createElement("option");
        o.value = v; o.textContent = t; fit.appendChild(o);
      });
      fit.value = cfg.options.imageReplace.fit;
      addSetting(modalContent,"Image Fit",fit);
      fit.addEventListener("change",() => {
        cfg.options.imageReplace.fit = fit.value;
        save(); applyModules();
      });

      const status = document.createElement("div");
      status.className = "small";
      status.textContent = cfg.replacementImage
        ? "A replacement image is saved." : "No replacement image selected yet.";
      modalContent.appendChild(status);
      button(modalContent,"Remove Saved JPG",() => {
        cfg.replacementImage = "";
        save(); applyModules(); openModuleSettings(id);
      });
    }

    if (id === "textFix") {
      const tip = document.createElement("div");
      tip.className = "small";
      tip.textContent = "Markiere Text auf der Seite und öffne Text Fix über die Module-GUI oder einen optionalen Keybind. Nutze die Rechtschreibvorschläge des Browsers, bearbeite den Text und wähle Apply. Der Text wird nicht an einen externen Dienst gesendet.";
      modalContent.appendChild(tip);
    }    if (id === "linkWidget") {
      const urlInput = document.createElement("input");
      urlInput.type = "text"; urlInput.placeholder = "https://example.com";
      urlInput.value = cfg.options.linkWidget.url || "";
      addSetting(modalContent,"Website URL",urlInput);
      button(modalContent,"Save URL & Open Widget",() => {
        const value = urlInput.value.trim();
        if (!/^https?:\/\//i.test(value)) { notify("Please enter a full http(s) URL"); return; }
        cfg.options.linkWidget.url = value; save(); toggleLinkWidget(true);
      });
      const tip = document.createElement("div");
      tip.className = "small";
      tip.textContent = "Some sites block iframe embedding. Use the ↗ button to open the site in a new tab when embedding is blocked.";
      modalContent.appendChild(tip);
    }

    if (id === "serverESP") {
      rangeControl(modalContent,"Maximum log entries",20,200,
        () => cfg.options.serverESP.maxRows,
        v => { cfg.options.serverESP.maxRows = v; renderNetworkLog(); });
      button(modalContent,"Clear Network Log",() => { networkLog.length = 0; renderNetworkLog(); });
      const tip = document.createElement("div");
      tip.className = "small";
      tip.textContent = "Shows observable request URLs and resource timing metadata only; it does not capture request bodies, passwords or cookies.";
      modalContent.appendChild(tip);
    }

    if (id === "customCSS") {
      const tip = document.createElement("div");
      tip.className = "small";
      tip.textContent = "Edit CSS in the CSS EDITOR window. Enable the module to apply it.";
      modalContent.appendChild(tip);
    }

    settingsModal.classList.add("open");
  }

  function addModule(panel, id) {
    const row = document.createElement("div");
    row.className = "module";
    row.title = "Left-click: toggle · Right-click: settings";

    const info = document.createElement("div");
    info.innerHTML = `<div class="mname">${moduleInfo[id][0]}</div><div class="desc">${moduleInfo[id][1]}</div>`;
    const sw = document.createElement("div");
    sw.className = "switch";
    row.append(info, sw);

    row.addEventListener("click", () => {
      if (developerActions.has(id)) { runDeveloperAction(id); return; }
      if (id === "textFix") { openTextFix(); return; }
      if (id === "linkWidget") { toggleLinkWidget(); return; }
      if (id === "serverESP") { toggleServerESP(); return; }
      cfg.modules[id] = !cfg.modules[id];
      save(); applyModules();
      notify(moduleInfo[id][0] + ": " + (cfg.modules[id] ? "ON" : "OFF"));
    });

    row.addEventListener("contextmenu", e => {
      e.preventDefault();
      openModuleSettings(id);
    });

    panel.appendChild(row);
    rows[id] = row;
  }

  ["dark","animations","reader","customCSS","textFix"].forEach(id => addModule(modulesPanel,id));
  ["inspector","links","images","hideImages","bigText","hideHeaders","clock","timer","imageReplace"]
    .forEach(id => addModule(visualPanel,id));
  ["linkWidget","serverESP"].forEach(id => addModule(configPanel,id));

  function addDeveloperCategory(panel,category) {
    const heading = document.createElement("div");
    heading.className = "small";
    heading.style.cssText = "padding:12px 7px 4px;font-weight:900;color:var(--a);text-transform:uppercase;letter-spacing:1px";
    heading.textContent = "Web Developer · " + category;
    panel.appendChild(heading);
    webDeveloperTools.filter(item => item[0] === category).forEach(item => addModule(panel,item[1]));
  }
  ["CSS","Outline"].forEach(category => addDeveloperCategory(modulesPanel,category));
  ["Images","Miscellaneous"].forEach(category => addDeveloperCategory(visualPanel,category));
  ["Forms","Information","Resize & Tools"].forEach(category => addDeveloperCategory(configPanel,category));

  const devStyleOriginals = new Map();
  const devInlineOriginals = new Map();
  const devHiddenOriginals = new Map();
  let devReportPanel = null;
  let devHud = null;

  function syncDeveloperHud() {
    const active = cfg.modules.devLineGuides || cfg.modules.devRuler || cfg.modules.devViewportSize;
    if (!active) { if (devHud) devHud.remove();devHud=null;return; }
    if (!devHud) {
      devHud=document.createElement("div");
      devHud.style.cssText="position:fixed;inset:0;z-index:2147483000;pointer-events:none;color:"+cfg.accent+";font:11px monospace";
      root.appendChild(devHud);
    }
    devHud.replaceChildren();
    if (cfg.modules.devLineGuides) {
      const h=document.createElement("div"),v=document.createElement("div");
      h.style.cssText=`position:absolute;left:0;right:0;top:50%;border-top:1px dashed ${cfg.accent}`;
      v.style.cssText=`position:absolute;top:0;bottom:0;left:50%;border-left:1px dashed ${cfg.accent}`;
      devHud.append(h,v);
    }
    if (cfg.modules.devRuler) {
      const top=document.createElement("div"),left=document.createElement("div");
      top.style.cssText=`position:absolute;left:0;right:0;top:0;height:18px;border-bottom:1px solid ${cfg.accent};background:repeating-linear-gradient(90deg,${cfg.accent} 0 1px,transparent 1px 10px);opacity:.8`;
      left.style.cssText=`position:absolute;left:0;top:0;bottom:0;width:18px;border-right:1px solid ${cfg.accent};background:repeating-linear-gradient(180deg,${cfg.accent} 0 1px,transparent 1px 10px);opacity:.8`;
      devHud.append(top,left);
    }
    if (cfg.modules.devViewportSize) {
      const badge=document.createElement("div");badge.textContent=`Viewport ${innerWidth} × ${innerHeight}`;
      badge.style.cssText=`position:absolute;right:12px;bottom:12px;background:${cfg.bg};color:${cfg.text};border:1px solid ${cfg.accent};border-radius:5px;padding:6px 9px;box-shadow:0 2px 12px #0008`;
      devHud.appendChild(badge);
    }
  }

  function showDeveloperReport(title,lines) {
    if (devReportPanel) devReportPanel.remove();
    const panel = document.createElement("section");
    panel.className = "floating";
    panel.style.cssText = "left:auto;right:16px;top:70px;width:500px;height:65vh;z-index:2147483647";
    const head = document.createElement("div"); head.className = "float-head";
    const caption = document.createElement("span"); caption.textContent = "MAGICX · " + title;
    const close = document.createElement("button"); close.textContent = "×";
    head.append(caption,close);
    const body = document.createElement("div"); body.className = "float-body";
    const pre = document.createElement("pre");
    pre.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 Consolas,monospace;color:var(--fg)";
    pre.textContent = lines.length ? lines.join("\n") : "No matching items found.";
    body.appendChild(pre); panel.append(head,body); root.appendChild(panel);
    devReportPanel = panel;
    close.addEventListener("click",() => { panel.remove(); devReportPanel=null; });
    let drag=null;
    head.addEventListener("pointerdown",e => { if(e.target.closest("button"))return;const r=panel.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};head.setPointerCapture(e.pointerId);e.preventDefault(); });
    head.addEventListener("pointermove",e => { if(drag){panel.style.left=Math.max(0,e.clientX-drag.x)+"px";panel.style.top=Math.max(0,e.clientY-drag.y)+"px";panel.style.right="auto";} });
    head.addEventListener("pointerup",() => drag=null);
  }

  function syncDeveloperDom() {
    const allStylesOff = !!cfg.modules.devDisableAllStyles;
    document.querySelectorAll("style,link[rel~='stylesheet']").forEach(node => {
      if (host.contains(node)) return;
      const isEmbedded = node.tagName === "STYLE";
      const isLinked = node.tagName === "LINK";
      const old = devStyleOriginals.get(node) || { disabled:node.disabled, media:node.media };
      const disable = allStylesOff ||
        (isEmbedded && cfg.modules.devDisableEmbeddedStyles) ||
        (isLinked && cfg.modules.devDisableLinkedStyles) ||
        (cfg.modules.devDisablePrintStyles && /print/i.test(node.media || ""));
      const showPrint = cfg.modules.devShowPrintStyles && /print/i.test(old.media || "");
      const showHandheld = cfg.modules.devShowHandheldStyles && /handheld/i.test(old.media || "");
      if (disable || showPrint || showHandheld) {
        if (!devStyleOriginals.has(node)) devStyleOriginals.set(node,old);
        node.disabled = disable ? true : old.disabled;
        if (!disable && (showPrint || showHandheld)) node.media = "all";
      } else if (devStyleOriginals.has(node)) {
        const original=devStyleOriginals.get(node);node.disabled=original.disabled;node.media=original.media;devStyleOriginals.delete(node);
      }
    });
    if (cfg.modules.devDisableInlineStyles) {
      document.querySelectorAll("[style]").forEach(node => {
        if (host.contains(node)) return;
        if (!devInlineOriginals.has(node)) devInlineOriginals.set(node,node.getAttribute("style"));
        node.removeAttribute("style");
      });
    } else {
      for (const [node,value] of [...devInlineOriginals]) {
        if (node.isConnected) { if (value === null) node.removeAttribute("style"); else node.setAttribute("style",value); }
        devInlineOriginals.delete(node);
      }
    }

    document.querySelectorAll("*").forEach(node => {
      if (host.contains(node) || ["SCRIPT","STYLE","TEMPLATE","LINK","META"].includes(node.tagName)) return;
      if (cfg.modules.devShowHidden) {
        if (!devHiddenOriginals.has(node) && getComputedStyle(node).display === "none") {
          devHiddenOriginals.set(node,node.getAttribute("style"));
        }
        if (devHiddenOriginals.has(node)) {
          node.style.setProperty("display","block","important");
          node.style.setProperty("visibility","visible","important");
          node.style.setProperty("opacity","1","important");
          node.setAttribute("data-mx-hidden","1");
        }
      } else if (devHiddenOriginals.has(node)) {
        const value=devHiddenOriginals.get(node);
        if (value === null) node.removeAttribute("style"); else node.setAttribute("style",value);
        node.removeAttribute("data-mx-hidden");devHiddenOriginals.delete(node);
      }
      if (cfg.modules.devTagNames) node.setAttribute("data-mx-tag",node.tagName.toLowerCase());
      else node.removeAttribute("data-mx-tag");
      if (cfg.modules.devIdClass && (node.id || node.classList?.length)) {
        node.setAttribute("data-mx-dev-idclass",`${node.id ? "#"+node.id : ""}${node.classList?.length ? "."+[...node.classList].join(".") : ""}`);
      } else node.removeAttribute("data-mx-dev-idclass");
      if (cfg.modules.devOutlineExternal && node.matches("a[href]")) {
        try { node.toggleAttribute("data-mx-dev-external",new URL(node.href,location.href).hostname !== location.hostname); } catch {}
      } else node.removeAttribute("data-mx-dev-external");
    });
    const replaceAlt = !!cfg.modules.devReplaceAlt;
    document.querySelectorAll("img[data-mx-replace-alt],img[alt]").forEach(img => {
      if (replaceAlt && img.alt) {
        img.setAttribute("data-mx-replace-alt","1");
        if (!img.nextElementSibling?.classList.contains("mx-dev-alt")) {
          const label=document.createElement("span");label.className="mx-dev-alt";label.textContent=img.alt;img.insertAdjacentElement("afterend",label);
        }
      } else {
        img.removeAttribute("data-mx-replace-alt");
        if (img.nextElementSibling?.classList.contains("mx-dev-alt")) img.nextElementSibling.remove();
      }
    });
    syncDeveloperHud();
  }

  function runDeveloperAction(id) {
    const all = (selector,scope=document) => [...scope.querySelectorAll(selector)];
    const report = (title,items) => showDeveloperReport(title,items);
    const describe = el => `${el.tagName.toLowerCase()}${el.id ? "#"+el.id : ""}${el.classList?.length ? "."+[...el.classList].join(".") : ""}`;
    const addTitle = (el,value) => {
      if (!el.dataset.mxDevOriginalTitle) el.dataset.mxDevOriginalTitle = el.getAttribute("title") || "";
      el.title = [el.dataset.mxDevOriginalTitle,value].filter(Boolean).join("\n");
    };
    if (["devCheckAll","devUncheckAll"].includes(id)) {
      const checked=id === "devCheckAll";
      all("input[type=checkbox]").forEach(el => {el.checked=checked;el.dispatchEvent(new Event("change",{bubbles:true}));});
      notify(`${checked ? "Checked" : "Unchecked"} ${all("input[type=checkbox]").length} checkboxes`);return;
    }
    if (id === "devClearFields") {
      all("input:not([type=button]):not([type=submit]):not([type=reset]):not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select").forEach(el=>{el.value="";el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));});
      notify("Form fields cleared");return;
    }
    if (id === "devClearRadios") {
      all("input[type=radio]:checked").forEach(el=>{el.checked=false;el.dispatchEvent(new Event("change",{bubbles:true}));});notify("Radio selections cleared");return;
    }
    if (["devGetToPost","devPostToGet"].includes(id)) {
      const from=id === "devGetToPost" ? "get" : "post",to=from === "get" ? "post" : "get";
      const forms=all("form").filter(form=>(form.method||"get").toLowerCase()===from);
      forms.forEach(form=>form.method=to);notify(`${forms.length} forms changed to ${to.toUpperCase()}`);return;
    }
    if (id === "devSelectToText") {
      const selects=all("select");selects.forEach(old=>{const input=document.createElement("input");input.type="text";input.value=old.selectedOptions[0]?.textContent||"";input.name=old.name;input.id=old.id;input.className=old.className;input.setAttribute("data-mx-replaced-select","1");old.replaceWith(input);});notify(`${selects.length} select elements converted`);return;
    }
    if (id === "devInputToTextarea") {
      const inputs=all("input[type=text],input:not([type])");inputs.forEach(old=>{const area=document.createElement("textarea");area.value=old.value;area.name=old.name;area.id=old.id;area.className=old.className;area.setAttribute("data-mx-replaced-input","1");old.replaceWith(area);});notify(`${inputs.length} text inputs converted`);return;
    }
    if (id === "devViewCSS") return report("CSS ON THIS PAGE",[
      ...all("link[rel~='stylesheet']").map(link=>`Linked: ${link.href}`),
      ...all("style").map((el,i)=>`Embedded style ${i+1}: ${el.textContent.length} characters`),
      `Elements with inline style: ${all("[style]").length}`
    ]);
    if (id === "devFormDetails") return report("FORM DETAILS",all("form").map((form,i)=>`Form ${i+1}: ${form.method.toUpperCase()} ${form.action}\n  target=${form.target||"(default)"} · fields=${form.elements.length} · enctype=${form.enctype}`));
    if (id === "devDisplayPasswords") {const fields=all("input[type=password]");fields.forEach(el=>el.type="text");notify(`Revealed ${fields.length} password fields`);return;}
    if (id === "devEnableAutocomplete") {all("form,[autocomplete=off]").forEach(el=>el.setAttribute("autocomplete","on"));notify("Autocomplete enabled on page forms and fields");return;}
    if (id === "devEnableFields") {all("input:disabled,textarea:disabled,select:disabled,button:disabled").forEach(el=>el.disabled=false);notify("Disabled form controls enabled");return;}
    if (id === "devPopulateFields") {
      all("input,textarea,select").forEach(el=>{if(el.disabled||el.readOnly||["hidden","submit","reset","button","checkbox","radio","file","password"].includes(el.type))return;if(el.tagName==="SELECT"){if(el.options.length)el.selectedIndex=0;return;}const type=el.type;if(type==="email")el.value="developer@example.test";else if(type==="number"||type==="range")el.value=String(el.min||1);else if(type==="url")el.value="https://example.test";else if(type==="date")el.value="2025-01-01";else el.value="Test value";el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));});notify("Generic test values inserted");return;
    }
    if (id === "devRemoveValidation") {all("form").forEach(form=>{form.noValidate=true;form.querySelectorAll("[required]").forEach(el=>el.required=false);});notify("Native form validation disabled");return;}
    if (id === "devRemoveMaxlength") {const fields=all("[maxlength]");fields.forEach(el=>el.removeAttribute("maxlength"));notify(`Removed ${fields.length} maxlength limits`);return;}
    if (["devDisplayAlt","devImageDimensions","devImagePaths"].includes(id)) {
      const imgs=all("img");imgs.forEach(img=>{const bits=[];if(id==="devDisplayAlt"&&img.alt)bits.push(`alt: ${img.alt}`);if(id==="devImageDimensions")bits.push(`size: ${img.naturalWidth}×${img.naturalHeight}`);if(id==="devImagePaths")bits.push(`src: ${img.currentSrc||img.src}`);addTitle(img,bits.join(" · ")||"(no alt text)");});notify(`Updated tooltips on ${imgs.length} images`);return;
    }
    if (id === "devBrokenImages") {const broken=all("img").filter(img=>img.complete&&img.naturalWidth===0);broken.forEach(img=>img.style.setProperty("outline","3px solid #ff3030","important"));return report("BROKEN IMAGES",broken.map(img=>img.currentSrc||img.src));}
    if (id === "devReloadImages") {const imgs=all("img");imgs.forEach(img=>{try{const url=new URL(img.currentSrc||img.src);url.searchParams.set("mx_reload",Date.now());img.src=url.href;}catch{}});notify(`Reload requested for ${imgs.length} images`);return;}
    if (id === "devImageInfo") return report("IMAGE INFORMATION",all("img").map(img=>`${img.currentSrc||img.src}\n  ${img.naturalWidth}×${img.naturalHeight} · ${img.complete&&img.naturalWidth?"loaded":"not loaded/broken"} · alt=${img.alt||"(none)"}`));
    if (id === "devAbbreviations") {const els=all("abbr[title],acronym[title]");els.forEach(el=>addTitle(el,el.title));return report("ABBREVIATIONS",els.map(el=>`${el.textContent.trim()} — ${el.title}`));}
    if (id === "devAccessKeys") {const els=all("[accesskey]");els.forEach(el=>addTitle(el,`accesskey: ${el.accessKey}`));return report("ACCESS KEYS",els.map(el=>`${describe(el)} — ${el.accessKey}`));}
    if (id === "devAriaRoles") return report("ARIA ROLES",all("[role],[aria-label],[aria-labelledby]").map(el=>`${describe(el)} — role=${el.getAttribute("role")||"implicit"}; label=${el.getAttribute("aria-label")||el.getAttribute("aria-labelledby")||"(none)"}`));
    if (id === "devElementInfo") {
      notify("Click a page element to inspect it");
      const inspect=e=>{if(e.composedPath().includes(host))return;document.removeEventListener("click",inspect,true);const el=e.target,r=el.getBoundingClientRect(),cs=getComputedStyle(el);report("ELEMENT INFORMATION",[describe(el),`size=${Math.round(r.width)}×${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`,`display=${cs.display}; position=${cs.position}; font=${cs.fontFamily} ${cs.fontSize}`,`color=${cs.color}; background=${cs.backgroundColor}`]);};
      document.addEventListener("click",inspect,true);return;
    }
    if (id === "devLinkInfo") {const links=all("a[href]");links.forEach(a=>addTitle(a,a.href));return report("LINK DETAILS",links.map(a=>`${a.textContent.trim()||"(no text)"} — ${a.href}`));}
    if (id === "devAnchorInfo") return report("ANCHORS",all("a[id],a[name], [id]").map(el=>`#${el.id||el.getAttribute("name")} — ${describe(el)}`));
    if (id === "devColorInfo") {const colors=new Set();all("*").forEach(el=>{const cs=getComputedStyle(el);[cs.color,cs.backgroundColor,cs.borderTopColor].forEach(c=>{if(c&&c!=="rgba(0, 0, 0, 0)")colors.add(c);});});return report("PAGE COLORS",[...colors].sort());}
    if (id === "devDocumentOutline") return report("DOCUMENT OUTLINE",all("h1,h2,h3,h4,h5,h6").map(el=>`${el.tagName} ${el.textContent.trim()}`));
    if (id === "devJavaScriptInfo") return report("JAVASCRIPT",[...all("script[src]").map(el=>el.src),...all("script:not([src])").map((el,i)=>`Inline script ${i+1}: ${el.textContent.length} characters`)]);
    if (id === "devCookieInfo") return report("COOKIES VISIBLE TO THIS PAGE",(document.cookie||"No script-readable cookies (HttpOnly cookies are hidden from page scripts).").split("; "));
    if (id === "devMetaInfo") return report("META TAGS",all("meta").map(el=>`${el.name||el.httpEquiv||el.getAttribute("property")||"meta"} = ${el.content||""}`));
    if (id === "devHeaderInfo") return report("RESPONSE HEADERS",["Page scripts cannot read the browser's full response headers without extension permissions.","Use Chrome DevTools → Network → select the document request → Headers."]);
    if (id === "devClearCache"||id === "devClearHistory") return report(id==="devClearCache"?"CLEAR CACHE":"CLEAR HISTORY",["Chrome does not expose browser cache or history clearing to an ordinary page content script.","This feature requires browser-level extension permissions and a background service worker."]);
    if (id === "devColorPicker") {
      if (!window.EyeDropper) return report("COLOR PICKER",["This Chrome version does not provide the EyeDropper API."]);
      new EyeDropper().open().then(result=>{navigator.clipboard?.writeText(result.sRGBHex).catch(()=>{});notify(`Picked ${result.sRGBHex} · copied`);}).catch(()=>{});return;
    }
    if (id === "devImageInfo") return;
    if (id === "devResponsiveLayouts"||id === "devEditResizeSizes"||id === "devResizeWindow") return report("RESPONSIVE VIEWPORTS",["Chrome restricts changing the browser window size from page scripts.","Common test sizes: 360×800 mobile · 390×844 mobile · 768×1024 tablet · 1024×768 tablet · 1366×768 desktop.","Use DevTools → Toggle device toolbar to emulate these viewports."]);
    if (id === "devValidateFeed"||id === "devDNS") return report(moduleInfo[id][0],["This tool requires an external validator or DNS service, which is not connected to this page-only extension."]);
    if (id === "devValidateStructuredData") return report("STRUCTURED DATA",all("script[type='application/ld+json']").map((el,i)=>{try{return `JSON-LD ${i+1}: ${JSON.stringify(JSON.parse(el.textContent),null,2)}`;}catch{return `JSON-LD ${i+1}: invalid JSON`;}}));
    if (id === "devValidateLinks") {const missing=all("a[href^='#']").filter(a=>{const target=decodeURIComponent(a.hash.slice(1));return target&&!document.getElementById(target)&&!document.getElementsByName(target).length;});return report("LINK CHECK",missing.map(a=>`${a.href} — missing target`));}
    if (id === "devValidateAccessibility") {
      const issues=[];
      all("img").filter(el=>!el.hasAttribute("alt")).forEach(el=>issues.push(`Image missing alt: ${el.src}`));
      all("button").filter(el=>!el.textContent.trim()&&!el.getAttribute("aria-label")&&!el.title).forEach(el=>issues.push(`Button has no accessible name: ${describe(el)}`));
      all("input:not([type=hidden]),select,textarea").filter(el=>!el.labels?.length&&!el.getAttribute("aria-label")&&!el.getAttribute("aria-labelledby")).forEach(el=>issues.push(`Field may lack a label: ${describe(el)}`));
      return report("ACCESSIBILITY CHECK",issues);
    }
    if (id === "devValidateCSS") {
      const issues=[];
      all("style").forEach((style,i)=>{try{const sheet=new CSSStyleSheet();sheet.replaceSync(style.textContent);if(style.textContent&&!sheet.cssRules.length)issues.push(`Style block ${i+1}: no CSS rules parsed`);}catch(e){issues.push(`Style block ${i+1}: ${e.message}`);}});
      all("link[rel~='stylesheet']").forEach(link=>{try{void link.sheet?.cssRules;}catch{issues.push(`Cannot inspect cross-origin stylesheet: ${link.href}`);}});
      return report("CSS CHECK",issues);
    }
    if (id === "devValidateHTML") {
      const issues=[];const ids=new Set();all("[id]").forEach(el=>{if(ids.has(el.id))issues.push(`Duplicate id: ${el.id}`);ids.add(el.id);});
      if(!document.title)issues.push("Document title is empty");all("img").filter(el=>!el.hasAttribute("alt")).forEach(el=>issues.push(`Missing alt on image: ${el.src}`));
      return report("HTML CHECK",issues);
    }
    if (id === "devViewSource") return report("PAGE DOM SOURCE",[document.documentElement.outerHTML]);
    if (id === "devViewportSize") {notify(`Viewport: ${innerWidth}×${innerHeight}`);return;}
    if (id === "devReloadStyles") {const links=all("link[rel~='stylesheet']");links.forEach(link=>{try{const u=new URL(link.href);u.searchParams.set("mx_reload",Date.now());link.href=u.href;}catch{}});notify(`Reload requested for ${links.length} stylesheets`);return;}
    if (id === "devShowPrintStyles"||id === "devShowHandheldStyles") {notify("Stylesheet media override toggled");return;}
    if (id === "devValidateLinks") return;
    report(moduleInfo[id]?.[0]||"WEB DEVELOPER",[moduleInfo[id]?.[1]||"Feature available."]);
  }

  // Theme customization
  colorControl(themePanel,"Accent Color",() => cfg.accent,v => cfg.accent = v);
  colorControl(themePanel,"Gradient Color",() => cfg.gradient,v => cfg.gradient = v);
  colorControl(themePanel,"Window Background",() => cfg.bg,v => cfg.bg = v);
  colorControl(themePanel,"Text Color",() => cfg.text,v => cfg.text = v);
  colorControl(themePanel,"Border Color",() => cfg.border,v => cfg.border = v);
  colorControl(themePanel,"Header Text Color",() => cfg.headerText,v => cfg.headerText = v);
  colorControl(themePanel,"Secondary Text Color",() => cfg.muted,v => cfg.muted = v);
  colorControl(themePanel,"Button Background",() => cfg.buttonBg,v => cfg.buttonBg = v);
  colorControl(themePanel,"Button Text Color",() => cfg.buttonText,v => cfg.buttonText = v);
  colorControl(themePanel,"Button Hover Color",() => cfg.buttonHover,v => cfg.buttonHover = v);
  colorControl(themePanel,"Input Background",() => cfg.controlBg,v => cfg.controlBg = v);
  colorControl(themePanel,"Switch Off Color",() => cfg.switchOff,v => cfg.switchOff = v);
  colorControl(themePanel,"Switch Knob Color",() => cfg.switchKnob,v => cfg.switchKnob = v);
  colorControl(themePanel,"Switch On Knob Color",() => cfg.switchOnKnob,v => cfg.switchOnKnob = v);
  const syntaxLabels = {
    plain:"Code Editor Text", selector:"CSS Selector Highlight", property:"Code Property Highlight",
    value:"Code Value Highlight", string:"Code String Highlight", comment:"Code Comment Highlight",
    tag:"HTML Tag Highlight", attr:"HTML Attribute Highlight", punct:"Code Punctuation Highlight"
  };
  for (const [key,label] of Object.entries(syntaxLabels)) {
    colorControl(themePanel,label,() => cfg.syntax[key],v => cfg.syntax[key] = v);
  }

  rangeControl(themePanel,"Window Opacity",50,100,
    () => cfg.opacity,v => cfg.opacity = v);
  rangeControl(themePanel,"GUI Scale (%)",70,120,
    () => cfg.scale,v => cfg.scale = v);

  button(themePanel,"Set ClickGUI Keybind",e => {
    waitingForKey = { type:"gui", button:e.currentTarget };
    e.currentTarget.textContent = "Press a key or combination...";
  });

  // CSS editor with live highlighting
  const cssEditor = makeEditor(cfg.css,"css",v => {
    cfg.css = v; save();
    if (cfg.modules.customCSS) applyModules();
  });
  cssPanel.appendChild(cssEditor.wrap);
  button(cssPanel,"Apply CSS",() => {
    applyModules(); notify("CSS applied");
  });
  button(cssPanel,"Clear CSS",() => {
    cfg.css = ""; cssEditor.input.value = ""; cssEditor.paint();
    save(); applyModules();
  });

  // Isolated HTML preview. Scripts are disabled in the sandbox.
  const htmlEditor = makeEditor(cfg.html,"html",v => {
    cfg.html = v; save();
  });
  htmlPanel.appendChild(htmlEditor.wrap);

  const preview = document.createElement("iframe");
  preview.id = "preview";
  preview.setAttribute("sandbox","");
  preview.title = "Isolated HTML preview";
  htmlPanel.appendChild(preview);

  button(htmlPanel,"Render HTML Preview",() => {
    preview.srcdoc = cfg.html;
  });

  button(htmlPanel,"Reset HTML",() => {
    cfg.html = defaults.html;
    htmlEditor.input.value = cfg.html;
    htmlEditor.paint(); save();
  });

  // Config import/export
  button(configPanel,"Export Config (.json)",() => {
    const blob = new Blob([JSON.stringify(cfg,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "MagicX-Client-config.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  });

  const importFile = document.createElement("input");
  importFile.type = "file";
  importFile.accept = ".json,application/json";
  importFile.hidden = true;
  configPanel.appendChild(importFile);

  button(configPanel,"Import Config",() => importFile.click());
  importFile.addEventListener("change",async() => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== "object" || !data.modules) throw Error("Invalid");
      const validColor = (v,d) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d;

      cfg = {
        ...clone(defaults),
        ...data,
        accent: validColor(data.accent,defaults.accent),
        bg: validColor(data.bg,defaults.bg),
        text: validColor(data.text,defaults.text),
        border: validColor(data.border,defaults.border),
        modules: {...defaults.modules,...data.modules,},
        clock: {...defaults.clock,...(data.clock || {})},
        binds: {...defaults.binds,...(data.binds || {})},
        options: {...clone(defaults.options),...(data.options || {})}
      };
      save();
      location.reload();
    } catch {
      notify("Invalid config file");
    }
    importFile.value = "";
  });

  button(configPanel,"Reset Everything",() => {
    if (!confirm("Reset all MagicX-Client settings?")) return;
    cfg = clone(defaults);
    save();
    location.reload();
  });

  const configInfo = document.createElement("div");
  configInfo.className = "small";
  configInfo.textContent =
    "Use the configured ClickGUI key to open the menu. Right-click a module for advanced settings.";
  configPanel.appendChild(configInfo);


  // V4 floating link widget
  let linkFloat = null, linkFrame = null;
  function toggleLinkWidget(forceOpen) {
    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !linkFloat;
    if (!shouldOpen) {
      if (linkFloat) linkFloat.remove();
      linkFloat = null; linkFrame = null;
      return;
    }
    if (linkFloat) { linkFloat.style.display = "block"; return; }
    const panel = document.createElement("section");
    panel.className = "floating";
    panel.style.left = "18%"; panel.style.top = "18%";
    const head = document.createElement("div"); head.className = "float-head";
    const title = document.createElement("span"); title.textContent = "MAGICX · LINK WIDGET";
    const actions = document.createElement("div"); actions.className = "float-actions";
    const full = document.createElement("button"); full.textContent = "⛶"; full.title = "Toggle fullscreen";
    const openTab = document.createElement("button"); openTab.textContent = "↗"; openTab.title = "Open in new tab";
    const close = document.createElement("button"); close.textContent = "×"; close.title = "Close widget";
    actions.append(full,openTab,close); head.append(title,actions);
    const body = document.createElement("div"); body.className = "float-body";
    const form = document.createElement("div"); form.style.cssText = "display:flex;gap:6px;margin-bottom:8px";
    const url = document.createElement("input"); url.className = "float-url"; url.placeholder = "https://example.com";
    url.value = cfg.options.linkWidget.url || "";
    const go = document.createElement("button"); go.className = "btn"; go.style.width = "90px"; go.textContent = "Open";
    form.append(url,go);
    const frameWrap = document.createElement("div"); frameWrap.style.cssText = "height:calc(100% - 48px);min-height:180px";
    const frame = document.createElement("iframe"); frame.title = "MagicX link widget";
    frame.setAttribute("sandbox","allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
    frameWrap.appendChild(frame); body.append(form,frameWrap); panel.append(head,body); root.appendChild(panel);
    linkFloat = panel; linkFrame = frame;
    function navigate() {
      const value = url.value.trim();
      if (!/^https?:\/\//i.test(value)) { notify("Enter a full http(s) URL"); return; }
      cfg.options.linkWidget.url = value; save(); frame.src = value;
    }
    go.addEventListener("click",navigate);
    url.addEventListener("keydown",e => { if (e.key === "Enter") navigate(); });
    full.addEventListener("click",() => panel.classList.toggle("fullscreen"));
    openTab.addEventListener("click",() => {
      const value = url.value.trim();
      if (/^https?:\/\//i.test(value)) window.open(value,"_blank","noopener,noreferrer");
    });
    close.addEventListener("click",() => toggleLinkWidget(false));
    let drag = null;
    head.addEventListener("pointerdown",e => {
      if (e.target.closest("button") || panel.classList.contains("fullscreen")) return;
      const r = panel.getBoundingClientRect(); drag = {x:e.clientX-r.left,y:e.clientY-r.top};
      head.setPointerCapture(e.pointerId); e.preventDefault();
    });
    head.addEventListener("pointermove",e => {
      if (!drag) return;
      panel.style.left = Math.max(0,Math.min(innerWidth-100,e.clientX-drag.x))+"px";
      panel.style.top = Math.max(0,Math.min(innerHeight-45,e.clientY-drag.y))+"px";
    });
    head.addEventListener("pointerup",() => drag=null);
    head.addEventListener("pointercancel",() => drag=null);
    if (url.value) navigate();
  }  // Selected-text correction panel. Native browser spellcheck can assist; no text is uploaded.
  let selectedTextRange = null, selectedControl = null, selectedControlStart = 0, selectedControlEnd = 0, textFixPanel = null;
  function openTextFix() {
    const selection = window.getSelection();
    const selected = selection ? selection.toString() : "";
    if (!selected.trim()) { notify("Markiere zuerst einen Text"); return; }
    selectedTextRange = null;
    selectedControl = null;
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLTextAreaElement || (activeEl instanceof HTMLInputElement && /^(text|search|url|email|tel)$/i.test(activeEl.type))) {
      if (activeEl.selectionStart !== activeEl.selectionEnd) {
        selectedControl = activeEl;
        selectedControlStart = activeEl.selectionStart;
        selectedControlEnd = activeEl.selectionEnd;
      }
    }
    try {
      if (!selectedControl && selection.rangeCount) selectedTextRange = selection.getRangeAt(0).cloneRange();
    } catch {}
    if (textFixPanel) textFixPanel.remove();
    const panel = document.createElement("section"); panel.className = "floating";
    panel.style.left = "25%"; panel.style.top = "20%"; panel.style.width = "520px"; panel.style.height = "330px";
    const head = document.createElement("div"); head.className = "float-head";
    const title = document.createElement("span"); title.textContent = "MAGICX · TEXT FIX";
    const close = document.createElement("button"); close.textContent = "×"; close.title = "Close";
    head.append(title,close);
    const body = document.createElement("div"); body.className = "float-body";
    const help = document.createElement("div"); help.className = "small";
    help.textContent = "Bearbeite den markierten Text. Die Browser-Rechtschreibprüfung kann Vorschläge anzeigen; für automatische Grammatikprüfung ist kein externer Dienst verbunden.";
    const area = document.createElement("textarea");
    area.value = selected; area.spellcheck = true; area.lang = document.documentElement.lang || "de";
    area.style.cssText = "width:100%;height:190px;resize:vertical;background:var(--control-bg);color:var(--fg);border:1px solid var(--bd);border-radius:6px;padding:10px;font:13px/1.5 Arial";
    const apply = document.createElement("button"); apply.className = "btn"; apply.textContent = "Korrigierten Text einsetzen";
    const copy = document.createElement("button"); copy.className = "btn"; copy.textContent = "Text kopieren";
    body.append(help,area,apply,copy); panel.append(head,body); root.appendChild(panel); textFixPanel = panel;
    close.addEventListener("click",() => { panel.remove(); textFixPanel=null; });
    copy.addEventListener("click",async() => {
      try { await navigator.clipboard.writeText(area.value); notify("Text kopiert"); }
      catch { area.select(); notify("Text markieren und kopieren"); }
    });
    apply.addEventListener("click",() => {
      const value = area.value;
      // Replace the saved selection in an input/textarea, or in ordinary page text.
      try {
        if (selectedControl && selectedControl.isConnected) {
          const start = selectedControlStart, end = selectedControlEnd;
          selectedControl.focus();
          selectedControl.setRangeText(value,start,end,"end");
          selectedControl.dispatchEvent(new Event("input",{bubbles:true}));
          notify("Text eingesetzt");
        } else if (selectedTextRange && selectedTextRange.startContainer.isConnected) {
          selectedTextRange.deleteContents();
          selectedTextRange.insertNode(document.createTextNode(value));
          notify("Text eingesetzt");
        } else {
          notify("Ursprüngliche Auswahl nicht mehr verfügbar – Text kopiert");
          navigator.clipboard?.writeText(value).catch(()=>{});
        }
      } catch {
        try { navigator.clipboard?.writeText(value).catch(()=>{}); } catch {}
        notify("Einsetzen nicht möglich – Text kopiert");
      }
      panel.remove(); textFixPanel=null;
    });
    let drag=null;
    head.addEventListener("pointerdown",e => {
      if (e.target.closest("button")) return;
      const r=panel.getBoundingClientRect(); drag={x:e.clientX-r.left,y:e.clientY-r.top};
      head.setPointerCapture(e.pointerId); e.preventDefault();
    });
    head.addEventListener("pointermove",e => { if(drag){panel.style.left=Math.max(0,e.clientX-drag.x)+"px";panel.style.top=Math.max(0,e.clientY-drag.y)+"px";} });
    head.addEventListener("pointerup",()=>drag=null);
  }

  // Server ESP: observe resource timing plus fetch/XHR metadata; no request/response bodies.
  const networkLog = [];
  let networkPanel = null, networkBody = null;
  function logNetwork(kind, url, detail="") {
    try {
      const parsed = new URL(String(url), location.href);
      networkLog.unshift({time:new Date().toLocaleTimeString(),kind,url:parsed.href,detail});
      networkLog.length = Math.min(networkLog.length, Number(cfg.options.serverESP.maxRows)||80);
      renderNetworkLog();
    } catch {}
  }
  function renderNetworkLog() {
    if (!networkBody) return;
    networkBody.replaceChildren();
    networkLog.slice(0,Number(cfg.options.serverESP.maxRows)||80).forEach(item => {
      const row=document.createElement("div"); row.className="net-row";
      const b=document.createElement("b"); b.textContent=`[${item.time}] ${item.kind} `;
      const url=document.createElement("div"); url.textContent=item.url;
      const detail=document.createElement("div"); detail.className="small"; detail.textContent=item.detail;
      row.append(b,url,detail); networkBody.appendChild(row);
    });
  }
  function toggleServerESP(forceOpen) {
    const shouldOpen=typeof forceOpen==="boolean"?forceOpen:!networkPanel;
    if(!shouldOpen){if(networkPanel)networkPanel.remove();networkPanel=null;networkBody=null;return;}
    if(networkPanel){networkPanel.style.display="block";renderNetworkLog();return;}
    const panel=document.createElement("section");panel.className="floating";
    panel.style.left="auto";panel.style.right="14px";panel.style.top="80px";panel.style.width="430px";panel.style.height="420px";
    const head=document.createElement("div");head.className="float-head";
    const title=document.createElement("span");title.textContent="MAGICX · SERVER ESP";
    const actions=document.createElement("div");actions.className="float-actions";
    const clear=document.createElement("button");clear.textContent="Clear";
    const close=document.createElement("button");close.textContent="×";
    actions.append(clear,close);head.append(title,actions);
    const body=document.createElement("div");body.className="float-body";body.style.height="calc(100% - 36px)";
    const note=document.createElement("div");note.className="small";
    note.textContent="Observable network metadata only. Browser restrictions mean this is not a packet sniffer; cross-origin response bodies and private data are not read.";
    networkBody=document.createElement("div");body.append(note,networkBody);panel.append(head,body);root.appendChild(panel);networkPanel=panel;
    clear.addEventListener("click",()=>{networkLog.length=0;renderNetworkLog();});
    close.addEventListener("click",()=>toggleServerESP(false));
    let drag=null;
    head.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;const r=panel.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};head.setPointerCapture(e.pointerId);e.preventDefault();});
    head.addEventListener("pointermove",e=>{if(drag){panel.style.left=Math.max(0,e.clientX-drag.x)+"px";panel.style.top=Math.max(0,e.clientY-drag.y)+"px";panel.style.right="auto";}});
    head.addEventListener("pointerup",()=>drag=null);
    head.addEventListener("pointercancel",()=>drag=null);
    renderNetworkLog();
  }
  if (!window.__magicxNetworkHooksV4) {
    window.__magicxNetworkHooksV4 = true;
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      try { logNetwork("fetch", args[0] instanceof Request ? args[0].url : args[0]); } catch {}
      return originalFetch.apply(this,args);
    };
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method,url,...rest) {
      logNetwork("XHR",url,String(method||"GET").toUpperCase());
      return originalOpen.call(this,method,url,...rest);
    };
    try {
      const seen = new Set();
      const collect = () => performance.getEntriesByType("resource").forEach(entry => {
        if (!seen.has(entry.name)) { seen.add(entry.name); logNetwork("resource",entry.name,`${Math.round(entry.duration)} ms · ${entry.initiatorType||"resource"}`); }
      });
      setInterval(collect,2500); collect();
    } catch {}
  }


  // Image replacement keeps each original source for restoration.
  const originalImages = new Map();

  function replacePageImages() {
    if (!cfg.modules.imageReplace || !cfg.replacementImage) {
      for (const [img, original] of originalImages) {
        if (img.isConnected) img.src = original;
      }
      originalImages.clear();
      return;
    }

    document.querySelectorAll("img").forEach(img => {
      if (host.contains(img) || img.closest("#magicx-client")) return;
      if (!originalImages.has(img)) originalImages.set(img,img.getAttribute("src") || "");
      if (img.src !== cfg.replacementImage) img.src = cfg.replacementImage;
      img.style.setProperty("object-fit",cfg.options.imageReplace.fit || "cover","important");
    });
  }

  let pageObserver;
  function applyModules() {
    for (const [id,row] of Object.entries(rows)) {
      row.classList.toggle("on",!!cfg.modules[id]);
    }

    const css = [];
    if (cfg.modules.dark) {
      css.push("html{filter:invert(1) hue-rotate(180deg)!important;background:#111!important}img,video,canvas{filter:invert(1) hue-rotate(180deg)!important}");
    }
    if (cfg.modules.animations) {
      css.push("*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}");
    }
    if (cfg.modules.reader) {
      css.push(`article,main,[role=main]{max-width:${cfg.options.reader.width}px!important;margin-inline:auto!important;line-height:1.8!important}`);
    }
    if (cfg.modules.links) {
      css.push(`a{outline:2px solid ${cfg.options.links.color}!important;outline-offset:2px!important}`);
    }
    if (cfg.modules.images) {
      css.push(`img,picture,video{outline:2px solid ${cfg.options.images.color}!important;outline-offset:2px!important}`);
    }
    if (cfg.modules.hideImages) {
      css.push("img,picture,video{visibility:hidden!important}");
    }
    if (cfg.modules.bigText) {
      css.push(`body{font-size:${cfg.options.bigText.size}%!important}`);
    }
    if (cfg.modules.hideHeaders) {
      css.push("header,[role=banner]{display:none!important}");
    }
    if (cfg.modules.customCSS) css.push(cfg.css);
    for (const [id,rule] of Object.entries(developerStyleRules)) {
      if (cfg.modules[id] && rule) {
        css.push(rule);
      }
    }
    if (cfg.modules.devTagNames) {
      css.push("[data-mx-tag]::before{content:attr(data-mx-tag);position:absolute;z-index:2147483000;background:#111;color:#fff;font:10px monospace;padding:2px 4px;pointer-events:none}");
    }

    effects.textContent = css.join("\n");
    syncDeveloperDom();
    clock.classList.toggle("visible",!!cfg.modules.clock);
    clock.style.color = cfg.clock.color;
    clock.style.fontSize = cfg.clock.size + "px";
    clock.style.left = cfg.clock.x + "%";
    clock.style.top = cfg.clock.y + "%";

    if (!cfg.modules.inspector) clearInspector();
    replacePageImages();
  }

  function clearInspector() {
    if (!inspectorTarget) return;
    inspectorTarget.style.outline = inspectorTarget.dataset.magicxOldOutline || "";
    delete inspectorTarget.dataset.magicxOldOutline;
    inspectorTarget = null;
  }

  document.addEventListener("mousemove",e => {
    if (!cfg.modules.inspector || menuOpen) {
      clearInspector();
      return;
    }
    const el = e.target;
    if (!(el instanceof HTMLElement) || host.contains(el) || el === inspectorTarget) return;
    clearInspector();
    inspectorTarget = el;
    inspectorTarget.dataset.magicxOldOutline = inspectorTarget.style.outline;
    inspectorTarget.style.outline = `2px solid ${cfg.options.inspector.color}`;
  },true);

  const modifierCodes = new Set([
    "ShiftLeft","ShiftRight","ControlLeft","ControlRight",
    "AltLeft","AltRight","MetaLeft","MetaRight"
  ]);
  const modifierNames = {
    ControlLeft:"Ctrl",ControlRight:"Ctrl",AltLeft:"Alt",AltRight:"Alt",
    ShiftLeft:"Shift",ShiftRight:"Shift",MetaLeft:"Meta",MetaRight:"Meta"
  };
  function keybindFromEvent(e) {
    if (modifierCodes.has(e.code)) return e.code;
    const modifiers = [];
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.altKey) modifiers.push("Alt");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Meta");
    const key = e.code || e.key;
    return [...modifiers,key].filter(Boolean).join("+");
  }
  function setWaitingKey(key) {
    const target = waitingForKey;
    if (!target) return;
    if (target.type === "gui") {
      cfg.guiKey = key;
      target.button.textContent = "ClickGUI Key: " + key;
    } else if (target.type === "module") {
      cfg.binds[target.id] = key;
      target.button.textContent = "Set Keybind: " + key;
    }
    waitingForKey = null;
    save();
    notify("Keybind saved");
  }

  // The ClickGUI key and optional per-module keybinds are configurable.
  document.addEventListener("keydown",e => {
    if (waitingForKey) {
      e.preventDefault();
      e.stopPropagation();
      if (modifierCodes.has(e.code)) {
        waitingForKey.button.textContent = "Hold " + modifierNames[e.code] + " or press a key...";
        return;
      }
      setWaitingKey(keybindFromEvent(e));
      return;
    }

    const target = e.target;
    const typing = target instanceof HTMLElement &&
      (target.isContentEditable ||
       ["INPUT","TEXTAREA","SELECT"].includes(target.tagName));

    if (typing || e.repeat) return;

    for (const [id,key] of Object.entries(cfg.binds)) {
      if (!key || keybindFromEvent(e) !== key) continue;
      e.preventDefault();
      if (developerActions.has(id)) { runDeveloperAction(id); return; }
      if (id === "textFix") { openTextFix(); return; }
      if (id === "linkWidget") { toggleLinkWidget(); return; }
      if (id === "serverESP") { toggleServerESP(); return; }
      cfg.modules[id] = !cfg.modules[id];
      save();
      applyModules();
      notify(moduleInfo[id][0] + ": " + (cfg.modules[id] ? "ON" : "OFF"));
      return;
    }

    if (keybindFromEvent(e) === cfg.guiKey) {
      e.preventDefault();
      toggleMenu();
    }
  },true);

  document.addEventListener("keyup",e => {
    if (!waitingForKey || !modifierCodes.has(e.code)) return;
    if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    setWaitingKey(e.code);
  },true);

  function toggleMenu() {
    menuOpen = !menuOpen;
    gui.classList.toggle("open",menuOpen);
    if (menuOpen) clearInspector();
  }

  function updateClock() {
    const opts = {
      hour:"2-digit",minute:"2-digit",
      hour12:cfg.clock.format === "12h"
    };
    if (cfg.clock.seconds) opts.second = "2-digit";
    clock.textContent = new Date().toLocaleTimeString(undefined,opts);
  }

  let clockDrag = null;
  clock.addEventListener("pointerdown",e => {
    if (!cfg.modules.clock || e.button !== 0) return;
    const r = clock.getBoundingClientRect();
    clockDrag = { x:e.clientX-r.left,y:e.clientY-r.top };
    clock.setPointerCapture(e.pointerId);
  });
  clock.addEventListener("pointermove",e => {
    if (!clockDrag) return;
    clock.style.left = Math.max(0,Math.min(innerWidth-clock.offsetWidth,e.clientX-clockDrag.x)) + "px";
    clock.style.top = Math.max(0,Math.min(innerHeight-clock.offsetHeight,e.clientY-clockDrag.y)) + "px";
  });
  clock.addEventListener("pointerup",() => {
    if (!clockDrag) return;
    cfg.clock.x = parseFloat(clock.style.left)/innerWidth*100;
    cfg.clock.y = parseFloat(clock.style.top)/innerHeight*100;
    clockDrag = null;
    save();
  });
  clock.addEventListener("pointercancel",() => clockDrag = null);

  function applyTheme() {
    root.host.style.setProperty("--a",cfg.accent);
    root.host.style.setProperty("--gradient",cfg.gradient);
    root.host.style.setProperty("--bg",cfg.bg);
    root.host.style.setProperty("--fg",cfg.text);
    root.host.style.setProperty("--bd",cfg.border);
    root.host.style.setProperty("--muted",cfg.muted);
    root.host.style.setProperty("--header-text",cfg.headerText);
    root.host.style.setProperty("--button-bg",cfg.buttonBg);
    root.host.style.setProperty("--button-text",cfg.buttonText);
    root.host.style.setProperty("--button-hover",cfg.buttonHover);
    root.host.style.setProperty("--control-bg",cfg.controlBg);
    root.host.style.setProperty("--switch-off",cfg.switchOff);
    root.host.style.setProperty("--switch-knob",cfg.switchKnob);
    root.host.style.setProperty("--switch-on-knob",cfg.switchOnKnob);
    for (const [key,value] of Object.entries(cfg.syntax)) {
      root.host.style.setProperty(`--syntax-${key}`,value);
    }
    root.host.style.setProperty("--op",cfg.opacity/100);
    root.host.style.setProperty("--scale",cfg.scale/100);

    for (const win of gui.querySelectorAll(".win")) {
      win.style.setProperty("--scale",cfg.scale/100);
      win.style.transform = `scale(${cfg.scale/100})`;
    }
    brand.style.transform = `translateX(-50%) scale(${cfg.scale/100})`;
  }

  // Watch for images added by dynamic websites while replacement is active.
  pageObserver = new MutationObserver(() => {
    if (cfg.modules.imageReplace && cfg.replacementImage) replacePageImages();
    if ([...developerToggles].some(id => cfg.modules[id])) syncDeveloperDom();
  });
  pageObserver.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("resize",() => { if (cfg.modules.devViewportSize) syncDeveloperHud(); });

  applyTheme();
  applyModules();
  updateClock();
  setInterval(updateClock,1000);

  console.log("%c✦ MAGICX-CLIENT V4 LOADED","color:#D5AD00;font-size:16px;font-weight:bold");
})();
