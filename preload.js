const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    isElectron:        true,
    showWidget:        ()       => ipcRenderer.send("show-boss-widget"),
    hideWidget:        ()       => ipcRenderer.send("hide-boss-widget"),
    resizeWindow:      (w, h)   => ipcRenderer.send("widget-resize", { width: w, height: h }),
    moveWindow:        (x, y)   => ipcRenderer.send("widget-move", { x, y }),
    getWindowPosition: ()       => ipcRenderer.invoke("get-window-position"),
    openExternal:      (url)    => ipcRenderer.send("open-external", url),
});