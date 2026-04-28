const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

let widgetWindow = null;

function createWidget() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    widgetWindow = new BrowserWindow({
        width:        370,
        height:       80,
        transparent:  true,
        frame:        false,
        alwaysOnTop:  true,
        skipTaskbar:  true,
        resizable:    false,
        hasShadow:    false,
        x:            width  - 390,
        y:            height - 100,
        webPreferences: {
            nodeIntegration:  true,
            contextIsolation: false,
        },
    });

    widgetWindow.loadURL(
        app.isPackaged
            ? `file://${path.join(__dirname, "../build/index.html")}#/widget`
            : "http://localhost:3000/#/widget"
    );
}

ipcMain.on("show-boss-widget", () => {
    if (!widgetWindow) createWidget();
    else widgetWindow.show();
});

ipcMain.on("hide-boss-widget", () => {
    if (widgetWindow) widgetWindow.hide();
});

ipcMain.on("widget-resize", (_, { width, height }) => {
    if (widgetWindow) widgetWindow.setSize(width, height);
});

app.whenReady().then(createWidget);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});