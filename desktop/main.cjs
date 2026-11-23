const { app, BrowserWindow, shell, session, ipcMain, nativeTheme } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
nativeTheme.themeSource = "dark";
let service;
let window;
// 原生回归使用独立 profile 与端口，避开用户窗口。
if (process.env.XIANGMETA_TEST_PROFILE)
  app.setPath("userData", path.resolve(process.env.XIANGMETA_TEST_PROFILE));
// 本地桌面世界首次启动即启用声音。
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      const { createServer } = await import(
        pathToFileURL(path.join(__dirname, "../backend/server.mjs")).href
      );
      const root = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
      const configPath = app.isPackaged
        ? path.join(process.env.PORTABLE_EXECUTABLE_DIR ?? app.getPath("userData"), "local.json")
        : path.join(root, "data/local.json");
      // 固定 origin 保持桌面程序重启后的浏览器存储。
      service = await createServer({
        root,
        webRoot: path.join(__dirname, "../dist"),
        configPath,
        port: Number(process.env.XIANGMETA_TEST_PORT ?? 4319),
      });
      session.defaultSession.setPermissionRequestHandler(
        (webContents, permission, callback, details) =>
          callback(
            new URL(webContents.getURL()).origin === service.url &&
              (permission === "pointerLock" ||
                (permission === "media" && details.mediaTypes?.every((t) => t === "video"))),
          ),
      );
      const createWindow = () => {
        const win = new BrowserWindow({
          show: process.env.XIANGMETA_TEST !== "1",
          width: 1500,
          height: 960,
          minWidth: 900,
          minHeight: 650,
          backgroundColor: "#0b151b",
          title: "XiangMeta",
          titleBarStyle: "hidden",
          titleBarOverlay: { color: "#0e1a20", symbolColor: "#bed4c7", height: 32 },
          autoHideMenuBar: true,
          webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        });
        let modalOpen = false,
          returnAfterEscape = false;
        const modalState = (event, value) => {
          if (event.sender === win.webContents && typeof value === "boolean") modalOpen = value;
        };
        ipcMain.on("xiangmeta:modal-state", modalState);
        win.on("closed", () => ipcMain.removeListener("xiangmeta:modal-state", modalState));
        win.webContents.on("before-input-event", (event, input) => {
          if (input.key !== "Escape") return;
          if (input.type === "keyDown" && (modalOpen || returnAfterEscape)) {
            event.preventDefault();
            if (returnAfterEscape) return; // 按住 Esc 不应解锁刚恢复的世界。
            returnAfterEscape = true;
            win.webContents
              .executeJavaScript("window.dispatchEvent(new Event('xiangmeta:close-panel'))", true)
              .catch(() => {});
          } else if (input.type === "keyUp" && returnAfterEscape) {
            event.preventDefault();
            returnAfterEscape = false;
            // 实体按键释放且退出原生派发后再捕获指针。
            setImmediate(() => {
              if (!win.isDestroyed())
                win.webContents
                  .executeJavaScript(
                    "window.dispatchEvent(new Event('xiangmeta:resume-look'))",
                    true,
                  )
                  .catch(() => {});
            });
          }
        });
        window = win;
        win.on("closed", () => (window = null));
        win.webContents.setWindowOpenHandler(({ url }) => {
          if (url === "https://www.bilibili.com/video/BV1kCTX6uEf7/") shell.openExternal(url);
          return { action: "deny" };
        });
        win.webContents.on("will-navigate", (event, url) => {
          if (new URL(url).origin !== service.url) event.preventDefault();
        });
        win.loadURL(service.url);
      };
      createWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    })
    .catch((error) => {
      require("electron").dialog.showErrorBox("XiangMeta 启动失败", error.message);
      app.quit();
    });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    service?.server.closeAllConnections();
    service?.server.close();
  });
}
