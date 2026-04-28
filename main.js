
const { app, BrowserWindow, ipcMain, screen, shell } = require("electron");
 const path = require("path");
 const fs   = require("fs");
 const os   = require("os");

 let widgetWindow  = null;
 let isWidgetShown = false;
 let fileWatcher   = null;
 let savedPosition = null; // remembers last drag position so widget never snaps back

 const SESSION_FILE = path.join(os.homedir(), "boss_session.txt");
 const isDev = !app.isPackaged;

 // ── Parse session file into user object ──────────────────────────────────────
 function readSessionUser() {
     try {
         const content = fs.readFileSync(SESSION_FILE, "utf8");
         const params  = new URLSearchParams(content);
         return {
             role: params.get("role") || "BOSS",
             id:   params.get("id")   || "",
             name: params.get("name") || "Boss",
         };
     } catch (e) {
         return { role: "BOSS", id: "", name: "Boss" };
     }
 }

 // ── Create widget window ──────────────────────────────────────────────────────

 function createWidget() {
     const display = screen.getPrimaryDisplay();
     const { width, height } = display.workAreaSize;
     const preloadPath = path.join(__dirname, "preload.js");

     console.log("📌 Preload path:", preloadPath);
     console.log("📌 Preload exists:", fs.existsSync(preloadPath));

     widgetWindow = new BrowserWindow({
         width:       400,
         height:      80,
         transparent: true,
         frame:       false,
         alwaysOnTop: true,
         skipTaskbar: false,
         resizable:   true,
         hasShadow:   true,
         focusable:   true,
         show:        false,
         x: savedPosition ? savedPosition.x : width  - 420,
         y: savedPosition ? savedPosition.y : height - 100,
         webPreferences: {
             preload:          preloadPath,
             nodeIntegration:  false,
             contextIsolation: true,
         },
     });

     // ✅ FIXED URL (production + dev)
     const url = isDev
         ? "http://127.0.0.1:5173/"
         : "http://103.6.120.246:8080";

     console.log("📌 Loading URL:", url);

     widgetWindow.loadURL(url).catch(err => {
         console.log("❌ Load failed:", err.message);

         // ✅ fallback retry after 5 sec (production safety)
         setTimeout(() => {
             console.log("🔁 Retrying to load...");
             widgetWindow.loadURL(url);
         }, 5000);
     });

     // ✅ detect load failure
     widgetWindow.webContents.on("did-fail-load", () => {
         console.log("⚠️ Page failed to load, retrying...");
         setTimeout(() => {
             widgetWindow.loadURL(url);
         }, 5000);
     });

     if (isDev) {
         widgetWindow.webContents.openDevTools({ mode: "detach" });
     }

     widgetWindow.on("closed", () => {
         widgetWindow  = null;
         isWidgetShown = false;
     });

     console.log("✅ Widget window created");
 }
// function createWidget() {
//     const display = screen.getPrimaryDisplay();
//     const { width, height } = display.workAreaSize;
//     const preloadPath = path.join(__dirname, "preload.js");
//
//     console.log("📌 Preload path:", preloadPath);
//     console.log("📌 Preload exists:", fs.existsSync(preloadPath));
//
//     widgetWindow = new BrowserWindow({
//         width:       400,
//         height:      80,
//         transparent: true,
//         frame:       false,
//         alwaysOnTop: true,
//         skipTaskbar: false,
//         resizable:   true,
//         hasShadow:   true,
//         focusable:   true,
//         show:        false,
//         // use savedPosition if available, else default bottom-right
//         x: savedPosition ? savedPosition.x : width  - 420,
//         y: savedPosition ? savedPosition.y : height - 100,
//         webPreferences: {
//             preload:          preloadPath,
//             nodeIntegration:  false,
//             contextIsolation: true,
//         },
//     });
//
//     const url = isDev
//     const url = isDev
//         ? "http://127.0.0.1:5173/"
//         : "http://103.6.120.246";
////         ? "http://127.0.0.1:5173/"
////         : `file://${path.join(__dirname, "dist/index.html")}`;
//
//     console.log("📌 Loading URL:", url);
//     widgetWindow.loadURL(url);
//
//     if (isDev) {
//         widgetWindow.webContents.openDevTools({ mode: "detach" });
//     }
//
//     widgetWindow.on("closed", () => {
//         widgetWindow  = null;
//         isWidgetShown = false;
//     });
//
//     console.log("✅ Widget window created");
// }

 // ── Show widget — inject user then show window ────────────────────────────────
 function showWidget() {
     if (!widgetWindow) createWidget();

     const user = readSessionUser();

     // STRICT CHECK — only BOSS
     if (!user || user.role !== "BOSS") {
         console.log("🚫 STRICT BLOCK — role is not BOSS, widget will NOT show");
         try { fs.unlinkSync(SESSION_FILE); } catch(e) {}
         return;
     }

     console.log("👤 Injecting BOSS user into widget:", user);

     const doShow = () => {
         widgetWindow.webContents.executeJavaScript(`
             localStorage.setItem("user", JSON.stringify({
                 role: "${user.role}",
                 id:   "${user.id}",
                 name: "${user.name}"
             }));
             console.log("✅ BOSS user injected into localStorage");
         `).then(() => {

             // restore saved position OR default to bottom-right
             // NEVER force center — that caused the upward-to-downward snap bug
             if (savedPosition) {
                 widgetWindow.setPosition(savedPosition.x, savedPosition.y);
                 console.log("✅ Restored saved position:", savedPosition);
             } else {
                 const display  = screen.getPrimaryDisplay();
                 const { width, height } = display.workAreaSize;
                 const defaultX = width  - 420;
                 const defaultY = height - 100;
                 widgetWindow.setPosition(defaultX, defaultY);
                 savedPosition  = { x: defaultX, y: defaultY };
                 console.log("✅ Default position set:", savedPosition);
             }

             widgetWindow.show();
             widgetWindow.focus();
             widgetWindow.setAlwaysOnTop(true, "screen-saver");
             isWidgetShown = true;
             console.log("✅ Widget shown for BOSS:", user.name);

         }).catch(e => {
             console.log("⚠️ localStorage inject failed:", e.message);
             widgetWindow.show();
             isWidgetShown = true;
         });
     };

     if (!widgetWindow.webContents.isLoading()) {
         doShow();
     } else {
         widgetWindow.webContents.once("did-finish-load", doShow);
     }
 }

 // ── Hide widget — save position first, then hide ──────────────────────────────
 function hideWidget() {
     if (!widgetWindow) return;

     // save position before hiding so next login restores same spot
     const pos = widgetWindow.getPosition();
     savedPosition = { x: pos[0], y: pos[1] };
     console.log("💾 Position saved before hide:", savedPosition);

     widgetWindow.webContents.executeJavaScript(`
         localStorage.removeItem("user");
         console.log("✅ User cleared from Electron localStorage");
     `).catch(() => {});

     widgetWindow.hide();
     isWidgetShown = false;
     console.log("🔒 Widget hidden — no more notifications");
 }

 // ── Watch session file every 2 seconds ───────────────────────────────────────
 function startFileWatcher() {
     console.log(`👀 Watching: ${SESSION_FILE}`);

     // Check immediately on startup
     if (fs.existsSync(SESSION_FILE)) {
         console.log("📄 Session file found on startup — showing widget");
         showWidget();
     } else {
         console.log("📄 No session file — widget stays hidden");
     }

     // Poll every 2 seconds
     fileWatcher = setInterval(() => {
         const fileExists = fs.existsSync(SESSION_FILE);

         if (fileExists && !isWidgetShown) {
             const user = readSessionUser();
             if (!user || user.role !== "BOSS") {
                 console.log("🚫 File exists but role is NOT BOSS — deleting file");
                 try { fs.unlinkSync(SESSION_FILE); } catch(e) {}
                 return;
             }
             console.log("📄 BOSS session confirmed — showing widget");
             showWidget();
         }

         if (!fileExists && isWidgetShown) {
             console.log("📄 Session file deleted — hiding widget");
             hideWidget();
         }
     }, 2000);
 }

 // ── IPC: Resize window — anchor bottom edge so panel grows upward ─────────────
 // FIX 1: removed animation flag (was `true`) — caused jumpy/snapping behavior
 // FIX 2: adjust Y position so the bottom edge stays pinned while height changes
 ipcMain.on("widget-resize", (_, { width, height }) => {
     if (!widgetWindow) return;

     const currentBounds = widgetWindow.getBounds();
     const display = screen.getDisplayNearestPoint({
         x: currentBounds.x,
         y: currentBounds.y,
     });
     const { x: dx, y: dy, width: dw, height: dh } = display.workArea;

     // Pin the bottom edge: newY = (oldY + oldHeight) - newHeight
     const pinnedBottomY = currentBounds.y + currentBounds.height;
     let newY = pinnedBottomY - height;

     // Clamp so window never goes above work area top or below work area bottom
     newY = Math.max(dy, Math.min(newY, dy + dh - height));

     // Clamp X too in case width changed
     const newX = Math.max(dx, Math.min(currentBounds.x, dx + dw - width));

     // FIX 1: no animation flag — setSize(w, h) not setSize(w, h, true)
     widgetWindow.setBounds({ x: newX, y: newY, width, height });

     // Keep savedPosition in sync with the new Y so drag-restore is correct
     savedPosition = { x: newX, y: newY };

     console.log(`📐 Resized to ${width}x${height}, Y pinned at ${newY}`);
 });

 // ── IPC: Move window — strictly clamped inside screen ────────────────────────
 ipcMain.on("widget-move", (_, { x, y }) => {
     if (!widgetWindow) return;

     const winBounds = widgetWindow.getBounds();

     // Get display nearest to where user is dragging
     const display = screen.getDisplayNearestPoint({ x, y });
     const { x: dx, y: dy, width, height } = display.workArea;

     // Hard clamp — widget can never go outside work area
     const clampedX = Math.max(dx, Math.min(x, dx + width  - winBounds.width));
     const clampedY = Math.max(dy, Math.min(y, dy + height - winBounds.height));

     widgetWindow.setPosition(clampedX, clampedY);

     // save every clamped position so showWidget restores it
     savedPosition = { x: clampedX, y: clampedY };
 });

 // ── IPC: Get screen bounds for renderer clamp ─────────────────────────────────
 ipcMain.handle("getScreenBounds", () => {
     const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
     return display.workAreaSize;
 });

 // ── IPC: Get current window position ─────────────────────────────────────────
 ipcMain.handle("get-window-position", () => {
     if (widgetWindow) return widgetWindow.getPosition();
     return [0, 0];
 });

 // ── IPC: Open URL in system browser ──────────────────────────────────────────
 ipcMain.on("open-external", (_, url) => {
     shell.openExternal(url);
 });

 // ── App lifecycle ─────────────────────────────────────────────────────────────
 app.whenReady().then(() => {
     createWidget();
     startFileWatcher();
 });

 // Keep Electron alive in background even when widget is hidden
 app.on("window-all-closed", (e) => {
     e.preventDefault();
 });

 app.on("activate", () => {
     if (!widgetWindow) createWidget();
 });

 app.on("before-quit", () => {
     if (fileWatcher) clearInterval(fileWatcher);
 });